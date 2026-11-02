import { randomUUID } from 'crypto';

/**
 * Validate that a review ID contains only alphanumeric characters,
 * hyphens, and underscores.
 */
export function isValidReviewId(id: string): boolean {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id);
}

function generateId(content: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const slug = content
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join('-')
    .slice(0, 40)
    || 'review';
  return `${date}-${slug}-${randomUUID().slice(0, 8)}`;
}

export { generateId };
