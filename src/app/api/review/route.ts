import { NextRequest, NextResponse } from 'next/server';
import { NoObjectGeneratedError } from 'ai';
import { getModel } from '@/lib/ai/provider';
import { getSystemPrompt } from '@/lib/ai/prompts/system';
import {
  InvalidReviewOutputError,
} from '@/lib/ai/parser';
import {
  reviewAgreement,
  SectionReviewError,
} from '@/lib/ai/section-review';
import {
  logSafeDiagnostic,
  extractValidationDetails,
} from '@/lib/ai/diagnostic-logger';
import { loadKnowledgeBase } from '@/lib/contracts/knowledge-base';
import { generateId } from '@/lib/storage/review-store';
import { saveUserReview } from '@/lib/storage/user-review-store';
import { getSessionUser } from '@/lib/supabase/server';
import type { ReviewMode, StoredReview, ReviewResult } from '@/lib/types';
import {
  DocumentExtractionError,
  MAX_EXTRACTED_TEXT_LENGTH,
  extractTextFromFile,
} from '@/lib/documents/extract';
import { readBoundedBody } from '@/lib/http/read-bounded-body';

import { SAMPLE_REVIEW_RESULT } from '@/lib/demo-data';

const MAX_REVIEW_BODY_BYTES = 6_000_000;
const VALID_MODES: ReviewMode[] = ['full-review', 'clause-by-clause', 'redline', 'provision-drafter'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReviewMode(value: unknown): value is ReviewMode {
  return typeof value === 'string' && VALID_MODES.includes(value as ReviewMode);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).origin !== request.nextUrl.origin) {
        return NextResponse.json({ error: 'Cross-origin review requests are not allowed.' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
  }
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Cross-origin review requests are not allowed.' }, { status: 403 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    const bodyBytes = await readBoundedBody(request, MAX_REVIEW_BODY_BYTES);
    if (bodyBytes === null) {
      return NextResponse.json({ error: 'Review request is too large.' }, { status: 413 });
    }

    let content: string;
    let mode: ReviewMode;
    let fileName: string | undefined;
    let shouldSave = false;
    let isDemoRequest = false;
    let documentInfo: ReviewResult['documentInfo'];

    if (contentType.includes('multipart/form-data')) {
      const headers = new Headers(request.headers);
      headers.delete('content-length');
      const boundedRequest = new Request(request.url, {
        method: request.method,
        headers,
        body: bodyBytes,
      });
      let formData: FormData;
      try {
        formData = await boundedRequest.formData();
      } catch {
        return NextResponse.json({ error: 'The uploaded form is malformed.' }, { status: 400 });
      }
      const file = formData.get('file');
      const modeField = formData.get('mode');
      const saveField = formData.get('save');
      const demoField = formData.get('isDemo');

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      if (!isReviewMode(modeField)) {
        return NextResponse.json(
          { error: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}` },
          { status: 400 }
        );
      }
      const extracted = await extractTextFromFile(file);
      content = extracted.text;
      fileName = extracted.fileName;
      mode = modeField;
      shouldSave = saveField === 'true';
      isDemoRequest = demoField === 'true';
      documentInfo = {
        format: extracted.format,
        pageCount: extracted.pageCount,
        characterCount: extracted.text.length,
        warnings: extracted.warnings,
      };
    } else {
      let body: unknown;
      try {
        body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bodyBytes));
      } catch {
        return NextResponse.json({ error: 'Request body contains invalid JSON.' }, { status: 400 });
      }
      if (!isRecord(body)) {
        return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
      }

      if (typeof body.content !== 'string' || !body.content.trim()) {
        return NextResponse.json({ error: 'content is required and must be a string' }, { status: 400 });
      }
      if (!isReviewMode(body.mode)) {
        return NextResponse.json(
          { error: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}` },
          { status: 400 }
        );
      }
      if (body.content.length > MAX_EXTRACTED_TEXT_LENGTH) {
        return NextResponse.json(
          { error: `Contract content exceeds the maximum limit of ${MAX_EXTRACTED_TEXT_LENGTH.toLocaleString()} characters.` },
          { status: 400 },
        );
      }

      content = body.content;
      mode = body.mode;
      fileName = typeof body.fileName === 'string' ? body.fileName.slice(0, 255) : undefined;
      shouldSave = body.save === true;
      isDemoRequest = body.isDemo === true;
      documentInfo = {
        format: 'pasted',
        pageCount: null,
        characterCount: content.length,
        warnings: [],
      };
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 });
    }

    if (content.length > MAX_EXTRACTED_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Contract content exceeds the maximum limit of ${MAX_EXTRACTED_TEXT_LENGTH.toLocaleString()} characters.` },
        { status: 400 }
      );
    }

    // API-free demonstration mode branch: return illustrative results without external AI calls
    if (isDemoRequest) {
      if (shouldSave) {
        return NextResponse.json(
          { error: 'Demo reviews are temporary and cannot be saved to shared storage.' },
          { status: 400 },
        );
      }
      const result: ReviewResult = { ...SAMPLE_REVIEW_RESULT, documentInfo };
      return NextResponse.json({ ...result, chatDocumentText: content });
    }

    const knowledgeContext = await loadKnowledgeBase();
    const systemPrompt = getSystemPrompt(knowledgeContext);
    const model = getModel();

    let result: ReviewResult;
    try {
      result = await reviewAgreement({
        content,
        model,
        systemPrompt,
        mode,
        documentInfo,
      });
    } catch (error) {
      if (error instanceof SectionReviewError) {
        logSafeDiagnostic({
          event: 'review_section_error',
          sectionIndex: error.sectionIndex,
          totalSections: error.totalSections,
          errorType: error.originalErrorName ?? error.name,
          errorMessage: error.reason,
        });
        return NextResponse.json(
          {
            error: error.message,
          },
          { status: 502 },
        );
      }

      if (NoObjectGeneratedError.isInstance(error)) {
        const validationDetails = extractValidationDetails(error);
        logSafeDiagnostic({
          event: 'review_generation_no_object',
          finishReason: error.finishReason,
          errorType: error.name,
          errorMessage: error.message,
          validationDetails,
        });
        return NextResponse.json(
          {
            error:
              error.finishReason === 'length'
                ? 'The review was incomplete because the agreement is too long for one response. Split it into smaller sections and retry.'
                : 'The AI service could not produce a complete structured review. Please retry; for longer agreements, review smaller sections.',
          },
          { status: error.finishReason === 'length' ? 422 : 502 },
        );
      }

      logSafeDiagnostic({
        event: 'review_generation_error',
        errorType: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }

    if (shouldSave) {
      const user = await getSessionUser();
      if (!user) {
        return NextResponse.json(
          {
            error:
              'Authentication required. Please sign in to save contract reviews to your private history.',
          },
          { status: 401 }
        );
      }

      const id = generateId(fileName || content);
      const storedReview: StoredReview = {
        id,
        timestamp: new Date().toISOString(),
        mode,
        inputFileName: fileName,
        result,
        originalContent: content,
      };

      const saveRes = await saveUserReview(user.id, storedReview);
      if (!saveRes.success) {
        return NextResponse.json(
          { error: saveRes.error || 'Failed to save review to your account.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ ...result, reviewId: id });
    }

    return NextResponse.json({ ...result, chatDocumentText: content });
  } catch (error) {
    if (error instanceof DocumentExtractionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    if (
      error instanceof Error &&
      error.message.includes('GEMINI_API_KEY is not configured')
    ) {
      return NextResponse.json(
        { error: 'The AI service is not configured on this server. Please use the demo or contact the site administrator.' },
        { status: 503 },
      );
    }

    logSafeDiagnostic({
      event: 'review_api_fatal_error',
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Request body contains invalid JSON.' },
        { status: 400 },
      );
    }

    if (error instanceof InvalidReviewOutputError) {
      return NextResponse.json(
        { error: error.message },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: 'The review could not be completed. Please try again.' },
      { status: 500 },
    );
  }
}
