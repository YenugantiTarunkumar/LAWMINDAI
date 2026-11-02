import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { POST as caseGuidancePost } from '../src/app/api/case-guidance/route';
import { POST as chatPost } from '../src/app/api/chat/route';
import { POST as legalAssistantPost } from '../src/app/api/legal-assistant/route';
import { POST as legalDraftingPost } from '../src/app/api/legal-drafting/route';
import { POST as reviewPost } from '../src/app/api/review/route';
import { POST as signupPost } from '../src/app/api/auth/signup/route';

function jsonRequest(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('API request validation', () => {
  it('rejects unsupported contract review modes before provider use', async () => {
    const response = await reviewPost(
      jsonRequest('/api/review', {
        content: 'Example contract',
        mode: 'unsupported',
      }),
    );

    expect(response.status).toBe(400);
  });

  it('rejects empty document chat questions', async () => {
    const response = await chatPost(jsonRequest('/api/chat', { question: '' }));

    expect(response.status).toBe(400);
  });

  it('rejects empty legal assistant questions', async () => {
    const response = await legalAssistantPost(
      jsonRequest('/api/legal-assistant', { question: '' }),
    );

    expect(response.status).toBe(400);
  });

  it('rejects incomplete case guidance requests', async () => {
    const response = await caseGuidancePost(
      jsonRequest('/api/case-guidance', {}),
    );

    expect(response.status).toBe(400);
  });

  it('rejects unsupported drafting actions', async () => {
    const response = await legalDraftingPost(
      jsonRequest('/api/legal-drafting', {}),
    );

    expect(response.status).toBe(400);
  });

  it('rejects invalid signup input before contacting Supabase', async () => {
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const previousAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://unit-test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'unit-test-anon-key';

    try {
      const response = await signupPost(jsonRequest('/api/auth/signup', {}));

      expect(response.status).toBe(400);
    } finally {
      if (previousUrl === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      } else {
        process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
      }
      if (previousAnonKey === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      } else {
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnonKey;
      }
    }
  });

  it.each([
    {
      name: 'contract review',
      path: '/api/review',
      post: reviewPost,
      body: { content: 'Synthetic agreement terms.', mode: 'full-review', save: false },
    },
    {
      name: 'document chat',
      path: '/api/chat',
      post: chatPost,
      body: { documentText: 'Synthetic agreement terms.', question: 'What does this say?', history: [] },
    },
    {
      name: 'legal assistant',
      path: '/api/legal-assistant',
      post: legalAssistantPost,
      body: { question: 'What is a breach of contract under Indian law?', history: [] },
    },
    {
      name: 'case guidance',
      path: '/api/case-guidance',
      post: caseGuidancePost,
      body: {
        category: 'contract',
        situation: 'A supplier has not delivered the agreed services.',
        question: 'What information should be collected?',
        history: [],
      },
    },
    {
      name: 'legal drafting',
      path: '/api/legal-drafting',
      post: legalDraftingPost,
      body: {
        action: 'analyze',
        documentType: 'service-agreement',
        fields: {
          client: 'Sample client',
          provider: 'Sample provider',
          services: 'Sample services',
          fees: 'Sample fee',
        },
      },
    },
  ])('returns a generic unavailable response for $name when Gemini is not configured', async ({
    path,
    post,
    body,
  }) => {
    const previousGeminiKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const response = await post(jsonRequest(path, body));

      expect(response.status).toBe(503);
      const responseBody = await response.json();
      expect(responseBody.error).toMatch(/AI service is not configured/i);
      expect(responseBody.error).not.toMatch(/gemini|openai|anthropic/i);
    } finally {
      if (previousGeminiKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = previousGeminiKey;
      }
    }
  });
});
