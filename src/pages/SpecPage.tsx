import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Copy, Download, Eye, FileText, Pencil, Printer, RefreshCw, Sparkles } from 'lucide-react';
import type { GeneratedSpec } from '@/engine/types';
import { specToMarkdown } from '@/engine/generation/spec';
import { api, ApiError } from '@/services/api';
import { useAnalysisRoute } from '@/hooks/useAnalysisRoute';
import { PageHeader } from '@/components/PageHeader';
import { Badge, Button, Card, CardSkeleton, DisclaimerBar, EmptyState, ErrorState, cx } from '@/components/ui';
import { Markdown } from '@/components/ui/Markdown';

export function SpecPage() {
  const { analysis, loading } = useAnalysisRoute();
  const navigate = useNavigate();
  const [specState, setSpec] = useState<GeneratedSpec | null>(null);
  const spec = specState && specState.analysisId === analysis?.id ? specState : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!analysis) return;
    setBusy(true);
    setError(null);
    try {
      setSpec(await api.spec(analysis));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Specification generation failed.');
    } finally {
      setBusy(false);
    }
  };

  const update = (id: string, content: string) => setSpec((s) => (s ? { ...s, sections: s.sections.map((x) => (x.id === id ? { ...x, content } : x)) } : s));

  const download = () => {
    if (!spec) return;
    const blob = new Blob([specToMarkdown(spec)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spec.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    if (!spec) return;
    try {
      await navigator.clipboard.writeText(specToMarkdown(spec));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Clipboard access was blocked by the browser.');
    }
  };

  if (loading) return <CardSkeleton lines={6} />;
  if (!analysis) {
    return (
      <EmptyState
        icon={<FileText className="size-5" />}
        title="No analysis selected"
        description="Generate a standards-ready specification from an analysis: product description, technical requirements, applicable standards, testing, safety, certification, installation, references and review notes."
        action={
          <Button onClick={() => navigate('/analyze')}>
            <Sparkles className="size-4" /> Analyze a specification
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Tender generator"
        title="Standards-Ready Specification"
        description={`Draft built from the analysis of “${analysis.summary.productDescription}”. Every section is editable; export as Markdown, copy, or print to PDF.`}
        actions={
          spec ? (
            <>
              <Button variant="secondary" onClick={generate} loading={busy}>
                <RefreshCw className="size-4" /> Regenerate
              </Button>
              <Button variant="secondary" onClick={copy}>
                {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />} {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="size-4" /> Print / PDF
              </Button>
              <Button variant="accent" onClick={download}>
                <Download className="size-4" /> Download .md
              </Button>
            </>
          ) : null
        }
      />

      {error && <ErrorState message={error} onRetry={generate} />}

      {!spec && !busy && (
        <Card className="depth-card p-8 text-center animate-fade-up">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-saffron-50 text-saffron-600 dark:bg-saffron-900/20 dark:text-saffron-400">
            <FileText className="size-6" />
          </div>
          <h2 className="mt-3 text-lg font-semibold">Generate Standards-Ready Specification</h2>
          <p className="mx-auto mt-1 max-w-xl text-[13.5px] text-ink-muted">
            Assembles {analysis.recommendations.length} recommended standard(s), {analysis.related.length} related standard(s), {analysis.certifications.length} certification mapping(s) and {analysis.gaps.length} review note(s) into a nine-section tender specification draft.
          </p>
          <Button variant="accent" size="lg" className="mt-5" onClick={generate}>
            <Sparkles className="size-4" /> Generate specification
          </Button>
        </Card>
      )}

      {busy && !spec && (
        <div className="space-y-3">
          <CardSkeleton lines={2} />
          <CardSkeleton lines={4} />
          <CardSkeleton lines={3} />
        </div>
      )}

      {spec && (
        <div className="space-y-4 print:space-y-2" id="spec-document">
          <DisclaimerBar text={spec.disclaimer} />
          <Card className="depth-card p-6 print:border-0 print:shadow-none">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{spec.title}</h2>
              <Badge tone={spec.mode === 'live' ? 'emerald' : 'amber'}>{spec.mode === 'live' ? 'LLM-refined' : 'Template (demo)'}</Badge>
            </div>
            <div className="mt-1 text-[12px] text-ink-muted">Generated {new Date(spec.createdAt).toLocaleString()} · analysis {spec.analysisId.slice(0, 8)}</div>
          </Card>
          {spec.sections.map((s) => (
            <Card key={s.id} className="depth-card p-5 print:border-0 print:shadow-none animate-fade-up">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-semibold">{s.title}</h3>
                <button
                  onClick={() => setEditing(editing === s.id ? null : s.id)}
                  className={cx('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium print:hidden', editing === s.id ? 'bg-primary text-primary-fg' : 'text-primary hover:bg-muted')}
                >
                  {editing === s.id ? (
                    <>
                      <Eye className="size-3.5" /> Preview
                    </>
                  ) : (
                    <>
                      <Pencil className="size-3.5" /> Edit
                    </>
                  )}
                </button>
              </div>
              {editing === s.id ? (
                <textarea value={s.content} onChange={(e) => update(s.id, e.target.value)} rows={Math.max(4, s.content.split('\n').length + 1)} className="w-full rounded-lg border border-line bg-surface-sunken p-3 font-mono text-[12.5px] leading-relaxed outline-none focus:border-primary" aria-label={`Edit ${s.title}`} />
              ) : (
                <Markdown text={s.content} />
              )}
            </Card>
          ))}
          <p className="text-[11.5px] text-ink-muted print:block">{spec.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
