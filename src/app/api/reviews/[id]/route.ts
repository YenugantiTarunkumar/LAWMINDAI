import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { loadUserReview } from '@/lib/storage/user-review-store';
import { isValidReviewId } from '@/lib/storage/review-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isValidReviewId(id)) {
      return NextResponse.json(
        { error: 'Invalid review ID format. Traversal or invalid characters rejected.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase is not configured.' },
        { status: 503 }
      );
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to access saved reviews.' },
        { status: 401 }
      );
    }

    const review = await loadUserReview(user.id, id);

    if (!review) {
      // Return 404 to prevent ID enumeration/probing across accounts
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error('Load review error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to load review' }, { status: 500 });
  }
}
