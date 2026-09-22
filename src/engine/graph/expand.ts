import type { ExpandedRelationship, GraphEdge, GraphNode, KnowledgeGraph, RelationshipType, Standard, StandardRelationship, CertificationFinding } from '../types';
import type { StandardsRepository } from '../repository/types';

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  normative_reference: 'Normative reference',
  test_method: 'Test method',
  terminology: 'Terminology',
  safety: 'Safety standard',
  installation: 'Installation / practice',
  related_product: 'Related product standard',
  allied: 'Allied standard',
  superseded_by: 'Superseded by',
  part_of: 'Part of',
};

/**
 * Expands relationships for a set of primary standards (one hop, both directions).
 * Returns per-standard expanded relationships plus the union of related standards.
 */
export async function expandRelationships(
  primaries: Standard[],
  repo: StandardsRepository,
): Promise<{ byStandard: Map<string, ExpandedRelationship[]>; related: Map<string, Standard>; relationships: StandardRelationship[] }> {
  const ids = primaries.map((p) => p.id);
  const rels = await repo.getRelationshipsFor(ids);
  const neighbourIds = new Set<string>();
  for (const r of rels) {
    neighbourIds.add(r.from);
    neighbourIds.add(r.to);
  }
  for (const id of ids) neighbourIds.delete(id);
  const neighbours = await repo.getStandards([...neighbourIds]);
  const byId = new Map<string, Standard>([...primaries, ...neighbours].map((s) => [s.id, s]));

  const byStandard = new Map<string, ExpandedRelationship[]>();
  for (const p of primaries) {
    const list: ExpandedRelationship[] = [];
    for (const r of rels) {
      if (r.from === p.id && byId.has(r.to)) list.push({ type: r.type, standard: byId.get(r.to)!, note: r.note, direction: 'outgoing' });
      else if (r.to === p.id && byId.has(r.from)) {
        // Only surface meaningful incoming links (e.g. a standard that supersedes this one, or uses it)
        if (r.type === 'superseded_by') list.push({ type: r.type, standard: byId.get(r.from)!, note: `Supersedes ${byId.get(r.from)!.number}`, direction: 'incoming' });
        else list.push({ type: r.type, standard: byId.get(r.from)!, note: r.note, direction: 'incoming' });
      }
    }
    byStandard.set(p.id, dedupe(list));
  }

  const related = new Map<string, Standard>();
  for (const n of neighbours) related.set(n.id, n);
  return { byStandard, related, relationships: rels };
}

function dedupe(list: ExpandedRelationship[]): ExpandedRelationship[] {
  const seen = new Set<string>();
  return list.filter((r) => {
    const key = `${r.type}|${r.standard.id}|${r.direction}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Builds the product → primary → related → certification graph for visualisation. */
export function buildKnowledgeGraph(
  productLabel: string,
  primaries: Standard[],
  byStandard: Map<string, ExpandedRelationship[]>,
  certifications: CertificationFinding[],
): KnowledgeGraph {
  const nodes: GraphNode[] = [{ id: 'product', label: productLabel, kind: 'product' }];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set(['product']);

  for (const p of primaries) {
    nodes.push({ id: p.id, label: p.number, sublabel: p.title, kind: 'primary', category: p.category, standardId: p.id });
    nodeIds.add(p.id);
    edges.push({ id: `e-product-${p.id}`, source: 'product', target: p.id, type: 'recommends', label: 'Recommended' });
  }

  for (const p of primaries) {
    for (const r of byStandard.get(p.id) ?? []) {
      const s = r.standard;
      if (!nodeIds.has(s.id)) {
        nodes.push({ id: s.id, label: s.number, sublabel: s.title, kind: 'related', category: s.category, standardId: s.id });
        nodeIds.add(s.id);
      }
      const [src, tgt] = r.direction === 'outgoing' ? [p.id, s.id] : [s.id, p.id];
      const id = `e-${src}-${tgt}-${r.type}`;
      if (!edges.some((e) => e.id === id)) edges.push({ id, source: src, target: tgt, type: r.type, label: RELATIONSHIP_LABELS[r.type] });
    }
  }

  const certNodes = new Map<string, GraphNode>();
  for (const c of certifications) {
    if (!nodeIds.has(c.standardId)) continue;
    const nid = `cert-${c.certification.id}`;
    if (!certNodes.has(nid)) {
      const node: GraphNode = { id: nid, label: c.certification.scheme, sublabel: c.certification.name, kind: 'certification' };
      certNodes.set(nid, node);
      nodes.push(node);
      nodeIds.add(nid);
    }
    const id = `e-${c.standardId}-${nid}`;
    if (!edges.some((e) => e.id === id)) edges.push({ id, source: c.standardId, target: nid, type: 'certifies', label: 'Certification mapping' });
  }

  return { nodes, edges };
}
