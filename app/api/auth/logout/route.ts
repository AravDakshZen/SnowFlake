import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    // Clear the custom session cookie
    const cookieStore = await cookies();
    cookieStore.delete('session');

    // Also sign out from Supabase if they have an active session
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Supabase signout failed, but we still cleared the session cookie
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
