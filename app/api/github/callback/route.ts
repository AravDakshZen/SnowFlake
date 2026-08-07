import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSql } from '@/lib/db'
import { encryptValue } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  const session = await getSession()
  const code = request.nextUrl.searchParams.get('code')
  const projectId = request.nextUrl.searchParams.get('state')
  const error = request.nextUrl.searchParams.get('error')

  if (error) return NextResponse.redirect(new URL('/settings?github=cancelled', request.url))
  if (!session?.user?.id || !code || !projectId) return NextResponse.redirect(new URL('/settings?github=invalid', request.url))

  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) return NextResponse.redirect(new URL('/settings?github=not_configured', request.url))

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/github/callback`
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
    })
    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error(tokenData.error_description || 'GitHub token exchange failed')

    const sql = getSql()
    const project = await sql`SELECT id FROM public.projects WHERE id = ${projectId} AND user_id = ${session.user.id} LIMIT 1`
    if (!project.length) return NextResponse.redirect(new URL('/settings?github=not_found', request.url))

    const encryptedToken = encryptValue(tokenData.access_token)
    await sql`
      INSERT INTO public.github_configs (project_id, user_id, repo_owner, repo_name, default_branch, encrypted_token)
      VALUES (${projectId}, ${session.user.id}, '', '', 'main', ${encryptedToken})
      ON CONFLICT (project_id) DO UPDATE SET encrypted_token = ${encryptedToken}
    `
    return NextResponse.redirect(new URL('/settings?github=connected', request.url))
  } catch (cause) {
    console.error('[v0] GitHub OAuth callback failed', cause)
    return NextResponse.redirect(new URL('/settings?github=failed', request.url))
  }
}
