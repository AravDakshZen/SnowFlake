import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { decryptValue } from '@/lib/encryption';
import { GitHubClient } from '@/lib/github';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const sql = getSql();

    // Get GitHub token if connected
    const gitHubConfig = await sql`
      SELECT gc.encrypted_token
      FROM public.github_configs gc
      JOIN public.projects p ON gc.project_id = p.id
      WHERE p.id = ${projectId}
      AND p.user_id = ${session.user.id}
      LIMIT 1
    `;

    if (gitHubConfig.length === 0) {
      return NextResponse.json(
        { error: 'GitHub not connected' },
        { status: 400 }
      );
    }

    const decryptedToken = decryptValue(gitHubConfig[0].encrypted_token);

    // Use a dummy repo to list all accessible repos
    const github = new GitHubClient(decryptedToken, 'dummy', 'dummy');

    try {
      const repos = await github.listRepos();
      return NextResponse.json({ repos });
    } catch (error) {
      console.error('[v0] Error fetching repos:', error);
      return NextResponse.json(
        { error: 'Failed to fetch repositories' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[v0] GitHub repos route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, repoOwner, repoName, encryptedToken, autoPr = true } = body;

    if (!projectId || !repoOwner || !repoName || !encryptedToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const sql = getSql();

    // Verify project ownership
    const project = await sql`
      SELECT id FROM public.projects
      WHERE id = ${projectId}
      AND user_id = ${session.user.id}
      LIMIT 1
    `;

    if (project.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Save GitHub config
    const result = await sql`
      INSERT INTO public.github_configs (
        project_id,
        user_id,
        repo_owner,
        repo_name,
        default_branch,
        encrypted_token,
        auto_pr
      )
      VALUES (
        ${projectId},
        ${session.user.id},
        ${repoOwner},
        ${repoName},
        'main',
        ${encryptedToken},
        ${autoPr}
      )
      ON CONFLICT (project_id) DO UPDATE
      SET repo_owner = ${repoOwner},
        repo_name = ${repoName},
        encrypted_token = ${encryptedToken},
        auto_pr = ${autoPr}
      RETURNING id
    `;

    await logAudit(
      projectId,
      'repo_connected',
      'github_config',
      result[0].id,
      { repoOwner, repoName, autoPr },
      session.user.id
    );

    return NextResponse.json({ configId: result[0].id });
  } catch (error) {
    console.error('[v0] GitHub config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
