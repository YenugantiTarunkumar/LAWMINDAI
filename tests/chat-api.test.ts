import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as chatPost } from '../src/app/api/chat/route';

// Mock the 'ai' module so generateText is fully deterministic
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

import { generateText } from 'ai';

const mockGenerateText = vi.mocked(generateText);

function createChatRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const SAMPLE_AGREEMENT = `
[Page 1]
MASTER SERVICES AGREEMENT
1. Payment Terms: Customer shall pay monthly fees of 50,000 INR within 30 days of the invoice date. Late payments accrue interest at 1.5% per month.
2. Responsibilities: Provider shall deliver software maintenance services. Customer shall provide timely system access.

[Page 2]
3. Termination: Either party may terminate this agreement by providing at least 30 days written notice.
4. Liability: Provider total aggregate liability is strictly capped at fees paid in the preceding 12 months.

[Page 3]
5. Indemnification: Customer agrees to indemnify and hold harmless Provider against all third-party claims.
6. Governing Law: This contract shall be governed by the laws of India and subject to courts in New Delhi.
`.trim();

describe('Agreement Chatbot - API Endpoint (/api/chat)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'mock-gemini-key-for-test';
  });

  it('1. normal successful question with grounded evidence', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        answer: 'Payment is due within 30 days of the invoice date.',
        answerType: 'document',
        documentCoverage: 'supported',
        evidence: [
          {
            passageId: 'passage-1',
            quote: 'within 30 days of the invoice date',
          },
        ],
      }),
    } as never);

    const res = await chatPost(
      createChatRequest({
        question: 'When is payment due?',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toContain('30 days');
    expect(body.answerType).toBe('document');
    expect(body.documentCoverage).toBe('supported');
    expect(body.evidence).toHaveLength(1);
    expect(body.evidence[0].quote).toBe('within 30 days of the invoice date');
  });

  it('2. handles "Summarize this agreement"', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        answer: 'This Master Services Agreement covers software maintenance, 30-day payment terms, and 30-day termination.',
        answerType: 'document',
        documentCoverage: 'supported',
        evidence: [
          {
            passageId: 'passage-1',
            quote: 'Customer shall pay monthly fees of 50,000 INR within 30 days of the invoice date',
          },
        ],
      }),
    } as never);

    const res = await chatPost(
      createChatRequest({
        question: 'Summarize this agreement.',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toContain('Master Services Agreement');
  });

  it('3. handles "What are my payment obligations?"', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        answer: 'The customer is obligated to pay monthly fees of 50,000 INR within 30 days.',
        answerType: 'document',
        documentCoverage: 'supported',
        evidence: [
          {
            passageId: 'passage-1',
            quote: 'Customer shall pay monthly fees of 50,000 INR within 30 days',
          },
        ],
      }),
    } as never);

    const res = await chatPost(
      createChatRequest({
        question: 'What are my payment obligations?',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toContain('50,000 INR');
  });

  it('4. handles "Can either party terminate this agreement?"', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        answer: 'Yes, either party may terminate with at least 30 days written notice.',
        answerType: 'document',
        documentCoverage: 'supported',
        evidence: [
          {
            passageId: 'passage-2',
            quote: 'Either party may terminate this agreement by providing at least 30 days written notice',
          },
        ],
      }),
    } as never);

    const res = await chatPost(
      createChatRequest({
        question: 'Can either party terminate this agreement?',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer.toLowerCase()).toContain('either party may terminate');
  });

  it('5. handles "What happens if payment is delayed?"', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        answer: 'Late payments accrue interest at 1.5% per month.',
        answerType: 'document',
        documentCoverage: 'supported',
        evidence: [
          {
            passageId: 'passage-1',
            quote: 'Late payments accrue interest at 1.5% per month',
          },
        ],
      }),
    } as never);

    const res = await chatPost(
      createChatRequest({
        question: 'What happens if payment is delayed?',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toContain('1.5% per month');
  });

  it('6. handles "Does this agreement contain an indemnity clause?"', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        answer: 'Yes, clause 5 contains an indemnification clause favoring the Provider.',
        answerType: 'document',
        documentCoverage: 'supported',
        evidence: [
          {
            passageId: 'passage-3',
            quote: 'Customer agrees to indemnify and hold harmless Provider against all third-party claims',
          },
        ],
      }),
    } as never);

    const res = await chatPost(
      createChatRequest({
        question: 'Does this agreement contain an indemnity clause?',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.documentCoverage).toBe('supported');
  });

  it('7. handles "Which clauses expose me to high risk?"', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        answer: 'The one-sided indemnification in clause 5 and the liability cap in clause 4 present elevated risk.',
        answerType: 'document',
        documentCoverage: 'supported',
        evidence: [
          {
            passageId: 'passage-3',
            quote: 'Customer agrees to indemnify and hold harmless Provider',
          },
        ],
      }),
    } as never);

    const res = await chatPost(
      createChatRequest({
        question: 'Which clauses expose me to high risk?',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toContain('indemnification');
  });

  it('8. handles "What important clauses are missing?"', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        answer: 'The agreement lacks a mutual confidentiality clause and a detailed data privacy provision.',
        answerType: 'document',
        documentCoverage: 'not_found',
        evidence: [],
      }),
    } as never);

    const res = await chatPost(
      createChatRequest({
        question: 'What important clauses are missing?',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.documentCoverage).toBe('not_found');
    expect(body.evidence).toHaveLength(0);
  });

  it('9. handles "What are the responsibilities of each party?"', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        answer: 'Provider delivers maintenance, while Customer provides timely system access and pays fees.',
        answerType: 'document',
        documentCoverage: 'supported',
        evidence: [
          {
            passageId: 'passage-1',
            quote: 'Provider shall deliver software maintenance services. Customer shall provide timely system access',
          },
        ],
      }),
    } as never);

    const res = await chatPost(
      createChatRequest({
        question: 'What are the responsibilities of each party?',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.evidence).toHaveLength(1);
  });

  it('10. handles "Explain the liability clause in simple English."', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        answer: 'If something goes wrong, the most Provider can be forced to pay is the amount paid in the last year.',
        answerType: 'document',
        documentCoverage: 'supported',
        evidence: [
          {
            passageId: 'passage-2',
            quote: 'strictly capped at fees paid in the preceding 12 months',
          },
        ],
      }),
    } as never);

    const res = await chatPost(
      createChatRequest({
        question: 'Explain the liability clause in simple English.',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toContain('last year');
  });

  it('11. handles "Suggest safer wording for this provision."', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        answer: 'Make indemnification mutual: "Each party agrees to indemnify the other against third-party claims arising from gross negligence."',
        answerType: 'document',
        documentCoverage: 'supported',
        evidence: [
          {
            passageId: 'passage-3',
            quote: 'Customer agrees to indemnify and hold harmless Provider',
          },
        ],
      }),
    } as never);

    const res = await chatPost(
      createChatRequest({
        question: 'Suggest safer wording for this provision.',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toContain('mutual');
  });

  it('12. rejects empty question with 400', async () => {
    const res = await chatPost(
      createChatRequest({
        question: '   ',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Question is required');
  });

  it('13. rejects request without documentText or reviewId with 400', async () => {
    const res = await chatPost(
      createChatRequest({
        question: 'What is the governing law?',
      }),
    );

    expect(res.status).toBe(400);
  });

  it('14. rejects empty documentText with 400', async () => {
    const res = await chatPost(
      createChatRequest({
        question: 'What is the governing law?',
        documentText: '   ',
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('document text is required');
  });

  it('15. handles Gemini returning conversational text instead of JSON gracefully', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'According to Indian law and general practice, 30 days notice for termination is customary in IT services contracts.',
    } as never);

    const res = await chatPost(
      createChatRequest({
        question: 'Is 30 days notice standard?',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toContain('30 days notice for termination is customary');
    expect(body.answerType).toBe('general');
    expect(body.documentCoverage).toBe('not_found');
    expect(body.evidence).toEqual([]);
  });

  it('16. returns 502 when Gemini returns an empty response', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '',
      finishReason: 'empty',
    } as never);

    const res = await chatPost(
      createChatRequest({
        question: 'What is the payment term?',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/empty/i);
  });

  it('17. returns 429 when Gemini throws a rate limit error', async () => {
    mockGenerateText.mockRejectedValueOnce(
      new Error('429 RESOURCE_EXHAUSTED: Quota exceeded for model'),
    );

    const res = await chatPost(
      createChatRequest({
        question: 'What is the payment term?',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('too many requests');
  });

  it('18. returns 503 when Gemini service is temporarily overloaded', async () => {
    mockGenerateText.mockRejectedValueOnce(
      new Error('503 Service Unavailable: The model is overloaded'),
    );

    const res = await chatPost(
      createChatRequest({
        question: 'What is the payment term?',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain('temporarily unavailable');
  });

  it('19. returns 504 when Gemini provider times out', async () => {
    mockGenerateText.mockRejectedValueOnce(
      new Error('Deadline exceeded: Gateway timeout'),
    );

    const res = await chatPost(
      createChatRequest({
        question: 'What is the payment term?',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.error).toContain('timed out');
  });

  it('20. discards fabricated evidence and preserves the answer cleanly', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        answer: 'Customer shall pay 50,000 INR, but discounts are not mentioned.',
        answerType: 'document',
        documentCoverage: 'supported',
        evidence: [
          {
            passageId: 'passage-1',
            quote: 'Customer shall pay monthly fees of 50,000 INR',
          },
          {
            passageId: 'passage-1',
            quote: 'Customer receives a 50% discount on late fees', // fake quote
          },
        ],
      }),
    } as never);

    const res = await chatPost(
      createChatRequest({
        question: 'What are the payment terms and is there any discount?',
        documentText: SAMPLE_AGREEMENT,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.evidence).toHaveLength(1);
    expect(body.evidence[0].quote).toBe('Customer shall pay monthly fees of 50,000 INR');
  });
});
