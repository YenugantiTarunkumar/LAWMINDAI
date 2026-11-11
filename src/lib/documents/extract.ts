import mammoth from 'mammoth';
import { CanvasFactory } from 'pdf-parse/worker';
import { PDFParse } from 'pdf-parse';

export const MAX_DOCUMENT_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_EXTRACTED_TEXT_LENGTH = 300_000;

export type DocumentFormat = 'pdf' | 'docx' | 'txt' | 'md';

export interface ExtractedDocument {
  text: string;
  fileName: string;
  format: DocumentFormat;
  pageCount: number | null;
  warnings: string[];
}

export class DocumentExtractionError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'DocumentExtractionError';
  }
}

export async function extractTextFromFile(
  file: File,
): Promise<ExtractedDocument> {
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (
    extension !== 'pdf' &&
    extension !== 'docx' &&
    extension !== 'txt' &&
    extension !== 'md'
  ) {
    throw new DocumentExtractionError(
      'Unsupported file type. Upload a PDF, DOCX, or TXT document.',
    );
  }

  if (file.size === 0) {
    throw new DocumentExtractionError('The uploaded document is empty.');
  }
  if (file.size > MAX_DOCUMENT_FILE_SIZE) {
    throw new DocumentExtractionError(
      'The uploaded document exceeds the 5 MB file-size limit.',
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (extension === 'pdf') {
    return extractPdf(bytes, fileName);
  }
  if (extension === 'docx') {
    return extractDocx(bytes, fileName);
  }

  return {
    text: decodeText(bytes),
    fileName,
    format: extension,
    pageCount: null,
    warnings: [],
  };
}

function extractPdf(bytes: Buffer, fileName: string): Promise<ExtractedDocument> {
  if (bytes.length < 5 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new DocumentExtractionError(
      'This file is not a valid PDF. Check that the extension matches the document.',
    );
  }

  return parsePdf(bytes, fileName);
}

async function parsePdf(
  bytes: Buffer,
  fileName: string,
): Promise<ExtractedDocument> {
  const parser = new PDFParse({
    data: bytes,
    CanvasFactory,
  });

  try {
    const result = await parser.getText();
    if (
      result.total < 1 ||
      result.pages.length !== result.total ||
      result.pages.some((page, index) => page.num !== index + 1)
    ) {
      throw new DocumentExtractionError(
        'The PDF text extraction was incomplete. The document was not analyzed; try exporting it again.',
        422,
      );
    }

    const text = result.pages
      .map((page) => `[Page ${page.num}]\n${page.text.trim()}`)
      .join('\n\n');
    const visibleCharacters = result.pages.reduce(
      (total, page) => total + countVisibleCharacters(page.text),
      0,
    );
    const minimumCharacters = Math.max(20, result.total * 10);

    if (visibleCharacters < minimumCharacters) {
      throw new DocumentExtractionError(
        'This PDF contains no usable text or appears to be scanned. OCR is required before it can be reviewed.',
        422,
      );
    }

    return {
      text,
      fileName,
      format: 'pdf',
      pageCount: result.total,
      warnings: [],
    };
  } catch (error) {
    if (error instanceof DocumentExtractionError) {
      throw error;
    }
    throw new DocumentExtractionError(
      'The PDF could not be read. It may be corrupted, encrypted, or use an unsupported format.',
      422,
    );
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(
  bytes: Buffer,
  fileName: string,
): Promise<ExtractedDocument> {
  if (
    bytes.length < 4 ||
    bytes[0] !== 0x50 ||
    bytes[1] !== 0x4b ||
    ![0x03, 0x05, 0x07].includes(bytes[2]) ||
    ![0x04, 0x06, 0x08].includes(bytes[3])
  ) {
    throw new DocumentExtractionError(
      'This file is not a valid DOCX document. Check that the extension matches the document.',
    );
  }

  try {
    const result = await mammoth.extractRawText({ buffer: bytes });
    const errors = result.messages.filter((message) => message.type === 'error');
    if (errors.length > 0) {
      throw new DocumentExtractionError(
        'The DOCX document is damaged or could not be fully extracted.',
        422,
      );
    }

    const text = result.value.trim();
    if (!text) {
      throw new DocumentExtractionError(
        'No readable text was found in the DOCX document.',
        422,
      );
    }

    return {
      text,
      fileName,
      format: 'docx',
      pageCount: null,
      warnings: [
        'DOCX extraction preserves paragraph order, but pagination is not available.',
      ],
    };
  } catch (error) {
    if (error instanceof DocumentExtractionError) {
      throw error;
    }
    throw new DocumentExtractionError(
      'The DOCX document could not be read. It may be corrupted or use an unsupported format.',
      422,
    );
  }
}

function decodeText(bytes: Buffer): string {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new DocumentExtractionError(
      'The text document is not valid UTF-8. Save it as UTF-8 and upload it again.',
    );
  }

  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
    throw new DocumentExtractionError(
      'The uploaded text file contains binary data and could not be safely analyzed.',
    );
  }
  if (!text.trim()) {
    throw new DocumentExtractionError('The uploaded document contains no text.');
  }

  return text;
}

function countVisibleCharacters(text: string): number {
  return [...text].filter((character) => !/\s/u.test(character)).length;
}
