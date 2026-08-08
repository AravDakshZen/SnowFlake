import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { decryptValue } from '@/lib/encryption';
import { GitHubClient } from '@/lib/github';

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
    const github = new GitHubClient(decryptedToken, 'dummy', 'dummy');

    try {
      const profile = await github.getProfile();
      return NextResponse.json({ profile });
    } catch (error) {
      console.error('[v0] Error fetching GitHub profile:', error);
      return NextResponse.json(
        { error: 'Failed to fetch GitHub profile' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[v0] GitHub profile route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
