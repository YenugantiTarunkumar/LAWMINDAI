import fs from 'node:fs';
import path from 'node:path';
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

  it('extracts text and page numbers from valid PDF files', async () => {
    const pdfPath = path.join(__dirname, 'fixtures', 'sample.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const file = new File([pdfBuffer], 'contract.pdf', { type: 'application/pdf' });

    const extracted = await extractTextFromFile(file);
    expect(extracted.format).toBe('pdf');
    expect(extracted.pageCount).toBe(1);
    expect(extracted.text).toContain('[Page 1]');
    expect(extracted.text).toContain('MASTER SERVICES AGREEMENT');
  });

  it('extracts text from valid DOCX files', async () => {
    const docxPath = path.join(__dirname, 'fixtures', 'sample.docx');
    const docxBuffer = fs.readFileSync(docxPath);
    const file = new File([docxBuffer], 'contract.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const extracted = await extractTextFromFile(file);
    expect(extracted.format).toBe('docx');
    expect(extracted.pageCount).toBeNull();
    expect(extracted.text).toContain('MASTER SERVICES AGREEMENT');
  });

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
    const corruptedPdf = new File(['%PDF-1.4\ncorrupted garbage binary data'], 'corrupt.pdf');
    const invalidUtf8 = new File(
      [new Blob([new Uint8Array([0xff])])],
      'invalid.txt',
    );

    await expect(extractTextFromFile(emptyFile)).rejects.toThrow('empty');
    await expect(extractTextFromFile(oversizedFile)).rejects.toThrow('5 MB');
    await expect(extractTextFromFile(malformedPdf)).rejects.toThrow('valid PDF');
    await expect(extractTextFromFile(corruptedPdf)).rejects.toThrow('could not be read');
    await expect(extractTextFromFile(invalidUtf8)).rejects.toThrow('UTF-8');
  });
});
