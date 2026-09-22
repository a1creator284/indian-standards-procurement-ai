import type { Requirement, RequirementCategory } from '../types';
import { matchConcepts } from '../language/detect';
import { extractStandardReferences } from './references';

interface Rule {
  entity: string;
  category: RequirementCategory;
  pattern: RegExp;
  format: (m: RegExpMatchArray) => { value: string; unit?: string; text: string };
}

const RULES: Rule[] = [
  { entity: 'ingress protection', category: 'environmental', pattern: /\bIP\s?(\d{2})\b/gi, format: (m) => ({ value: `IP${m[1]}`, text: `Ingress protection rating IP${m[1]}` }) },
  { entity: 'impact protection', category: 'mechanical', pattern: /\bIK\s?(\d{2})\b/gi, format: (m) => ({ value: `IK${m[1]}`, text: `Impact protection rating IK${m[1]}` }) },
  { entity: 'rated power', category: 'electrical', pattern: /\b(\d+(?:\.\d+)?)\s?(kW|W|watts?|HP)\b(?!\/)/gi, format: (m) => ({ value: m[1], unit: normUnit(m[2]), text: `Rated power ${m[1]} ${normUnit(m[2])}` }) },
  { entity: 'rated voltage', category: 'electrical', pattern: /\b(\d+(?:\.\d+)?)\s?(kV|V)\s?(AC|DC)?\b/gi, format: (m) => ({ value: m[1], unit: m[2].toUpperCase() + (m[3] ? ` ${m[3].toUpperCase()}` : ''), text: `Rated voltage ${m[1]} ${m[2].toUpperCase()}${m[3] ? ' ' + m[3].toUpperCase() : ''}` }) },
  { entity: 'rated current', category: 'electrical', pattern: /\b(\d+(?:\.\d+)?)\s?A\b(?!\w)/g, format: (m) => ({ value: m[1], unit: 'A', text: `Rated current ${m[1]} A` }) },
  { entity: 'luminous efficacy', category: 'performance', pattern: /\b(\d+(?:\.\d+)?)\s?lm\s?\/\s?W\b/gi, format: (m) => ({ value: m[1], unit: 'lm/W', text: `Luminous efficacy ${m[1]} lm/W` }) },
  { entity: 'luminous flux', category: 'performance', pattern: /\b(\d[\d,]*)\s?(lm|lumens?)\b(?!\s?\/)/gi, format: (m) => ({ value: m[1].replace(/,/g, ''), unit: 'lm', text: `Luminous flux ${m[1]} lm` }) },
  { entity: 'colour temperature', category: 'performance', pattern: /\b(\d{4})\s?K\b/g, format: (m) => ({ value: m[1], unit: 'K', text: `Correlated colour temperature ${m[1]} K` }) },
  { entity: 'colour rendering index', category: 'performance', pattern: /\bCRI\s?(?:[>≥]=?|of|min(?:imum)?)?\s?(\d{2})\b/gi, format: (m) => ({ value: m[1], text: `Colour rendering index ≥ ${m[1]}` }) },
  { entity: 'power factor', category: 'performance', pattern: /\b(?:power\s?factor|PF)\s?(?:[>≥]=?|of|min(?:imum)?)?\s?(0\.\d+)\b/gi, format: (m) => ({ value: m[1], text: `Power factor ≥ ${m[1]}` }) },
  { entity: 'harmonic distortion', category: 'performance', pattern: /\bTHD\s?(?:[<≤]=?|of|max(?:imum)?)?\s?(\d+)\s?%/gi, format: (m) => ({ value: `${m[1]}%`, text: `Total harmonic distortion ≤ ${m[1]}%` }) },
  { entity: 'surge protection', category: 'safety', pattern: /\b(\d+(?:\.\d+)?)\s?kV\s?(?:surge|SPD|surge protection)/gi, format: (m) => ({ value: m[1], unit: 'kV', text: `Surge protection ${m[1]} kV` }) },
  { entity: 'rated life', category: 'performance', pattern: /\b(\d[\d,]*)\s?(hours|hrs|h)\b/gi, format: (m) => ({ value: m[1].replace(/,/g, ''), unit: 'h', text: `Rated life ${m[1]} hours` }) },
  { entity: 'warranty', category: 'warranty', pattern: /\b(\d+)\s?(?:years?|yrs?)\s?(?:warranty|guarantee)|\b(?:warranty|guarantee)\s?(?:of|period)?\s?(\d+)\s?(?:years?|yrs?)/gi, format: (m) => ({ value: m[1] ?? m[2], unit: 'years', text: `Warranty ${m[1] ?? m[2]} years` }) },
  { entity: 'operating temperature', category: 'environmental', pattern: /(-?\d+)\s?(?:°|deg)?\s?C?\s?(?:to|-)\s?\+?(\d+)\s?(?:°|deg)\s?C/gi, format: (m) => ({ value: `${m[1]} to ${m[2]}`, unit: '°C', text: `Operating temperature ${m[1]} to ${m[2]} °C` }) },
  { entity: 'conductor size', category: 'dimensional', pattern: /\b(\d+(?:\.\d+)?)\s?(?:sq\.?\s?mm|sqmm|mm2|mm²)\b/gi, format: (m) => ({ value: m[1], unit: 'sq mm', text: `Conductor size ${m[1]} sq mm` }) },
  { entity: 'pressure rating', category: 'performance', pattern: /\b(\d+(?:\.\d+)?)\s?(kgf\/cm2|kg\/cm2|bar|MPa|PN)\b/gi, format: (m) => ({ value: m[1], unit: m[2], text: `Pressure rating ${m[1]} ${m[2]}` }) },
  { entity: 'flow / discharge', category: 'performance', pattern: /\b(\d+(?:\.\d+)?)\s?(lpm|lps|m3\/h|m³\/h|litres?\/min)\b/gi, format: (m) => ({ value: m[1], unit: m[2], text: `Discharge ${m[1]} ${m[2]}` }) },
  { entity: 'head', category: 'performance', pattern: /\bhead\s?(?:of)?\s?(\d+(?:\.\d+)?)\s?(m|metres?|meters?)\b/gi, format: (m) => ({ value: m[1], unit: 'm', text: `Head ${m[1]} m` }) },
  { entity: 'solar capacity', category: 'performance', pattern: /\b(\d+(?:\.\d+)?)\s?(kWp|Wp|MWp)\b/gi, format: (m) => ({ value: m[1], unit: m[2], text: `PV capacity ${m[1]} ${m[2]}` }) },
  { entity: 'transformer rating', category: 'electrical', pattern: /\b(\d+(?:\.\d+)?)\s?(kVA|MVA)\b/gi, format: (m) => ({ value: m[1], unit: m[2], text: `Rating ${m[1]} ${m[2]}` }) },
  { entity: 'concrete grade', category: 'material', pattern: /\bM\s?(15|20|25|30|35|40|45|50)\b/g, format: (m) => ({ value: `M${m[1]}`, text: `Concrete grade M${m[1]}` }) },
  { entity: 'steel grade', category: 'material', pattern: /\b(Fe\s?(?:415|500|550|600)D?|E\s?(?:250|350|410|450))\b/gi, format: (m) => ({ value: m[1].replace(/\s+/g, ' '), text: `Steel grade ${m[1].replace(/\s+/g, ' ')}` }) },
  { entity: 'efficiency class', category: 'performance', pattern: /\b(IE[1-5])\b/gi, format: (m) => ({ value: m[1].toUpperCase(), text: `Motor efficiency class ${m[1].toUpperCase()}` }) },
  { entity: 'accuracy class', category: 'performance', pattern: /\b(?:accuracy\s?)?class\s?(0\.[25]s?|1(?:\.0)?|2(?:\.0)?)\b/gi, format: (m) => ({ value: m[1], text: `Accuracy class ${m[1]}` }) },
  { entity: 'quantity', category: 'quantity', pattern: /\b(\d[\d,]*)\s?(nos\.?|numbers|units|pcs|pieces|km|sets?)\b/gi, format: (m) => ({ value: m[1].replace(/,/g, ''), unit: m[2].toLowerCase(), text: `Quantity ${m[1]} ${m[2].toLowerCase()}` }) },
  { entity: 'quantity', category: 'quantity', pattern: /\b(?:quantity|qty)\s*[:=-]?\s*(\d[\d,]*)\s?(m|metres?|meters?|mtrs?|rm|nos\.?|units|pcs)?\b/gi, format: (m) => ({ value: m[1].replace(/,/g, ''), unit: m[2]?.toLowerCase(), text: `Quantity ${m[1]}${m[2] ? ' ' + m[2].toLowerCase() : ''}` }) },
  { entity: 'mounting height', category: 'installation', pattern: /\b(?:mounting\s?height|pole\s?height|height)\s?(?:of)?\s?(\d+(?:\.\d+)?)\s?(m|metres?|meters?)\b/gi, format: (m) => ({ value: m[1], unit: 'm', text: `Mounting height ${m[1]} m` }) },
];

