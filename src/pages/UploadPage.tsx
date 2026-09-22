import { useCallback, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, FileText, FileUp, ScanText, Sparkles, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { extractPdfText, PdfError, type PdfExtraction } from '@/services/pdf';
import { PageHeader } from '@/components/PageHeader';
import { Badge, Button, Card, ErrorState, cx } from '@/components/ui';

type Stage = 'idle' | 'reading' | 'ready' | 'error';

export function UploadPage({ inline = false }: { inline?: boolean }) {
  const { status, runAnalysis, analysing } = useApp();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [extraction, setExtraction] = useState<PdfExtraction | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const maxMb = status?.maxUploadMb ?? 10;

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      setExtraction(null);
      setStage('reading');
      setProgress({ done: 0, total: 0 });
      try {
        const result = await extractPdfText(file, maxMb, (done, total) => setProgress({ done, total }));
        setExtraction(result);
        setStage('ready');
      } catch (e) {
        setError(e instanceof PdfError ? { message: e.message, code: e.code } : { message: 'Failed to read the file.' });
        setStage('error');
      }
    },
    [maxMb],
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer.files?.[0]);
  };

  const analyse = async () => {
    if (!extraction) return;
    try {
      const result = await runAnalysis(extraction.text, 'pdf', extraction.fileName);
      navigate(`/results/${result.id}`);
    } catch (e) {
      setError({ message: (e as Error).message });
    }
  };

  const reset = () => {
    setStage('idle');
    setExtraction(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={cx("space-y-6", !inline && "max-w-3xl mx-auto")}>
      {!inline && (
        <PageHeader
          eyebrow="Upload"
          title="Upload a tender or specification PDF"
          description={`Text is extracted in your browser (the PDF never leaves your device); only the extracted text is analysed. PDF only, up to ${maxMb} MB. Scanned PDFs need OCR, which is a pluggable port not configured in this build.`}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cx(
              'card depth-card flex min-h-[260px] flex-col items-center justify-center gap-3 border-2 border-dashed p-8 text-center transition-colors',
              dragging ? 'border-primary bg-primary/5' : 'border-line',
            )}
          >
            <div className="grid size-14 place-items-center rounded-2xl bg-muted text-ink">
              <FileUp className="size-6" />
            </div>
            <div>
              <div className="text-[15px] font-semibold">Drag &amp; drop a tender PDF here</div>
              <div className="text-[13px] text-ink-muted">or</div>
            </div>
            <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={stage === 'reading'}>
              Choose PDF
            </Button>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => void handleFile(e.target.files?.[0])} aria-label="Choose a PDF file" />
            <p className="text-[11.5px] text-ink-muted">Accepted: .pdf · Max {maxMb} MB · Text-based PDFs</p>
          </div>

          {stage === 'reading' && (
            <Card className="depth-card p-4 animate-fade-in">
              <div className="flex items-center gap-2 text-[13px] font-medium">
                <ScanText className="size-4 animate-pulse-soft text-primary" /> Extracting text… {progress.total ? `page ${progress.done} of ${progress.total}` : 'opening document'}
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '10%' }} />
              </div>
            </Card>
          )}

          {stage === 'error' && error && (
            <ErrorState
              title={error.code === 'needs-ocr' ? 'Scanned PDF detected' : 'Could not process the file'}
              message={error.message}
              onRetry={() => inputRef.current?.click()}
            />
          )}

          {stage === 'ready' && extraction && (
            <Card className="depth-card p-5 animate-fade-up">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span className="text-[14px] font-semibold">{extraction.fileName}</span>
                <Badge tone="slate">{(extraction.sizeBytes / 1024).toFixed(0)} KB</Badge>
                <Badge tone="slate">{extraction.pageCount} pages</Badge>
                <Badge tone={extraction.pagesWithText < extraction.pageCount ? 'amber' : 'emerald'}>{extraction.pagesWithText} with text</Badge>
                <button onClick={reset} className="ml-auto grid size-8 place-items-center rounded-md text-ink-muted hover:bg-muted" aria-label="Remove file">
                  <X className="size-4" />
                </button>
              </div>
              {extraction.pagesWithText < extraction.pageCount && (
                <p className="mt-2 text-[12px] text-amber-700">Some pages had no selectable text (possibly scanned). They were skipped; OCR is not configured.</p>
              )}
              <div className="mt-4">
                <div className="label-caps mb-1">Document preview</div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-surface p-3 font-mono text-[12px] leading-relaxed text-ink">{extraction.preview}{extraction.text.length > extraction.preview.length ? '\n…' : ''}</pre>
              </div>
              {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">{error.message}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="accent" size="lg" onClick={analyse} loading={analysing}>
                  <Sparkles className="size-4" /> Analyze Tender
                </Button>
                <Button variant="secondary" size="lg" onClick={reset}>
                  Choose another file
                </Button>
              </div>
            </Card>
          )}
        </div>

        <aside className="lg:col-span-2 space-y-3">
          <Card className="depth-card p-4">
            <div className="label-caps mb-2">Processing pipeline</div>
            <ol className="space-y-2 text-[13px]">
              {['PDF → text extraction (pdf.js, in-browser)', 'Document preview & validation', 'Requirement & standard-reference extraction', 'Chunking → embeddings → vector retrieval', 'Reranking, relationship expansion, evidence', 'Gap analysis & outdated-reference detection'].map((s, i) => (
                <li key={s} className="flex gap-2">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary font-mono text-[10px] text-primary-fg">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Card className="depth-card p-4 text-[12.5px] text-ink-muted">
            <div className="mb-1 flex items-center gap-2 font-semibold text-ink">
              <FileText className="size-4" /> Handled cases
            </div>
            Invalid file type · oversized file · empty document · corrupted or password-protected PDF · scanned PDF (OCR-ready port) · partial text pages.
          </Card>
        </aside>
      </div>
    </div>
  );
}
