import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { listUserReviews } from '@/lib/storage/user-review-store';

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            'Supabase is not configured. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to access private user reviews.',
        },
        { status: 503 }
      );
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to view your reviews.' },
        { status: 401 }
      );
    }

    const reviews = await listUserReviews(user.id);
    return NextResponse.json(reviews);
  } catch (error) {
    console.error('List reviews error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to list reviews' }, { status: 500 });
  }
}
