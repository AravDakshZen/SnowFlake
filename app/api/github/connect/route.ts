import { NextRequest, NextResponse } from 'next/server'
import { resolveAppPath } from '@/lib/config'

// redirect_uri must EXACTLY match the GitHub OAuth App "Authorization callback
// URL" (github.com/settings/developers) or GitHub errors with
// "redirect_uri is not associated with this application". NEXT_PUBLIC_GITHUB_REDIRECT_URI overrides the default.
export function getGitHubRedirectUri(origin: string): string {
  const explicit = process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI
  if (explicit) return explicit
  return resolveAppPath('/api/github/callback', origin)
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.redirect(new URL('/settings?github=invalid', request.url))
  }

  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(new URL('/settings?github=not_configured', request.url))
  }

  const redirectUri = getGitHubRedirectUri(request.nextUrl.origin)
  const scope = 'repo write:repo_hook admin:repo_hook'

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize')
  githubAuthUrl.searchParams.set('client_id', clientId)
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri)
  githubAuthUrl.searchParams.set('scope', scope)
  githubAuthUrl.searchParams.set('state', projectId)

  return NextResponse.redirect(githubAuthUrl.toString())
}
