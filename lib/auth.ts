import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// Returns the signed-in user or null. Tries the fast custom `session` cookie
// first (set by setSession), then falls back to the Supabase session so users
// who signed in through client-side flows (e.g. /login) are still recognized.
export async function getSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (sessionCookie?.value) {
      // In production, validate and decode the session JWT
      // For now, this is a placeholder that assumes the session is valid
      const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64url').toString('utf8'));
      if (sessionData?.user?.id) return sessionData;
    }
  } catch (error) {
    console.error('[v0] Error reading session:', error);
  }

  // Fallback: derive the user from the Supabase auth session so the dashboard
  // and API routes keep working even if the custom session cookie is missing.
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return null;

    return {
      user: {
        id: user.id,
        email: user.email ?? undefined,
        name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0],
        ...(user.user_metadata?.avatar_url ? { avatarUrl: user.user_metadata.avatar_url } : {}),
      },
    };
  } catch (error) {
    console.error('[v0] Error reading Supabase session:', error);
    return null;
  }
}

export async function setSession(userId: string, userData: any) {
  const cookieStore = await cookies();
  const sessionData = {
    user: {
      id: userId,
      ...userData,
    },
  };

  cookieStore.set('session', Buffer.from(JSON.stringify(sessionData)).toString('base64url'), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}
