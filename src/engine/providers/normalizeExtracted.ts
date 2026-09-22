import type { Requirement, RequirementCategory } from '../types';

const CATEGORIES: RequirementCategory[] = [
  'product', 'performance', 'electrical', 'environmental', 'safety', 'mechanical', 'material',
  'installation', 'testing', 'certification', 'dimensional', 'quantity', 'warranty', 'reference', 'other',
];

/** Validates and normalises requirement objects returned by an LLM. */
export function normalizeExtracted(raw: unknown): Requirement[] {
  if (!Array.isArray(raw)) return [];
  const out: Requirement[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== 'object') return;
    const r = item as Record<string, unknown>;
    const text = typeof r.text === 'string' ? r.text.trim() : '';
    if (!text) return;
    const category = CATEGORIES.includes(r.category as RequirementCategory) ? (r.category as RequirementCategory) : 'other';
    const confidence = typeof r.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : 0.7;
    out.push({
      id: `llm-${i}`,
      text: text.slice(0, 300),
      category,
      entity: typeof r.entity === 'string' ? r.entity.slice(0, 80) : undefined,
      value: typeof r.value === 'string' ? r.value.slice(0, 80) : undefined,
      unit: typeof r.unit === 'string' ? r.unit.slice(0, 20) : undefined,
      confidence,
      sourceSpan: typeof r.sourceSpan === 'string' ? r.sourceSpan.slice(0, 200) : undefined,
    });
  });
  return out;
}
