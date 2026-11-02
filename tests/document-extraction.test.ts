import { describe, expect, it } from 'vitest';
import {
  DocumentExtractionError,
  extractTextFromFile,
  MAX_DOCUMENT_FILE_SIZE,
} from '../src/lib/documents/extract';

describe('document extraction', () => {
  it.each(['txt', 'md'] as const)(
    'extracts UTF-8 text from .%s files',
    async (extension) => {
      const file = new File(['Payment is due within 30 days.'], `contract.${extension}`);
      const extracted = await extractTextFromFile(file);

      expect(extracted.text).toBe('Payment is due within 30 days.');
      expect(extracted.format).toBe(extension);
      expect(extracted.pageCount).toBeNull();
    },
  );

  it('rejects unsupported extensions', async () => {
    const file = new File(['not a contract'], 'contract.exe');

    await expect(extractTextFromFile(file)).rejects.toBeInstanceOf(
      DocumentExtractionError,
    );
  });

  it('rejects empty, oversized, malformed PDF and invalid UTF-8 files', async () => {
    const emptyFile = new File([], 'empty.txt');
    const oversizedFile = new File(
      [new ArrayBuffer(MAX_DOCUMENT_FILE_SIZE + 1)],
      'large.txt',
    );
    const malformedPdf = new File(['not a PDF'], 'contract.pdf');
    const invalidUtf8 = new File(
      [new Blob([new Uint8Array([0xff])])],
      'invalid.txt',
    );

    await expect(extractTextFromFile(emptyFile)).rejects.toThrow('empty');
    await expect(extractTextFromFile(oversizedFile)).rejects.toThrow('5 MB');
    await expect(extractTextFromFile(malformedPdf)).rejects.toThrow('valid PDF');
    await expect(extractTextFromFile(invalidUtf8)).rejects.toThrow('UTF-8');
  });
});
