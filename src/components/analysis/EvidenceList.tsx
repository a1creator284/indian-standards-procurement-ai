import { Database, Quote } from 'lucide-react';
import type { Evidence, SourceMeta } from '@/engine/types';
import { Badge } from '@/components/ui';
import { formatDate } from './labels';

const FIELD_LABELS: Record<Evidence['field'], string> = {
  title: 'Title',
  scope: 'Scope summary',
  keywords: 'Keywords',
  productTypes: 'Product types',
  relationship: 'Relationship',
  certification: 'Certification',
  version: 'Version',
};

export function SourceBadge({ source }: { source: SourceMeta }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-[12px] text-ink-muted">
      <Database className="size-3.5" />
      <span className="font-medium text-ink">{source.name}</span>
      <Badge tone={source.type === 'demo-dataset' ? 'amber' : 'emerald'}>{source.type === 'demo-dataset' ? 'Demo Dataset' : source.type}</Badge>
      <span>indexed {formatDate(source.indexedAt)}</span>
    </span>
  );
}

export function EvidenceList({ evidence, source }: { evidence: Evidence[]; source: SourceMeta }) {
  return (
    <div className="space-y-2">
      <SourceBadge source={source} />
      {evidence.length ? (
        <ul className="space-y-1.5">
          {evidence.map((e) => (
            <li key={e.id} className="flex gap-2 rounded-lg border border-line bg-surface-raised p-2.5 text-[13px]">
              <Quote className="size-3.5 mt-0.5 shrink-0 text-primary/50" />
              <div className="min-w-0 flex-1">
                <span className="text-ink">{e.snippet}</span>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-muted">
                  <span>Field: {FIELD_LABELS[e.field]}</span>
                  <span>·</span>
                  <span>Evidence strength {Math.round(e.score * 100)}%</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-ink-muted">No evidence snippets beyond the indexed title.</p>
      )}
      {source.note && <p className="text-[11px] text-ink-muted">{source.note}</p>}
    </div>
  );
}
