/**
 * Client-side PDF text extraction (pdf.js). Binary files never leave the
 * browser — only the extracted text is sent to the API for analysis.
 * The OCR port is a placeholder for scanned PDFs (see README → Future work).
 */
export interface PdfExtraction {
  text: string;
  pageCount: number;
  pagesWithText: number;
  fileName: string;
  sizeBytes: number;
  needsOcr: boolean;
  preview: string;
}

export interface OcrProvider {
  readonly name: string;
  isConfigured(): boolean;
  recognise(file: File): Promise<string>;
}

/** Default OCR port — not configured. Swap for Tesseract.js or a cloud OCR later. */
export const ocrProvider: OcrProvider = {
  name: 'not-configured',
  isConfigured: () => false,
  recognise: async () => {
    throw new Error('OCR is not configured in this build.');
  },
};

export class PdfError extends Error {
  constructor(
    message: string,
    public readonly code: 'invalid-type' | 'too-large' | 'empty' | 'parse-failed' | 'needs-ocr',
  ) {
    super(message);
    this.name = 'PdfError';
  }
}

export function validatePdfFile(file: File, maxMb: number): void {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) throw new PdfError('Only PDF files are supported.', 'invalid-type');
  if (file.size === 0) throw new PdfError('The selected file is empty.', 'empty');
  if (file.size > maxMb * 1024 * 1024) throw new PdfError(`File is larger than the ${maxMb} MB limit.`, 'too-large');
}

export async function extractPdfText(file: File, maxMb: number, onProgress?: (done: number, total: number) => void): Promise<PdfExtraction> {
  validatePdfFile(file, maxMb);

  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  let doc;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    doc = await pdfjs.getDocument({ data }).promise;
  } catch {
    throw new PdfError('The file could not be parsed as a PDF. It may be corrupted or password-protected.', 'parse-failed');
  }

  const pages: string[] = [];
  let pagesWithText = 0;
  const total = doc.numPages;
  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const lines: string[] = [];
    let lastY: number | null = null;
    let line = '';
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 3) {
        lines.push(line.trim());
        line = '';
      }
      line += (item.str ?? '') + (item.hasEOL ? '\n' : ' ');
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    const pageText = lines.join('\n').replace(/[ \t]+\n/g, '\n').trim();
    if (pageText.replace(/\s/g, '').length > 20) pagesWithText++;
    pages.push(pageText);
    onProgress?.(i, total);
  }
  await doc.cleanup();

  const text = pages.join('\n\n').trim();
  const needsOcr = text.replace(/\s/g, '').length < 40;
  if (needsOcr && !ocrProvider.isConfigured()) {
    throw new PdfError('No selectable text was found — this looks like a scanned PDF. OCR is not configured in this build; paste the text instead.', 'needs-ocr');
  }
  return { text, pageCount: total, pagesWithText, fileName: file.name, sizeBytes: file.size, needsOcr, preview: text.slice(0, 1500) };
}
