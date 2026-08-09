import { getSql } from '@/lib/db';
import { getLLMProvider, type AnalysisResult } from '@/lib/llm';
import { decryptValue } from '@/lib/encryption';
import { GitHubClient } from '@/lib/github';
import { generateCommitMessage } from '@/lib/github/commitMessage';
import { applyUnifiedPatch, looksLikeCode, extractPatchChanges } from '@/lib/apply-patch';
import { sendSlackAlert, sendEmailAlert, sendEscalationAlert } from '@/lib/alerts';
import type { InvestigationJob } from '@/lib/queue';
import { emitToProject } from '@/lib/socket';
import { logAudit } from '@/lib/audit';
import { resolveAppUrl } from '@/lib/config';
import { generatePRBody, type FilePRInput } from '@/lib/github/prBody';
import { generateMultiFileCommitTitle } from '@/lib/github/commitMessage';
import { cleanFiles, type CleanerResult } from '@/lib/engine/cleaner';
import { getSelectedCategories, getCategoryById } from '@/types/event';
import type { FileCleanResult, ModelsUsed } from '@/types/investigation';
import { createPatch } from 'diff';

const APP_URL = resolveAppUrl();

const STACK_FRAME_FILE_RE = /\(?(.+?\.(?:ts|tsx|js|jsx|mjs|cjs|py|rb|go|java|php))(?::\d+){0,2}\)?$/;

export function extractFilePathsFromStackTrace(
  stackTrace: string
): string[] {
  if (!stackTrace) return [];

  const filePaths: string[] = [];
  const seen = new Set<string>();

  for (const line of stackTrace.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(' at ')) continue;

    const match = trimmed.match(STACK_FRAME_FILE_RE);
    if (!match) continue;

    let filePath = match[1];
    if (filePath.startsWith('file://')) {
      filePath = filePath.slice('file://'.length);
    }
    if (filePath.startsWith('/')) {
      filePath = filePath.slice(1);
    }
    const segments = filePath.split('/');
    if (segments.length > 1 && segments[0].includes(':')) {
      segments.shift();
    }
    const nodeModulesIndex = segments.indexOf('node_modules');
    if (nodeModulesIndex !== -1) {
      segments.splice(0, nodeModulesIndex + 1);
    }

    const cleanPath = segments.join('/');
    if (!cleanPath || seen.has(cleanPath)) continue;
    seen.add(cleanPath);
    filePaths.push(cleanPath);
  }

  return filePaths;
}

