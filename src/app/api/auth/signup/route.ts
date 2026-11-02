import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { readBoundedBody } from '@/lib/http/read-bounded-body';

const MAX_AUTH_BODY_BYTES = 16_384;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            'Supabase authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.',
        },
        { status: 503 }
      );
    }

    const bodyBytes = await readBoundedBody(request, MAX_AUTH_BODY_BYTES);
    if (bodyBytes === null) {
      return NextResponse.json({ error: 'Signup request is too large.' }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bodyBytes));
    } catch {
      return NextResponse.json({ error: 'Request body contains invalid JSON.' }, { status: 400 });
    }
    if (!isRecord(body)) {
      return NextResponse.json({ error: 'Request body must be an object.' }, { status: 400 });
    }
    const { email, password } = body;

    if (
      typeof email !== 'string' ||
      !email.trim().includes('@') ||
      email.length > 320
    ) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    if (
      typeof password !== 'string' ||
      password.length < 6 ||
      password.length > 1_024
    ) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Authentication service unavailable.' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Unable to create the account. Check the email and password requirements and try again.' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      message: 'Account created successfully.',
    });
  } catch (error) {
    console.error('Signup request failed:', error instanceof Error ? error.name : 'Unknown error');
    return NextResponse.json({ error: 'Registration could not be completed. Please try again.' }, { status: 500 });
  }
}
