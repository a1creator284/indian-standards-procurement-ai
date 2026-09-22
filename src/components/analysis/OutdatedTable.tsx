import { History } from 'lucide-react';
import type { OutdatedReference } from '@/engine/types';
import { Badge, EmptyState } from '@/components/ui';
import { OUTDATED_LABELS } from './labels';

export function OutdatedTable({ items, onOpenStandard }: { items: OutdatedReference[]; onOpenStandard: (id: string) => void }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={<History className="size-5" />}
        title="No standard references found in the input"
        description="Paste a tender clause that cites standards (e.g. “as per IS 694:1990”) to check references against the indexed editions."
      />
    );
  }
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-[13px]">
        <thead className="bg-surface text-left">
          <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:label-caps">
            <th>Reference in input</th>
            <th>Status</th>
            <th>Current indexed edition</th>
            <th>Evidence</th>
            <th>Recommended review action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o, i) => {
            const st = OUTDATED_LABELS[o.status];
            return (
              <tr key={i} className="border-t border-line align-top [&>td]:px-4 [&>td]:py-3">
                <td className="font-mono font-medium whitespace-nowrap">{o.referenceText}</td>
                <td>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </td>
                <td>
                  {o.standardId ? (
                    <button onClick={() => onOpenStandard(o.standardId!)} className="text-left font-medium text-primary hover:underline">
                      {o.indexedLatestLabel}
                    </button>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
                <td className="text-ink-muted max-w-xs">{o.evidence}</td>
                <td className="max-w-xs">{o.recommendedAction}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">
        Status is relative to the indexed dataset only. It does not confirm official currency — verify with the BIS catalogue.
      </p>
    </div>
  );
}