export async function processInvestigation(job: InvestigationJob): Promise<void> {
  const startTime = Date.now();
  
  if (job.eventId && !job.logId) {
    await processEventAnalysis(job)
    return
  }

  const sql = getSql();

  // Mark the queued investigation as in_progress up-front so the dashboard
  // reflects the full lifecycle (queued -> in_progress -> completed/failed).
  if (job.investigationId) {
    await sql`
      UPDATE public.investigations
      SET status = 'in_progress'
      WHERE id = ${job.investigationId}
    `.catch((error) => console.error('[v0] Failed to mark investigation in_progress:', error));

    emitToProject(job.projectId, 'investigation:progress', {
      investigationId: job.investigationId,
      stage: 'analyzing',
    });
  }

  try {
    // Get log details
    const logs = await sql`
      SELECT
        id,
        stack_trace,
        endpoint,
        method,
        status_code,
        request_body,
        response_body,
        project_id,
        user_id
      FROM public.api_logs
      WHERE id = ${job.logId ?? null}
      LIMIT 1
    `;

    if (logs.length === 0) {
      throw new Error(`Log ${job.logId} not found`);
    }

    const log = logs[0];

    // Get LLM config
    const llmConfig = await sql`
      SELECT provider, model, encrypted_key, base_url
      FROM public.llm_configs
      WHERE project_id = ${log.project_id}
      ORDER BY is_default DESC, created_at ASC
      LIMIT 1
    `;

    if (llmConfig.length === 0) {
      throw new Error(`No LLM configured for project ${log.project_id}`);
    }

    const config = llmConfig[0];
    const decryptedKey = decryptValue(config.encrypted_key);

    // Get GitHub config
    const gitHubConfig = await sql`
      SELECT repo_owner, repo_name, default_branch, encrypted_token, auto_pr
      FROM public.github_configs
      WHERE project_id = ${log.project_id}
      LIMIT 1
    `;

    // Fetch files from GitHub if available
    let sourceFiles: Record<string, string> = {};
    if (gitHubConfig.length > 0) {
      const ghConfig = gitHubConfig[0];
      const token = decryptValue(ghConfig.encrypted_token);
      const github = new GitHubClient(token, ghConfig.repo_owner, ghConfig.repo_name);

      try {
        const filesToFetch = extractFilePathsFromStackTrace(log.stack_trace);
        const seen = new Set<string>();

        for (const filePath of [...filesToFetch, 'package.json']) {
          if (seen.has(filePath)) continue;
          seen.add(filePath);
          try {
            const file = await github.getFile(filePath, ghConfig.default_branch);
            sourceFiles[file.path] = file.content;
          } catch {
            // File not found, skip
          }
        }
      } catch (error) {
        console.error('[v0] Error fetching source files:', error);
      }
    }

    // Get previous attempts if this is a re-investigation
    let previousAttempts: string[] = [];
    if (job.parentInvestigationId) {
      const attempts = await sql`
        SELECT patch_diff, explanation
        FROM public.investigations
        WHERE id = ${job.parentInvestigationId}
        ORDER BY attempt ASC
      `;

      previousAttempts = attempts.map(
        (a) => `Previous attempt:\n${a.explanation}\n\nPatch:\n${a.patch_diff}`
      );
    }

    // Run LLM analysis
    const provider = await getLLMProvider(
      config.provider,
      decryptedKey,
      config.model,
      config.base_url
    );

    const analysis = await provider.analyze(
      log.stack_trace,
      sourceFiles,
      previousAttempts.length > 0 ? previousAttempts : undefined
    );

    // Create or update the investigation record
    let investigationId = job.investigationId;

    if (investigationId) {
      await sql`
        UPDATE public.investigations
        SET
          question = ${log.endpoint},
          root_cause = ${analysis.rootCause},
          affected_file = ${analysis.affectedFile},
          affected_line = ${analysis.affectedLine},
          patch_diff = ${analysis.patchDiff},
          confidence = ${analysis.confidence},
          fix_strategy = ${analysis.fixStrategy},
          explanation = ${analysis.explanation},
          status = 'completed',
          attempt = ${(job.attempt || 1)},
          models_used = ${JSON.stringify({
            pass1: { provider: config.provider, model: config.model, tokensUsed: 0, latencyMs: 0 },
            pass2: { provider: config.provider, model: config.model, tokensUsed: 0, latencyMs: 0 },
            pass3: { provider: config.provider, model: config.model, tokensUsed: 0, latencyMs: 0 },
            pass4: { provider: config.provider, model: config.model, tokensUsed: 0, latencyMs: 0 }
          })},
          resolved_at = NOW()
        WHERE id = ${investigationId}
      `;
    } else {
      const investigation = await sql`
        INSERT INTO public.investigations (
          project_id,
          user_id,
          log_id,
          cluster_id,
          parent_investigation_id,
          question,
          root_cause,
          affected_file,
          affected_line,
          patch_diff,
          confidence,
          fix_strategy,
          explanation,
          status,
          attempt,
          models_used
        )
        VALUES (
          ${log.project_id},
          ${log.user_id},
          ${job.logId ?? null},
          ${job.clusterId ?? null},
          ${job.parentInvestigationId || null},
          ${log.endpoint},
          ${analysis.rootCause},
          ${analysis.affectedFile},
          ${analysis.affectedLine},
          ${analysis.patchDiff},
          ${analysis.confidence},
          ${analysis.fixStrategy},
          ${analysis.explanation},
          'completed',
          ${(job.attempt || 1)},
          ${JSON.stringify({
            pass1: { provider: config.provider, model: config.model, tokensUsed: 0, latencyMs: 0 },
            pass2: { provider: config.provider, model: config.model, tokensUsed: 0, latencyMs: 0 },
            pass3: { provider: config.provider, model: config.model, tokensUsed: 0, latencyMs: 0 },
            pass4: { provider: config.provider, model: config.model, tokensUsed: 0, latencyMs: 0 }
          })}
        )
        RETURNING id
      `;
      investigationId = investigation[0].id;
    }

    if (!investigationId) {
      throw new Error('Failed to persist investigation record');
    }

    await logAudit(
      log.project_id,
      'investigation_complete',
      'investigation',
      investigationId,
      {
        rootCause: analysis.rootCause,
        affectedFile: analysis.affectedFile,
        confidence: analysis.confidence,
        attempt: job.attempt || 1,
      },
      log.user_id
    );

    emitToProject(log.project_id, 'investigation:complete', {
      investigationId,
      rootCause: analysis.rootCause,
      affectedFile: analysis.affectedFile,
      confidence: analysis.confidence,
    });

    // Auto-create PR if confidence is high and auto-PR is enabled
    const autoPrEnabled = gitHubConfig.length > 0
      ? (gitHubConfig[0].auto_pr ?? true)
      : false;
    if (analysis.confidence > 80 && gitHubConfig.length > 0 && autoPrEnabled) {
      try {
        const ghConfig = gitHubConfig[0];
        const token = decryptValue(ghConfig.encrypted_token);
        const github = new GitHubClient(token, ghConfig.repo_owner, ghConfig.repo_name);

        const branchName = `snowflake/fix-${investigationId.substring(0, 8)}-${Date.now()}`;
        await github.createBranch(branchName, ghConfig.default_branch);

        // Get current file
        let currentContent = '';
        try {
          const file = await github.getFile(analysis.affectedFile, ghConfig.default_branch);
          currentContent = file.content;
        } catch {
          // File doesn't exist yet
        }

        // Apply real patch when the LLM produced a workable diff; fall back to
        // the suggestedFix snippet only if it actually looks like code.
        const fixedContent = applyUnifiedPatch(currentContent, analysis.patchDiff)
          ?? (looksLikeCode(analysis.suggestedFix) ? currentContent + '\n\n' + analysis.suggestedFix : null);

        if (!fixedContent) {
          throw new Error('No usable patch produced, skipping auto-PR');
        }

        let commitMessage = `fix: auto-patch for ${analysis.rootCause.substring(0, 50)}`;
        try {
          const generated = await generateCommitMessage({
            provider: config.provider,
            apiKey: decryptedKey,
            model: config.model,
            baseUrl: config.base_url ?? undefined,
            context: `Root cause: ${analysis.rootCause}\nAffected file: ${analysis.affectedFile}\nExplanation: ${analysis.explanation}`,
          });
          if (generated.trim()) commitMessage = generated.trim();
        } catch (error) {
          console.error('[v0] Commit message generation failed, using fallback:', error);
        }

        await github.commitFile(
          branchName,
          analysis.affectedFile,
          fixedContent,
          commitMessage
        );

        const prBody = generatePRBody({
          investigationId,
          rootCause: analysis.rootCause,
          confidence: analysis.confidence,
          fixStrategy: analysis.fixStrategy,
          explanation: analysis.explanation,
          fileResults: [{
            filePath: analysis.affectedFile,
            patchDiff: analysis.patchDiff,
            issuesFixed: 1,
            issueReport: {
              totalFound: 1,
              totalFixed: 1,
              byCategory: { critical_errors: 1 }
            },
            issues: [{
              severity: 'critical',
              category: 'critical_errors',
              line: analysis.affectedLine,
              description: analysis.rootCause.substring(0, 100),
              before: analysis.patchDiff.split('\n').filter(l => l.startsWith('-')).slice(0, 5).join('\n'),
              after: analysis.patchDiff.split('\n').filter(l => l.startsWith('+')).slice(0, 5).join('\n'),
              reason: analysis.explanation,
            }],
          }],
          totalIssuesFixed: 1,
          passesRun: 4,
          provider: config.provider,
          modelName: config.model,
          durationMs: Date.now() - startTime,
          defaultBranch: ghConfig.default_branch,
        });

        const pr = await github.createPullRequest(
          branchName,
          `fix: ${analysis.rootCause.substring(0, 60)}`,
          prBody,
          ghConfig.default_branch
        );

        await github.addPRLabel(pr.number, ['snowflake-auto-fix']);

        // Update investigation with PR
        await sql`
          UPDATE public.investigations
          SET pr_url = ${pr.url}, pr_number = ${pr.number}
          WHERE id = ${investigationId}
        `;

        console.log(`[v0] PR created: ${pr.url}`);

        await logAudit(
          log.project_id,
          'pr_created',
          'investigation',
          investigationId,
          { prUrl: pr.url, prNumber: pr.number, branchName },
          log.user_id
        );

        emitToProject(log.project_id, 'pr:created', {
          investigationId,
          prUrl: pr.url,
          prNumber: pr.number,
          branchName,
          commitTitle: commitMessage,
        });

        emitToProject(log.project_id, 'ci:watching', {
          investigationId,
          branchName,
          status: 'watching_ci',
        });
      } catch (error) {
        console.error('[v0] Auto-PR creation failed:', error);
      }
    }

    // Send alerts
    const alertConfig = await sql`
      SELECT slack_webhook_url, email_address, alert_on
      FROM public.alert_configs
      WHERE project_id = ${log.project_id}
      LIMIT 1
    `;

    if (alertConfig.length > 0) {
      const config = alertConfig[0];
      const dashboardUrl = `${APP_URL}/investigations/${investigationId}`;
      const payload = {
        rootCause: analysis.rootCause,
        affectedFile: analysis.affectedFile,
        confidence: analysis.confidence,
        investigationId,
        dashboardUrl,
        prUrl: undefined,
      };

      if (config.slack_webhook_url) {
        await sendSlackAlert(config.slack_webhook_url, payload);
      }

      if (config.email_address) {
        await sendEmailAlert(config.email_address, payload);
      }
    }

    console.log(`[v0] Investigation ${investigationId} completed`);
  } catch (error) {
    console.error('[v0] Investigation processing error:', error);

    // Mark the investigation as failed so the lifecycle is complete
    if (job.investigationId) {
      await sql`
        UPDATE public.investigations
        SET status = 'failed'
        WHERE id = ${job.investigationId}
      `.catch((updateError) => console.error('[v0] Failed to mark investigation failed:', updateError));

      emitToProject(job.projectId, 'investigation:complete', {
        investigationId: job.investigationId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await logAudit(
        job.projectId,
        'reinvestigation_triggered',
        'investigation',
        job.investigationId,
        { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' },
        undefined
      );
    }

    // On fatal error, escalate alert
    try {
      const alertConfig = await sql`
        SELECT slack_webhook_url, email_address
        FROM public.alert_configs
        WHERE project_id = ${job.projectId}
        LIMIT 1
      `;

      if (alertConfig.length > 0) {
        const config = alertConfig[0];
        const dashboardUrl = `${APP_URL}/investigations`;

        await sendEscalationAlert(
          config.slack_webhook_url,
          config.email_address,
          job.logId ?? 'unknown',
          error instanceof Error ? error.message : 'Unknown error',
          dashboardUrl
        );
      }
    } catch (alertError) {
      console.error('[v0] Failed to send escalation alert:', alertError);
    }

    throw error;
  }
}

interface LLMConfigRow {
  provider: string;
  model: string;
  encrypted_key: string;
  base_url: string | null;
  is_default: boolean;
}

async function loadLLMConfigs(projectId: string): Promise<LLMConfigRow[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT provider, model, encrypted_key, base_url, is_default
    FROM public.llm_configs
    WHERE project_id = ${projectId}
  `;
  return rows as unknown as LLMConfigRow[];
}

function orderConfigsForModel(
  configs: LLMConfigRow[],
  preferredProvider?: string | null,
  preferredModel?: string | null
): LLMConfigRow[] {
  const score = (c: LLMConfigRow): number => {
    if (preferredProvider && c.provider === preferredProvider) {
      if (preferredModel && c.model === preferredModel) return 0;
      return 1;
    }
    if (c.is_default) return 2;
    return 3;
  };
  return [...configs].sort((a, b) => score(a) - score(b));
}

async function generateEventCommitMessage(
  projectId: string,
  context: string,
  commitProvider?: string | null,
  commitModel?: string | null
): Promise<string> {
  const configs = orderConfigsForModel(
    await loadLLMConfigs(projectId),
    commitProvider,
    commitModel
  );

  for (const config of configs) {
    try {
      const message = await generateCommitMessage({
        provider: config.provider,
        apiKey: decryptValue(config.encrypted_key),
        model: config.model,
        baseUrl: config.base_url ?? undefined,
        context,
      });
      if (message.trim()) return message.trim();
    } catch (error) {
      console.error(`[v0] Commit message generation failed (${config.provider}/${config.model}):`, error);
    }
  }
  throw new Error('All commit message providers failed');
}

export async function processEventAnalysis(job: InvestigationJob): Promise<void> {
  const eventStartTime = Date.now();
  const sql = getSql();
  const projectId = job.projectId;

  try {
    const events = await sql`
      SELECT
        id,
        project_id,
        user_id,
        name,
        repo_owner,
        repo_name,
        default_branch,
        fix_provider,
        fix_model,
        commit_provider,
        commit_model,
        status
      FROM public.automation_events
      WHERE id = ${job.eventId ?? null}
      LIMIT 1
    `;

    if (events.length === 0) {
      throw new Error(`Event ${job.eventId} not found`);
    }

    const event = events[0];

    await sql`
      UPDATE public.automation_events
      SET status = 'analyzing', error = NULL
      WHERE id = ${event.id}
    `;

    emitToProject(projectId, 'event:started', {
      eventId: event.id,
      name: event.name,
      repo: `${event.repo_owner}/${event.repo_name}`,
      message: `Event "${event.name}" started analyzing ${event.repo_owner}/${event.repo_name}`,
    });

    const gitHubConfig = await sql`
      SELECT repo_owner, repo_name, default_branch, encrypted_token, auto_pr
      FROM public.github_configs
      WHERE project_id = ${projectId}
      LIMIT 1
    `;

    if (gitHubConfig.length === 0) {
      throw new Error('No GitHub configuration found for this project');
    }

    const ghConfig = gitHubConfig[0];
    const token = decryptValue(ghConfig.encrypted_token);
    const github = new GitHubClient(token, event.repo_owner, event.repo_name);

    const commit = await github.getLatestCommit(event.default_branch || 'main');

    await sql`
      UPDATE public.automation_events
      SET last_commit_sha = ${commit.sha}, last_run_at = NOW()
      WHERE id = ${event.id}
    `;

    emitToProject(projectId, 'event:progress', {
      eventId: event.id,
      name: event.name,
      stage: 'fetching_commit',
      commitSha: commit.sha,
      message: `Fetched commit ${commit.sha.substring(0, 7)} (${commit.files.length} files changed)`,
    });

    const sourceFiles: Record<string, string> = {};
    const changedPaths = commit.files.map((f) => f.path).filter(Boolean);

    for (const filePath of changedPaths.slice(0, 15)) {
      try {
        const file = await github.getCommitFile(filePath, commit.sha);
        sourceFiles[file.path] = file.content;
      } catch {
        // Skip unreadable files (binary, deleted, submodules)
      }
    }

    const configs = orderConfigsForModel(
      await loadLLMConfigs(projectId),
      event.fix_provider,
      event.fix_model
    );

    if (configs.length === 0) {
      throw new Error('No LLM configured for this project');
    }

    let analysis: AnalysisResult | null = null;
    let usedConfig: LLMConfigRow | null = null;
    let lastError: unknown = null;
    const providerFailures: string[] = [];

    const stackContext = [
      `Repository: ${event.repo_owner}/${event.repo_name}`,
      `Commit: ${commit.sha}`,
      `Message: ${commit.message}`,
      `Author: ${commit.authorName}`,
      '',
      'Changed files:',
      ...changedPaths.map((p) => `- ${p}`),
    ].join('\n');

    for (const config of configs) {
      try {
        emitToProject(projectId, 'event:progress', {
          eventId: event.id,
          name: event.name,
          stage: 'analyzing',
          provider: config.provider,
          model: config.model,
          message: `Analyzing with ${config.provider}/${config.model}`,
        });

        const provider = await getLLMProvider(
          config.provider,
          decryptValue(config.encrypted_key),
          config.model,
          config.base_url ?? undefined
        );
        analysis = await provider.analyze(stackContext, sourceFiles);
        usedConfig = config;
        break;
      } catch (error) {
        lastError = error;
        const failureDetail = error instanceof Error ? error.message : 'Unknown error';
        providerFailures.push(`${config.provider}/${config.model}: ${failureDetail}`);
        console.error(`[v0] Event analysis failed (${config.provider}/${config.model}):`, error);

        const remainingConfigs = configs.filter((c) => c !== config);
        if (remainingConfigs.length > 0) {
          const nextConfig = remainingConfigs[0];
          emitToProject(projectId, 'llm:fallback', {
            eventId: event.id,
            name: event.name,
            fromProvider: config.provider,
            fromModel: config.model,
            provider: nextConfig.provider,
            model: nextConfig.model,
            message: `Falling back to another provider, ${nextConfig.provider} - ${nextConfig.model}`,
          });
        }
      }
    }

    if (!analysis) {
      if (providerFailures.length > 0) {
        throw new Error(
          `All LLM providers failed — ${providerFailures.join('; ')}`
        );
      }
      throw lastError instanceof Error ? lastError : new Error('All LLM providers failed');
    }

    if (!analysis.rootCause || analysis.confidence <= 0) {
      throw new Error(
        `Analysis produced no usable result (root cause empty or confidence 0) — ${
          usedConfig ? `${usedConfig.provider}/${usedConfig.model}` : 'unknown model'
        }`
      );
    }

    const cluster = await sql`
      INSERT INTO public.clusters (
        project_id,
        user_id,
        fingerprint,
        title,
        level,
        status,
        environment
      )
      VALUES (
        ${projectId},
        ${event.user_id},
        ${`event-${event.id}`},
        ${`Event: ${event.name}`},
        'warning',
        'open',
        'production'
      )
      ON CONFLICT (project_id, fingerprint) DO UPDATE
      SET last_seen_at = NOW()
      RETURNING id
    `;

    const investigation = await sql`
      INSERT INTO public.investigations (
        project_id,
        user_id,
        cluster_id,
        event_id,
        question,
        root_cause,
        affected_file,
        affected_line,
        patch_diff,
        confidence,
        fix_strategy,
        explanation,
        status,
        attempt
      )
      VALUES (
        ${projectId},
        ${event.user_id},
        ${cluster[0].id},
        ${event.id},
        ${`Event: ${event.name} — ${commit.message.substring(0, 80)}`},
        ${analysis.rootCause},
        ${analysis.affectedFile},
        ${analysis.affectedLine},
        ${analysis.patchDiff},
        ${analysis.confidence},
        ${analysis.fixStrategy},
        ${analysis.explanation},
        'completed',
        1
      )
      RETURNING id
    `;

    const investigationId = investigation[0].id;

    await sql`
      UPDATE public.automation_events
      SET status = 'completed', error = NULL
      WHERE id = ${event.id}
    `;

    await logAudit(
      projectId,
      'event_analysis_complete',
      'automation_event',
      event.id,
      {
        investigationId,
        rootCause: analysis.rootCause,
        confidence: analysis.confidence,
        usedProvider: usedConfig?.provider,
        usedModel: usedConfig?.model,
      },
      event.user_id
    );

    emitToProject(projectId, 'investigation:complete', {
      investigationId,
      eventId: event.id,
      rootCause: analysis.rootCause,
      affectedFile: analysis.affectedFile,
      confidence: analysis.confidence,
    });

    emitToProject(projectId, 'event:completed', {
      eventId: event.id,
      name: event.name,
      investigationId,
      repo: `${event.repo_owner}/${event.repo_name}`,
      commitSha: commit.sha,
      message: `Event "${event.name}" completed — ${analysis.rootCause}`,
    });

    const autoPrEnabled = ghConfig.auto_pr ?? true;
    if (analysis.confidence > 80 && autoPrEnabled && analysis.affectedFile) {
      try {
        const branchName = `snowflake/fix-${investigationId.substring(0, 8)}-${Date.now()}`;
        await github.createBranch(branchName, event.default_branch || ghConfig.default_branch);

        let currentContent = '';
        try {
          const file = await github.getFile(analysis.affectedFile, event.default_branch || ghConfig.default_branch);
          currentContent = file.content;
        } catch {
          // File doesn't exist yet
        }

        const fixedContent = applyUnifiedPatch(currentContent, analysis.patchDiff)
          ?? (looksLikeCode(analysis.suggestedFix) ? currentContent + '\n\n' + analysis.suggestedFix : null);

        if (!fixedContent) {
          throw new Error('No usable patch produced, skipping auto-PR');
        }

        let commitMessage = `fix: auto-patch for ${analysis.rootCause.substring(0, 50)}`;
        try {
          commitMessage = await generateEventCommitMessage(
            projectId,
            `Root cause: ${analysis.rootCause}\nAffected file: ${analysis.affectedFile}\nExplanation: ${analysis.explanation}`,
            event.commit_provider,
            event.commit_model
          );
        } catch (error) {
          console.error('[v0] Commit message generation failed, using fallback:', error);
        }

        await github.commitFile(branchName, analysis.affectedFile, fixedContent, commitMessage);

        const prBody = generatePRBody({
          investigationId,
          rootCause: analysis.rootCause,
          confidence: analysis.confidence,
          fixStrategy: analysis.fixStrategy,
          explanation: analysis.explanation,
          fileResults: [{
            filePath: analysis.affectedFile,
            patchDiff: analysis.patchDiff,
            issuesFixed: 1,
            issueReport: {
              totalFound: 1,
              totalFixed: 1,
              byCategory: { critical_errors: 1 }
            },
            issues: [{
              severity: 'critical',
              category: 'critical_errors',
              line: analysis.affectedLine,
              description: analysis.rootCause.substring(0, 100),
              before: analysis.patchDiff.split('\n').filter(l => l.startsWith('-')).slice(0, 5).join('\n'),
              after: analysis.patchDiff.split('\n').filter(l => l.startsWith('+')).slice(0, 5).join('\n'),
              reason: analysis.explanation,
            }],
          }],
          totalIssuesFixed: 1,
          passesRun: 4,
          provider: usedConfig?.provider || event.fix_provider,
          modelName: usedConfig?.model || event.fix_model,
          durationMs: Date.now() - eventStartTime,
          defaultBranch: event.default_branch || ghConfig.default_branch,
        });

        const pr = await github.createPullRequest(
          branchName,
          `fix: ${analysis.rootCause.substring(0, 60)}`,
          prBody,
          event.default_branch || ghConfig.default_branch
        );

        await github.addPRLabel(pr.number, ['snowflake-auto-fix']);

        await sql`
          UPDATE public.investigations
          SET pr_url = ${pr.url}, pr_number = ${pr.number}
          WHERE id = ${investigationId}
        `;

        emitToProject(projectId, 'pr:created', {
          investigationId,
          prUrl: pr.url,
          prNumber: pr.number,
          branchName,
        });
      } catch (error) {
        console.error('[v0] Event auto-PR creation failed:', error);
      }
    }
  } catch (error) {
    console.error('[v0] Event analysis processing error:', error);

    if (job.eventId) {
      const failureMessage = error instanceof Error ? error.message : 'Unknown error';

      await sql`
        UPDATE public.automation_events
        SET status = 'failed', error = ${failureMessage}
        WHERE id = ${job.eventId}
      `.catch((updateError) => console.error('[v0] Failed to mark event failed:', updateError));

      // Record a failed investigation so the failure is visible under the FAILED filter
      const failedEvent = await sql`
        SELECT user_id, name FROM public.automation_events
        WHERE id = ${job.eventId}
        LIMIT 1
      `.catch(() => []);
      const failedRecord = failedEvent[0];
      if (failedRecord) {
        const failedCluster = await sql`
          INSERT INTO public.clusters (
            project_id, user_id, fingerprint, title, level, status, environment
          )
          VALUES (
            ${projectId}, ${failedRecord.user_id},
            ${`event-${job.eventId}`}, ${`Event: ${failedRecord.name}`},
            'warning', 'open', 'production'
          )
          ON CONFLICT (project_id, fingerprint) DO UPDATE
          SET last_seen_at = NOW()
          RETURNING id
        `.catch(() => []);
        const failedClusterId = failedCluster[0]?.id ?? null;
        await sql`
          INSERT INTO public.investigations (
            project_id, user_id, cluster_id, event_id, question, root_cause,
            affected_file, affected_line, confidence, fix_strategy, explanation, status, attempt
          )
          VALUES (
            ${projectId}, ${failedRecord.user_id}, ${failedClusterId}, ${job.eventId},
            ${`Event: ${failedRecord.name}`},
            ${failureMessage}, 'unknown', 0, 0, 'refactor',
            ${failureMessage}, 'failed', 1
          )
        `.catch((insertError) => console.error('[v0] Failed to record failed investigation:', insertError));
      }

      emitToProject(projectId, 'event:failed', {
        eventId: job.eventId,
        error: failureMessage,
      });
    }
  }
}
