import { PDFParse } from 'pdf-parse';
import { logger } from '../lib/logger.js';

// Real text extraction for text-based PDFs — offline, no external service.
//
// Image OCR (photos of paper documents, scanned PDFs) is NOT implemented:
// it needs either a native OCR engine or a cloud Vision API, both of which
// require either binary dependencies or external network calls this
// environment can't provide credentials/connectivity for. Rather than fake
// it, this returns an empty result the caller (analysis pipeline) reports
// honestly as "couldn't read this file" (spec section 44). Wiring a real
// engine (e.g. Tesseract, Google Cloud Vision, AWS Textract) means
// implementing this same function's `image/*` branch — nothing else in the
// pipeline needs to change.
export async function extractText(buffer: Buffer, mimeType: string): Promise<{ text: string; pages: string[] }> {
  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      const pages = (result.pages ?? []).map((p) => p.text ?? '');
      return { text: result.text ?? '', pages: pages.length ? pages : [result.text ?? ''] };
    } catch (err) {
      logger.warn({ err }, 'pdf text extraction failed');
      return { text: '', pages: [] };
    } finally {
      await parser.destroy();
    }
  }

  if (mimeType.startsWith('text/')) {
    const text = buffer.toString('utf8');
    return { text, pages: [text] };
  }

  // image/*, and anything else: no OCR configured.
  return { text: '', pages: [] };
}
