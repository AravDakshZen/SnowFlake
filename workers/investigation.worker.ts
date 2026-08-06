import { getSql } from '@/lib/db';
import { getLLMProvider } from '@/lib/llm';
import { decryptValue } from '@/lib/encryption';
import { GitHubClient } from '@/lib/github';
import { sendSlackAlert, sendEmailAlert, sendEscalationAlert } from '@/lib/alerts';
import type { InvestigationJob } from '@/lib/queue';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function processInvestigation(job: InvestigationJob): Promise<void> {
  const sql = getSql();

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
      WHERE id = ${job.logId}
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
      LIMIT 1
    `;

    if (llmConfig.length === 0) {
      throw new Error(`No LLM configured for project ${log.project_id}`);
    }

    const config = llmConfig[0];
    const decryptedKey = decryptValue(config.encrypted_key);

    // Get GitHub config
    const gitHubConfig = await sql`
      SELECT repo_owner, repo_name, default_branch, encrypted_token
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
        // Try to fetch the most relevant files
        const filesToFetch = [
          'package.json',
          'src/index.ts',
          'src/api.ts',
          'lib/main.ts',
        ];

        for (const filePath of filesToFetch) {
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

    // Create investigation record
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
        attempt
      )
      VALUES (
        ${log.project_id},
        ${log.user_id},
        ${job.logId},
        ${job.clusterId},
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
        ${(job.attempt || 1)}
      )
      RETURNING id
    `;

    const investigationId = investigation[0].id;

    // Auto-create PR if confidence is high
    if (analysis.confidence > 80 && gitHubConfig.length > 0) {
      try {
        const ghConfig = gitHubConfig[0];
        const token = decryptValue(ghConfig.encrypted_token);
        const github = new GitHubClient(token, ghConfig.repo_owner, ghConfig.repo_name);

        const branchName = `tracewise/fix-${investigationId.substring(0, 8)}-${Date.now()}`;
        await github.createBranch(branchName, ghConfig.default_branch);

        // Get current file
        let currentContent = '';
        try {
          const file = await github.getFile(analysis.affectedFile, ghConfig.default_branch);
          currentContent = file.content;
        } catch {
          // File doesn't exist yet
        }

        // Apply fix
        const fixedContent = currentContent + '\n\n' + analysis.suggestedFix;

        await github.commitFile(
          branchName,
          analysis.affectedFile,
          fixedContent,
          `fix: auto-patch for ${analysis.rootCause.substring(0, 50)}\n\nGenerated by Tracewise (Investigation: ${investigationId})`
        );

        // Create PR
        const prBody = `## Tracewise Auto-Fix Report

### Root Cause
${analysis.rootCause}

### Affected File & Line
\`${analysis.affectedFile}:${analysis.affectedLine}\`

### Fix Strategy
${analysis.fixStrategy}

### Explanation
${analysis.explanation}

### Confidence Score
${analysis.confidence}%

### Investigation ID
\`${investigationId}\`

---
Generated by [Tracewise](${APP_URL})`;

        const pr = await github.createPullRequest(
          branchName,
          `fix: ${analysis.rootCause.substring(0, 60)}`,
          prBody,
          ghConfig.default_branch
        );

        await github.addPRLabel(pr.number, ['tracewise-auto-fix']);

        // Update investigation with PR
        await sql`
          UPDATE public.investigations
          SET pr_url = ${pr.url}, pr_number = ${pr.number}
          WHERE id = ${investigationId}
        `;

        console.log(`[v0] PR created: ${pr.url}`);
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
          job.logId,
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
