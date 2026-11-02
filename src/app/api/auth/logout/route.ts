import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export async function POST() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true });
    }

    const supabase = await createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }

    return NextResponse.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