function normUnit(u: string): string {
  const l = u.toLowerCase();
  if (l === 'kw') return 'kW';
  if (l.startsWith('watt') || l === 'w') return 'W';
  if (l === 'hp') return 'HP';
  return u;
}

const AMBIGUOUS_PHRASES = [
  /\bas per (?:relevant|applicable) (?:is|indian standards?|standards?)\b/i,
  /\bgood quality\b/i,
  /\breputed (?:make|brand)\b/i,
  /\bor equivalent\b/i,
  /\bsuitable (?:rating|capacity|size)\b/i,
  /\bstandard (?:make|quality)\b/i,
  /\betc\.?(?:\s|$)/i,
  /\bas required\b/i,
  /\bas directed\b/i,
];

/**
 * Rule-based requirement extraction. Deterministic and offline; an LLM provider
 * can add richer requirements on top (merged by the pipeline).
 */
export function extractRequirements(text: string): Requirement[] {
  const out: Requirement[] = [];
  const seen = new Set<string>();
  let n = 0;
  const push = (r: Omit<Requirement, 'id'>) => {
    const key = `${r.category}|${r.entity ?? ''}|${r.value ?? r.text}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ id: `req-${++n}`, ...r });
  };

  // 1. Product / concept requirements from the lexicon
  const concepts = matchConcepts(text);
  for (const c of concepts) {
    if (['product', 'material', 'installation', 'testing', 'certification', 'safety', 'environmental', 'warranty', 'performance', 'mechanical'].includes(c.category)) {
      if (['tender', 'municipal', 'quantity', 'wattage', 'voltage', 'lifetime'].includes(c.id)) continue;
      push({
        text: c.category === 'product' ? `Product: ${c.canonical}` : `${capitalize(c.category)}: ${c.canonical}`,
        category: c.category,
        entity: c.canonical,
        confidence: c.category === 'product' ? 0.85 : 0.7,
      });
    }
  }

  // 2. Parameter rules
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.pattern)) {
      const f = rule.format(m);
      if (!f.value) continue;
      push({ ...f, category: rule.category, entity: rule.entity, confidence: 0.9, sourceSpan: m[0] });
    }
  }

  // 3. Referenced standards
  for (const ref of extractStandardReferences(text)) {
    push({ text: `References ${ref.text}`, category: 'reference', entity: 'standard reference', value: ref.text, confidence: 0.95, sourceSpan: ref.text });
  }

  // 4. Ambiguous phrases
  for (const p of AMBIGUOUS_PHRASES) {
    const m = text.match(p);
    if (m) push({ text: `Ambiguous wording: "${m[0].trim()}"`, category: 'other', entity: 'ambiguous phrase', value: m[0].trim(), confidence: 0.6, sourceSpan: m[0] });
  }

  // Drop concept-only entries when a parameter rule produced a valued requirement for the same entity
  // (e.g. "Warranty: warranty" alongside "Warranty 1 years").
  return out.filter((r) => r.value !== undefined || !out.some((o) => o !== r && o.value !== undefined && o.entity === r.entity));
}

export function mergeRequirements(base: Requirement[], extra: Requirement[]): Requirement[] {
  const aiProducts = extra.filter((r) => r.category === 'product');
  const otherExtra = extra.filter((r) => r.category !== 'product');

  const merged: Requirement[] = [];
  const keys = new Set<string>();

  // 1. AI-extracted products take highest precedence
  for (const r of aiProducts) {
    const key = `${r.category}|${(r.value ?? r.text).toLowerCase()}`;
    if (!keys.has(key)) {
      keys.add(key);
      merged.push({ ...r, id: `req-${merged.length + 1}` });
    }
  }

  // 2. Base requirements (drop rule-based product guesses if AI already identified the product)
  for (const r of base) {
    if (aiProducts.length > 0 && r.category === 'product') {
      const matchesAi = aiProducts.some((a) => similarText(a.text, r.text));
      if (!matchesAi) continue;
    }
    const key = `${r.category}|${(r.value ?? r.text).toLowerCase()}`;
    if (keys.has(key)) continue;
    if (merged.some((m) => similarText(m.text, r.text))) continue;
    keys.add(key);
    merged.push({ ...r, id: `req-${merged.length + 1}` });
  }

  // 3. Other extra (LLM non-product requirements)
  for (const r of otherExtra) {
    const key = `${r.category}|${(r.value ?? r.text).toLowerCase()}`;
    if (keys.has(key)) continue;
    if (merged.some((m) => similarText(m.text, r.text))) continue;
    keys.add(key);
    merged.push({ ...r, id: `req-${merged.length + 1}` });
  }

  return merged;
}

function similarText(a: string, b: string): boolean {
  const x = a.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const y = b.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return x === y || x.includes(y) || y.includes(x);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
