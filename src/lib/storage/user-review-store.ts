import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { isValidReviewId } from './review-store';
import type { StoredReview } from '@/lib/types';
import type { ReviewMetadata } from './types';

/**
 * Save an authenticated user's review into Supabase with user ownership and RLS.
 */
export async function saveUserReview(
  userId: string,
  review: StoredReview
): Promise<{ success: boolean; error?: string }> {
  if (!isValidReviewId(review.id)) {
    return { success: false, error: 'Invalid review ID format' };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase database is not configured.' };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: 'Unable to initialize Supabase client.' };
  }

  const { error } = await supabase.from('reviews').insert({
    id: review.id,
    user_id: userId,
    created_at: review.timestamp || new Date().toISOString(),
    mode: review.mode,
    input_file_name: review.inputFileName || null,
    original_content: review.originalContent,
    result: review.result,
    overall_risk_level: review.result.overallRiskLevel,
    executive_summary: review.result.executiveSummary,
    drafting_quality_score: review.result.draftingQualityScore,
  });

  if (error) {
    console.error('Save user review failed:', error.code ?? 'Unknown database error');
    return { success: false, error: 'Unable to save review. Please try again.' };
  }

  return { success: true };
}

/**
 * Load a review only if it belongs to the authenticated user.
 * Disallows access to other users' reviews.
 */
export async function loadUserReview(
  userId: string,
  reviewId: string
): Promise<StoredReview | null> {
  if (!isValidReviewId(reviewId)) {
    return null;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    timestamp: data.created_at,
    mode: data.mode,
    inputFileName: data.input_file_name || undefined,
    result: data.result,
    originalContent: data.original_content,
  };
}

/**
 * List all saved reviews belonging strictly to the authenticated user.
 */
export async function listUserReviews(userId: string): Promise<ReviewMetadata[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  if (!supabase) {
    throw new Error('Unable to initialize Supabase client.');
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('id, created_at, mode, input_file_name, overall_risk_level, executive_summary')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Unable to load saved reviews.');
  }
  if (!data) {
    throw new Error('Supabase returned no review data.');
  }

  return data.map((row) => ({
    id: row.id,
    timestamp: row.created_at,
    mode: row.mode,
    inputFileName: row.input_file_name || undefined,
    overallRiskLevel: row.overall_risk_level,
    executiveSummary: row.executive_summary,
  }));
}
