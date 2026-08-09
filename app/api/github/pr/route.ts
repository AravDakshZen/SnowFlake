import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { decryptValue } from '@/lib/encryption';
import { GitHubClient } from '@/lib/github';
import { logAudit } from '@/lib/audit';
import { createPatch } from 'diff';
import { generatePRBody, type FilePRInput } from '@/lib/github/prBody';
import { generateMultiFileCommitTitle } from '@/lib/github/commitMessage';
import type { FileCleanResult, IssueReport } from '@/types/investigation';

interface InvestigationRow {
  id: string;
  root_cause: string | null;
  affected_file: string | null;
  patch_diff: string | null;
  confidence: number | null;
  explanation: string | null;
  fix_strategy: string | null;
  file_results: string | null;
  models_used: string | null;
  category_ids: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { investigationId, projectId } = body;

    if (!investigationId || !projectId) {
      return NextResponse.json(
        { error: 'investigationId and projectId are required' },
        { status: 400 }
      );
    }

    const sql = getSql();

    const projectAndGitHub = await sql`
      SELECT
        p.id,
        gc.repo_owner,
        gc.repo_name,
        gc.default_branch,
        gc.encrypted_token
      FROM public.projects p
      LEFT JOIN public.github_configs gc ON p.id = gc.project_id
      WHERE p.id = ${projectId}
      AND p.user_id = ${session.user.id}
      LIMIT 1
    `;

    if (projectAndGitHub.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const project = projectAndGitHub[0];
    if (!project.repo_owner || !project.repo_name || !project.encrypted_token) {
      return NextResponse.json(
        { error: 'GitHub not connected to this project' },
        { status: 400 }
      );
    }

    const investigation = await sql`
      SELECT
        id,
        root_cause,
        affected_file,
        patch_diff,
        confidence,
        explanation,
        fix_strategy,
        file_results,
        models_used,
        category_ids
      FROM public.investigations
      WHERE id = ${investigationId}
      AND user_id = ${session.user.id}
      LIMIT 1
    `;

    if (investigation.length === 0) {
      return NextResponse.json({ error: 'Investigation not found' }, { status: 404 });
    }

    const inv = investigation[0] as InvestigationRow;
    const decryptedToken = decryptValue(project.encrypted_token);
    const github = new GitHubClient(
      decryptedToken,
      project.repo_owner,
      project.repo_name
    );

    try {
      const branchName = `snowflake/fix-${inv.id.substring(0, 8)}-${Date.now()}`;
      await github.createBranch(branchName, project.default_branch);

      let fileResults: FileCleanResult[] = [];

      if (inv.file_results) {
        try {
          fileResults = JSON.parse(inv.file_results) as FileCleanResult[];
        } catch {
          console.log('[v0] Could not parse file_results, falling back to single file');
        }
      }

      if (fileResults.length === 0 && inv.affected_file) {
        let originalContent = '';
        let originalSHA = '';
        try {
          const fileWithSHA = await github.getFileWithSHA(inv.affected_file, project.default_branch);
          originalContent = fileWithSHA.content;
          originalSHA = fileWithSHA.sha;
        } catch (error) {
          console.log(`[v0] Could not fetch file ${inv.affected_file}, will create new`);
        }

        fileResults = [{
          filePath: inv.affected_file,
          originalContent,
          cleanedContent: originalContent,
          patchDiff: inv.patch_diff || '',
          originalSHA,
          issueReport: {
            totalFound: 1,
            totalFixed: 1,
            byCategory: { critical: 1 }
          },
          issues: [{
            severity: 'critical',
            category: 'crash',
            line: 0,
            description: inv.root_cause || 'Unknown issue',
            before: '',
            after: '',
            reason: inv.explanation || ''
          }],
          linesChanged: 0,
          issuesFixed: 1
        }];
      }

      const committedFiles: Array<{ filePath: string; patchDiff: string }> = [];

      for (const result of fileResults) {
        if (!result.originalSHA) {
          let fileWithSHA;
          try {
            fileWithSHA = await github.getFileWithSHA(result.filePath, project.default_branch);
            result.originalContent = fileWithSHA.content;
            result.originalSHA = fileWithSHA.sha;
          } catch {
            console.log(`[v0] Could not fetch SHA for ${result.filePath}, skipping`);
            continue;
          }
        }

        let fixedContent = result.cleanedContent;
        if (!fixedContent || fixedContent === result.originalContent) {
          if (result.patchDiff && result.patchDiff.includes('@@')) {
            const { applyUnifiedPatch } = await import('@/lib/apply-patch');
            fixedContent = applyUnifiedPatch(result.originalContent, result.patchDiff) || result.originalContent;
          } else {
            fixedContent = result.originalContent;
          }
        }

        if (fixedContent === result.originalContent) {
          console.log(`[v0] No changes for ${result.filePath}, skipping`);
          continue;
        }

        const patchDiff = createPatch(
          result.filePath,
          result.originalContent,
          fixedContent
        );

        result.patchDiff = patchDiff;

        await github.commitFile(
          branchName,
          result.filePath,
          fixedContent,
          `fix: auto-patch ${result.filePath.split('/').pop()}\n\nGenerated by Snowflake`
        );

        committedFiles.push({
          filePath: result.filePath,
          patchDiff
        });
      }

      if (committedFiles.length === 0) {
        return NextResponse.json(
          { error: 'No files were modified' },
          { status: 422 }
        );
      }

      const commitTitle = generateMultiFileCommitTitle(
        committedFiles.map(f => f.filePath),
        inv.root_cause || 'issues'
      );

      const allIssues = fileResults.flatMap(r => r.issues);
      const totalIssuesFixed = allIssues.length;

      const filePRInputs: FilePRInput[] = fileResults.map(result => ({
        filePath: result.filePath,
        patchDiff: result.patchDiff,
        issuesFixed: result.issuesFixed,
        issueReport: result.issueReport,
        issues: result.issues
      }));

      const prBody = generatePRBody({
        investigationId: inv.id,
        rootCause: inv.root_cause || 'Unknown issue',
        confidence: inv.confidence || 0,
        fixStrategy: inv.fix_strategy || 'refactor',
        explanation: inv.explanation || '',
        totalIssuesFixed,
        fileResults: filePRInputs,
        defaultBranch: project.default_branch,
      });

      const pr = await github.createPullRequest(
        branchName,
        commitTitle,
        prBody,
        project.default_branch
      );

      await github.addPRLabel(pr.number, ['snowflake-auto-fix']);

      await sql`
        UPDATE public.investigations
        SET pr_url = ${pr.url}, pr_number = ${pr.number}, patch_diff = ${committedFiles[0]?.patchDiff || inv.patch_diff}
        WHERE id = ${investigationId}
      `;

      await logAudit(
        projectId,
        'pr_created',
        'investigation',
        investigationId,
        {
          prUrl: pr.url,
          prNumber: pr.number,
          branchName,
          filesChanged: committedFiles.length,
          commitTitle
        },
        session.user.id
      );

      return NextResponse.json({
        prUrl: pr.url,
        prNumber: pr.number,
        branchName,
        filesChanged: committedFiles.length,
        commitTitle,
      });
    } catch (error) {
      console.error('[v0] GitHub PR creation error:', error);
      return NextResponse.json(
        {
          error: 'Failed to create pull request',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[v0] GitHub PR route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
