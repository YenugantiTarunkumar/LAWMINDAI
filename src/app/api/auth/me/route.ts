import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export async function GET() {
  const configured = isSupabaseConfigured();
  if (!configured) {
    return NextResponse.json({
      user: null,
      isConfigured: false,
    });
  }

  const user = await getSessionUser();
  return NextResponse.json({
    user: user ? { id: user.id, email: user.email } : null,
    isConfigured: true,
  });
}
