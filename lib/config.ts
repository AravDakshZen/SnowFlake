// Central app-URL resolver.
//
// The app is deployed at https://snowflakedoitforyou.vercel.app. Several
// flows (GitHub OAuth redirect_uri, Supabase OAuth redirectTo, webhook URLs,
// socket CORS origin) build absolute URLs from NEXT_PUBLIC_APP_URL. If that
// var is missing or accidentally left as http://localhost:3000 in a production
// build, providers reject the redirect with "redirect_uri mismatch" and Google
// sign-in fails. This helper guarantees production always resolves to the
// hosted URL and never to localhost.

export const PRODUCTION_URL = 'https://snowflakedoitforyou.vercel.app'

function looksLikeLocalhost(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(url)
}

/**
 * Resolve the canonical app origin.
 *
 * @param requestOrigin - the Origin/host of the incoming request (fallback for
 *   local dev, where the app may run on a non-default port).
 * @returns the app origin with no trailing slash.
 */
export function resolveAppUrl(requestOrigin?: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const isProd = process.env.NODE_ENV === 'production'

  if (isProd) {
    // In production, never emit a localhost/private URL — providers will
    // reject it. Fall back to the hosted URL when unset or misconfigured.
    if (envUrl && !looksLikeLocalhost(envUrl)) return envUrl.replace(/\/+$/, '')
    return PRODUCTION_URL
  }

  const source = envUrl || requestOrigin || PRODUCTION_URL
  return source.replace(/\/+$/, '')
}

/**
 * Resolve a path against the canonical app origin (origin + '/path').
 */
export function resolveAppPath(path: string, requestOrigin?: string): string {
  const base = resolveAppUrl(requestOrigin)
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}
