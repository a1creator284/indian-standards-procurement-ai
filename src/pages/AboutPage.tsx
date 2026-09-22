import { Braces, FileSearch, Network, ShieldAlert, Sparkles, Wand2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useApp } from '@/context/AppContext';
import { Badge, Card } from '@/components/ui';

const PIPELINE = [
  { icon: FileSearch, label: 'Requirement extraction', text: 'Entities, ratings, references and ambiguous wording pulled from text or PDF.' },
  { icon: Braces, label: 'Semantic retrieval', text: 'Embeddings + pgvector nearest-neighbour search with metadata filtering.' },
  { icon: Wand2, label: 'LLM reranking', text: 'Candidates re-scored against your requirements with a transparent confidence model.' },
  { icon: Network, label: 'Relationship expansion', text: 'Normative references, test methods, safety, installation and allied standards.' },
  { icon: ShieldAlert, label: 'Gap & outdated detection', text: 'Missing clauses, superseded editions and certification mappings surfaced with evidence.' },
];

export function AboutPage() {
  const { status } = useApp();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="About"
        title="IS Copilot"
        description="AI-Powered Recommendation Engine for Identifying Applicable Indian Standards for Procurement Specifications."
      />

      <Card className="depth-card relative overflow-hidden p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid size-10 place-items-center rounded-xl bg-muted text-ink">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Smart India Hackathon 2026</h2>
            <p className="text-[13px] text-ink-muted">Problem Statement SIH26108</p>
          </div>
        </div>
        <p className="text-[14px] text-ink-muted leading-relaxed">
          IS Copilot reads a product description or tender, understands it semantically, and connects it to primary,
          allied and normative Indian Standards — with confidence scores, evidence, gap analysis, certification mappings,
          and a standards-ready specification draft.
        </p>
      </Card>

      <div>
        <h2 className="mb-3 text-base font-semibold">How It Works</h2>
        <Card className="depth-card divide-y divide-line">
          {PIPELINE.map((p, i) => (
            <div key={p.label} className="flex gap-3 p-4">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-fg">
                <p.icon className="size-4" />
              </div>
              <div>
                <div className="text-[13px] font-semibold">
                  <span className="mr-1.5 font-mono text-ink-muted">{i + 1}.</span>
                  {p.label}
                </div>
                <div className="text-[12.5px] text-ink-muted">{p.text}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {status && (
        <Card className="depth-card p-5">
          <h2 className="text-base font-semibold mb-3">System Status</h2>
          <dl className="grid gap-3 sm:grid-cols-2 text-[13px]">
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Mode</dt>
              <dd><Badge tone={status.mode === 'live' ? 'emerald' : 'amber'}>{status.mode === 'live' ? 'Live AI' : 'Demo mode'}</Badge></dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">LLM</dt>
              <dd className="font-mono truncate">{status.llm}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Embeddings</dt>
              <dd className="font-mono truncate">{status.embeddings}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Repository</dt>
              <dd className="font-mono truncate">{status.repository}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Standards indexed</dt>
              <dd className="font-mono">{status.dataset.standardCount}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Dataset</dt>
              <dd className="truncate">{status.dataset.name} v{status.dataset.version}</dd>
            </div>
          </dl>
        </Card>
      )}

      <Card className="depth-card flex items-start gap-3 p-4 text-[12.5px] text-ink-muted">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <span>
          IS Copilot is an AI assistance system, not a legal or regulatory authority.
          Recommendations are based on indexed metadata and must be verified against the
          authoritative BIS sources before procurement use.
        </span>
      </Card>

      {status && (
        <p className="text-[11.5px] text-ink-muted">
          <strong className="text-ink">Demo data notice:</strong> {status.dataset.disclaimer}
        </p>
      )}
    </div>
  );
}
