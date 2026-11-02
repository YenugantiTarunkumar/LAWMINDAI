/**
 * Safe diagnostic logger for AI provider interactions.
 * Never logs API keys, credentials, cookies, tokens, or raw contract text.
 */

export interface SafeDiagnosticEvent {
  event: string;
  provider?: string;
  model?: string;
  sectionIndex?: number;
  totalSections?: number;
  characterCount?: number;
  finishReason?: string;
  statusCode?: number;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  errorType?: string;
  errorMessage?: string;
  validationDetails?: Array<{
    path: string;
    message: string;
    code?: string;
  }>;
  durationMs?: number;
}

export function logSafeDiagnostic(data: SafeDiagnosticEvent): void {
  const sanitized: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    ...data,
  };

  // Ensure no sensitive fields can ever slip through
  delete sanitized.apiKey;
  delete sanitized.authorization;
  delete sanitized.cookie;
  delete sanitized.content;
  delete sanitized.text;
  delete sanitized.rawPrompt;

  console.info('[AI-DIAGNOSTIC]', JSON.stringify(sanitized));
}

export function extractValidationDetails(
  error: unknown,
): Array<{ path: string; message: string; code?: string }> | undefined {
  if (!error || typeof error !== 'object') return undefined;

  // Check for Zod error issues
  if ('issues' in error && Array.isArray((error as { issues: unknown[] }).issues)) {
    return (
      error as {
        issues: Array<{ path?: unknown; message?: unknown; code?: unknown }>;
      }
    ).issues.map((issue) => ({
      path: Array.isArray(issue.path)
        ? issue.path.join('.')
        : String(issue.path ?? ''),
      message: String(issue.message ?? ''),
      code: typeof issue.code === 'string' ? issue.code : undefined,
    }));
  }

  // Check inside cause recursively
  if ('cause' in error && (error as { cause: unknown }).cause) {
    return extractValidationDetails((error as { cause: unknown }).cause);
  }

  return undefined;
}
