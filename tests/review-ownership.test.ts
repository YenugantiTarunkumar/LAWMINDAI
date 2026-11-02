import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('../src/lib/supabase/server', () => ({
  createClient: createClientMock,
}));

vi.mock('../src/lib/supabase/config', () => ({
  isSupabaseConfigured: () => true,
}));

import { loadUserReview } from '../src/lib/storage/user-review-store';

const reviewId = 'review-123';
const storedReview = {
  id: reviewId,
  timestamp: '2026-01-01T00:00:00.000Z',
  mode: 'full-review',
  input_file_name: 'contract.txt',
  original_content: 'A sample contract.',
  result: { overallRiskLevel: 'low' },
};

describe('saved review ownership', () => {
  beforeEach(() => {
    const filters: [string, string][] = [];
    type MockQuery = {
      eq: (column: string, value: string) => MockQuery;
      single: () => Promise<{
        data: typeof storedReview | null;
        error: { message: string } | null;
      }>;
    };
    const query: MockQuery = {
      eq: vi.fn((column: string, value: string): MockQuery => {
        filters.push([column, value]);
        return query;
      }),
      single: vi.fn(async () => {
        const owner = filters.filter(([column]) => column === 'user_id').at(-1)?.[1];
        return owner === 'owner-user'
          ? { data: storedReview, error: null }
          : { data: null, error: { message: 'not found' } };
      }),
    };

    createClientMock.mockReset();
    createClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => query),
      })),
    });
  });

  it('returns a review only for the user ID in the ownership filter', async () => {
    const ownedReview = await loadUserReview('owner-user', reviewId);
    const anotherUsersReview = await loadUserReview('another-user', reviewId);

    expect(ownedReview?.id).toBe(reviewId);
    expect(anotherUsersReview).toBeNull();
  });

  it('does not query for an invalid review ID', async () => {
    const result = await loadUserReview('owner-user', '../review-123');

    expect(result).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
