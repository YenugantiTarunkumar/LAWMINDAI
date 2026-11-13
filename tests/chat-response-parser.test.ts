import { describe, expect, it } from 'vitest';
import { parseChatResponse } from '../src/lib/chat/response-parser';
import type { DocumentPassage } from '../src/lib/chat/retrieval';

describe('Agreement Chatbot - Response Parser', () => {
  const samplePassages: DocumentPassage[] = [
    {
      id: 'passage-1',
      text: '[Page 1]\nMASTER SERVICES AGREEMENT\n1. Payment Terms: Customer shall pay all invoices within 30 days of the invoice date. Late payments incur interest at 1.5% per month.',
      clause: '1. Payment Terms',
      pageNumber: 1,
    },
    {
      id: 'passage-2',
      text: '[Page 2]\n2. Termination: Either party may terminate this agreement by providing at least 30 days written notice to the other party.',
      clause: '2. Termination',
      pageNumber: 2,
    },
    {
      id: 'passage-3',
      text: '[Page 3]\n3. Indemnification: Customer agrees to defend, indemnify, and hold harmless the Provider from any third-party claims arising from Customer breach.',
      clause: '3. Indemnification',
      pageNumber: 3,
    },
  ];

  it('1. parses a correct standard JSON response', () => {
    const raw = JSON.stringify({
      answer: 'Payment is due within 30 days of invoice date.',
      answerType: 'document',
      documentCoverage: 'supported',
      evidence: [
        {
          passageId: 'passage-1',
          quote: 'Customer shall pay all invoices within 30 days of the invoice date.',
        },
      ],
    });

    const parsed = parseChatResponse(raw, samplePassages);
    expect(parsed).not.toBeNull();
    expect(parsed?.answer).toBe('Payment is due within 30 days of invoice date.');
    expect(parsed?.answerType).toBe('document');
    expect(parsed?.documentCoverage).toBe('supported');
    expect(parsed?.evidence).toHaveLength(1);
    expect(parsed?.evidence[0]).toMatchObject({
      clause: '1. Payment Terms',
      pageNumber: 1,
      quote: 'Customer shall pay all invoices within 30 days of the invoice date.',
    });
  });

  it('2. parses JSON enclosed in markdown code fences', () => {
    const raw = `\`\`\`json
{
  "answer": "Either party may terminate with 30 days written notice.",
  "answerType": "document",
  "documentCoverage": "supported",
  "evidence": [
    {
      "passageId": "passage-2",
      "quote": "Either party may terminate this agreement by providing at least 30 days written notice"
    }
  ]
}
\`\`\``;

    const parsed = parseChatResponse(raw, samplePassages);
    expect(parsed).not.toBeNull();
    expect(parsed?.answerType).toBe('document');
    expect(parsed?.evidence[0].clause).toBe('2. Termination');
  });

  it('3. handles extra harmless JSON fields gracefully', () => {
    const raw = JSON.stringify({
      answer: 'Indemnity applies to third-party claims.',
      answerType: 'document',
      documentCoverage: 'supported',
      confidenceScore: 0.98,
      reasoningNotes: 'Found in clause 3.',
      extraField: 'harmless',
      evidence: [
        {
          passageId: 'passage-3',
          quote: 'Customer agrees to defend, indemnify, and hold harmless',
          confidence: 'high',
          notes: 'Standard indemnity',
        },
      ],
    });

    const parsed = parseChatResponse(raw, samplePassages);
    expect(parsed).not.toBeNull();
    expect(parsed?.answer).toBe('Indemnity applies to third-party claims.');
    expect(parsed?.evidence).toHaveLength(1);
  });

  it('4. handles missing optional evidence property', () => {
    const raw = JSON.stringify({
      answer: 'This agreement does not explicitly mention intellectual property assignment.',
      answerType: 'document',
      documentCoverage: 'not_found',
    });

    const parsed = parseChatResponse(raw, samplePassages);
    expect(parsed).not.toBeNull();
    expect(parsed?.documentCoverage).toBe('not_found');
    expect(parsed?.evidence).toEqual([]);
  });

  it('5. handles empty evidence array', () => {
    const raw = JSON.stringify({
      answer: 'General contract principles apply regarding force majeure.',
      answerType: 'general',
      documentCoverage: 'not_applicable',
      evidence: [],
    });

    const parsed = parseChatResponse(raw, samplePassages);
    expect(parsed).not.toBeNull();
    expect(parsed?.answerType).toBe('general');
    expect(parsed?.documentCoverage).toBe('not_applicable');
    expect(parsed?.evidence).toEqual([]);
  });

  it('6. verifies short but genuine document quotations', () => {
    const raw = JSON.stringify({
      answer: 'Late payment interest is 1.5% per month.',
      answerType: 'document',
      documentCoverage: 'supported',
      evidence: [
        {
          passageId: 'passage-1',
          quote: '1.5% per month',
        },
      ],
    });

    const parsed = parseChatResponse(raw, samplePassages);
    expect(parsed).not.toBeNull();
    expect(parsed?.evidence).toHaveLength(1);
    expect(parsed?.evidence[0].quote).toBe('1.5% per month');
  });

  it('7. verifies quotations with harmless whitespace or capitalization differences', () => {
    const raw = JSON.stringify({
      answer: 'Termination requires 30 days notice.',
      answerType: 'document',
      documentCoverage: 'supported',
      evidence: [
        {
          passageId: 'passage-2',
          quote: '  either party   may terminate this agreement\nby providing at least 30 days  ',
        },
      ],
    });

    const parsed = parseChatResponse(raw, samplePassages);
    expect(parsed).not.toBeNull();
    expect(parsed?.evidence).toHaveLength(1);
    expect(parsed?.evidence[0].pageNumber).toBe(2);
  });

  it('8. verifies quotations containing ellipses', () => {
    const raw = JSON.stringify({
      answer: 'Customer indemnifies Provider from claims.',
      answerType: 'document',
      documentCoverage: 'supported',
      evidence: [
        {
          passageId: 'passage-3',
          quote: 'Customer agrees to defend ... from any third-party claims',
        },
      ],
    });

    const parsed = parseChatResponse(raw, samplePassages);
    expect(parsed).not.toBeNull();
    expect(parsed?.evidence).toHaveLength(1);
    expect(parsed?.evidence[0].clause).toBe('3. Indemnification');
  });

  it('9. discards unverified quotations and preserves valid ones', () => {
    const raw = JSON.stringify({
      answer: 'Payment is within 30 days, but discount was not located.',
      answerType: 'document',
      documentCoverage: 'supported',
      evidence: [
        {
          passageId: 'passage-1',
          quote: 'Customer shall pay all invoices within 30 days',
        },
        {
          passageId: 'passage-1',
          quote: 'Customer gets a 5% discount for early payment.', // fabricated!
        },
      ],
    });

    const parsed = parseChatResponse(raw, samplePassages);
    expect(parsed).not.toBeNull();
    expect(parsed?.evidence).toHaveLength(1);
    expect(parsed?.evidence[0].quote).toBe('Customer shall pay all invoices within 30 days');
  });

  it('10. discards evidence citing non-existent passage IDs', () => {
    const raw = JSON.stringify({
      answer: 'Notice period is 30 days.',
      answerType: 'document',
      documentCoverage: 'supported',
      evidence: [
        {
          passageId: 'passage-999',
          quote: '30 days written notice',
        },
        {
          passageId: 'passage-2',
          quote: '30 days written notice',
        },
      ],
    });

    const parsed = parseChatResponse(raw, samplePassages);
    expect(parsed).not.toBeNull();
    expect(parsed?.evidence).toHaveLength(1);
    expect(parsed?.evidence[0].clause).toBe('2. Termination');
  });

  it('11. deduplicates identical evidence items', () => {
    const raw = JSON.stringify({
      answer: 'Invoices are due in 30 days.',
      answerType: 'document',
      documentCoverage: 'supported',
      evidence: [
        { passageId: 'passage-1', quote: 'within 30 days of the invoice date' },
        { passageId: 'passage-1', quote: 'Within 30 days of the invoice date' },
      ],
    });

    const parsed = parseChatResponse(raw, samplePassages);
    expect(parsed).not.toBeNull();
    expect(parsed?.evidence).toHaveLength(1);
  });

  it('12. normalizes unexpected answer types safely', () => {
    const raw = JSON.stringify({
      answer: 'General contract info.',
      answerType: 'INVALID_TYPE',
      documentCoverage: 'not_applicable',
      evidence: [],
    });

    const parsed = parseChatResponse(raw, samplePassages);
    expect(parsed).not.toBeNull();
    expect(['document', 'general', 'mixed']).toContain(parsed?.answerType);
  });

  it('13. normalizes unexpected document coverage values safely', () => {
    const raw = JSON.stringify({
      answer: 'Payment is due within 30 days.',
      answerType: 'document',
      documentCoverage: 'PARTIALLY_SUPPORTED',
      evidence: [
        {
          passageId: 'passage-1',
          quote: 'within 30 days of the invoice date',
        },
      ],
    });

    const parsed = parseChatResponse(raw, samplePassages);
    expect(parsed).not.toBeNull();
    expect(parsed?.documentCoverage).toBe('supported');
  });

  it('14. returns null on empty or whitespace model output', () => {
    expect(parseChatResponse('', samplePassages)).toBeNull();
    expect(parseChatResponse('   \n  \t  ', samplePassages)).toBeNull();
  });

  it('15. gracefully recovers plain-text answer when AI omits JSON wrapper', () => {
    const raw = 'Based on the agreement, late payments incur interest at 1.5% per month and payment is due in 30 days.';
    const parsed = parseChatResponse(raw, samplePassages);
    expect(parsed).not.toBeNull();
    expect(parsed?.answer).toBe(raw);
    expect(parsed?.answerType).toBe('general');
    expect(parsed?.documentCoverage).toBe('not_found');
    expect(parsed?.evidence).toEqual([]);
  });

  it('16. rejects truncated/incomplete JSON cleanly', () => {
    const raw = '{"answer": "This agreement is a service agreement, and';
    const parsed = parseChatResponse(raw, samplePassages);
    // Since it starts with '{' but is broken, it won't be treated as conversational text
    expect(parsed).toBeNull();
  });

  it('17. ignores unexpected evidence data structures without crashing', () => {
    const raw = JSON.stringify({
      answer: 'Payment terms are outlined in clause 1.',
      answerType: 'document',
      documentCoverage: 'supported',
      evidence: [
        null,
        12345,
        'not an object',
        { invalid: true },
        { passageId: 'passage-1', quote: 'within 30 days of the invoice date' },
      ],
    });

    const parsed = parseChatResponse(raw, samplePassages);
    expect(parsed).not.toBeNull();
    expect(parsed?.evidence).toHaveLength(1);
    expect(parsed?.evidence[0].quote).toBe('within 30 days of the invoice date');
  });
});
