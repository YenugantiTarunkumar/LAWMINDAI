import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const GEMINI_MODEL = 'gemini-3.1-flash-lite';

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function getModel() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const google = createGoogleGenerativeAI({ apiKey });
  return google(GEMINI_MODEL);
}
