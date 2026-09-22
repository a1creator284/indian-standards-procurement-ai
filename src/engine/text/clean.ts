/** Text cleaning + chunking utilities shared by the pipeline and ingestion. */

export function cleanText(input: string): string {
  return input
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex -- strip control characters from PDF text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/-\n(?=[a-z])/g, '') // de-hyphenate PDF line breaks
    .trim();
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}/.+-]+/gu, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.+/-]+|[.+/-]+$/g, ''))
    .filter((t) => t.length > 1);
}

const STOP = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'are', 'from', 'was', 'were', 'has', 'have', 'had',
  'not', 'but', 'its', 'into', 'per', 'shall', 'should', 'will', 'may', 'can', 'all', 'any', 'each',
  'other', 'than', 'such', 'these', 'those', 'also', 'been', 'being', 'upto', 'including', 'etc',
  'of', 'to', 'in', 'on', 'at', 'by', 'or', 'an', 'as', 'is', 'be', 'it', 'if', 'no', 'so', 'up',
]);

export function contentTokens(text: string): string[] {
  return tokenize(text).filter((t) => !STOP.has(t));
}

export interface TextChunk {
  index: number;
  text: string;
  start: number;
  end: number;
}

/** Splits long text into overlapping chunks on sentence/paragraph boundaries. */
export function chunkText(text: string, size = 900, overlap = 120): TextChunk[] {
  const clean = cleanText(text);
  if (clean.length <= size) return [{ index: 0, text: clean, start: 0, end: clean.length }];

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const window = clean.slice(start, end);
      const breakAt = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('. '), window.lastIndexOf('\n'));
      if (breakAt > size * 0.5) end = start + breakAt + 1;
    }
    chunks.push({ index: index++, text: clean.slice(start, end).trim(), start, end });
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter((c) => c.text.length > 0);
}
