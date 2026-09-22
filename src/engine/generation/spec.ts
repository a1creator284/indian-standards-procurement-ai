import type { AnalysisResult, GeneratedSpec, GeneratedSpecSection } from '../types';
import type { LLMProvider } from '../providers/types';
import { GROUNDING_SYSTEM } from '../providers/prompts';
import type { RELATIONSHIP_LABELS } from '../graph/expand';
import { APPLICABILITY_LABELS, NO_CERTIFICATION_MESSAGE } from '../analysis/certifications';

export const SPEC_DISCLAIMER =
  'AI-generated draft. Verify against the latest authoritative sources before procurement use. ' +
  'Standard numbers, editions and certification statements are based on indexed metadata and are not legally authoritative.';

/**
 * Builds a standards-ready specification draft from an analysis result.
 * Demo mode uses deterministic templates; a live LLM may refine wording but is
 * constrained to the standards present in the analysis.
 */
export async function generateSpecification(analysis: AnalysisResult, llm: LLMProvider): Promise<GeneratedSpec> {
  const sections = buildTemplateSections(analysis);

  if (llm.isLive) {
    try {
      const refined = await llm.generate({
        system: GROUNDING_SYSTEM,
        user:
          'Rewrite the following procurement specification sections into clear, formal tender language. ' +
          'Keep every standard number exactly as given; do not add standards, editions or certification claims that are not listed. ' +
          'Keep the same section ids and titles. Return ONLY JSON: [{"id": string, "title": string, "content": markdown string}].\n\n' +
          JSON.stringify(sections),
        maxTokens: 6000,
        json: true,
      });
      const { parseJsonLoose } = await import('../providers/types');
      const parsed = parseJsonLoose<GeneratedSpecSection[]>(refined);
      const allowed = new Set([...analysis.recommendations, ...analysis.related].map((r) => r.standard.number));
      const safe = Array.isArray(parsed) && parsed.length === sections.length && parsed.every((s) => typeof s.content === 'string' && !mentionsUnknownStandard(s.content, allowed));
      if (safe) {
        return { id: crypto.randomUUID(), analysisId: analysis.id, createdAt: new Date().toISOString(), title: specTitle(analysis), sections: parsed, disclaimer: SPEC_DISCLAIMER, mode: 'live' };
      }
    } catch {
      /* fall back to template */
    }
  }

  return { id: crypto.randomUUID(), analysisId: analysis.id, createdAt: new Date().toISOString(), title: specTitle(analysis), sections, disclaimer: SPEC_DISCLAIMER, mode: 'demo' };
}

function specTitle(a: AnalysisResult): string {
  return `Technical Specification — ${a.summary.productDescription}`;
}

function mentionsUnknownStandard(content: string, allowed: Set<string>): boolean {
  const found = content.match(/\bIS(?:\/IEC)?\s*\d{2,6}(?:\s*\(Part\s*\d+(?:\/Sec\s*\d+)?\))?/gi) ?? [];
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const allowedNorm = new Set([...allowed].map(norm));
  return found.some((f) => ![...allowedNorm].some((a) => a.startsWith(norm(f))));
}

export function buildTemplateSections(a: AnalysisResult): GeneratedSpecSection[] {
  const primaries = a.recommendations;
  const byCat = (cat: string) => a.requirements.filter((r) => r.category === cat);
  const bullet = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join('\n') : '- _Not specified in the analysed input — to be defined by the procurement officer._');
  const relOf = (type: keyof typeof RELATIONSHIP_LABELS) => {
    const seen = new Map<string, string>();
    for (const p of primaries) for (const r of p.relationships) if (r.type === type) seen.set(r.standard.id, `${r.standard.number} — ${r.standard.title}`);
    return [...seen.values()];
  };
  const reqLines = (cats: string[]) =>
    cats.flatMap(byCat).map((r) => `${r.text}${r.sourceSpan && r.sourceSpan !== r.text ? ` (from input: "${r.sourceSpan}")` : ''}`);

  const applicable = primaries.map((p) => `${p.standard.number} — ${p.standard.title} _(latest indexed: ${p.standard.latestVersion.label}; AI confidence ${p.confidence.total}/100)_`);
  const testing = relOf('test_method');
  const safety = relOf('safety');
  const installation = relOf('installation');
  const references = [...new Set([...relOf('normative_reference'), ...relOf('terminology'), ...relOf('allied'), ...relOf('related_product')])];
  const certs = a.certifications.filter((c) => primaries.some((p) => p.standard.id === c.standardId));

  const notes: string[] = [
    'All standard references are AI recommendations based on indexed metadata and must be verified against the current BIS catalogue, including amendments.',
    ...a.gaps.slice(0, 6).map((g) => `${g.issue}: ${g.suggestedAction}`),
    ...a.outdated.filter((o) => o.status === 'potentially-outdated' || o.status === 'superseded').map((o) => `Reference "${o.referenceText}": ${o.recommendedAction}`),
  ];
  if (a.input.language !== 'en') notes.push(`The input was provided in ${a.input.language === 'hi' ? 'Hindi' : 'Hinglish'} and normalised to English for analysis; confirm intent with the requesting officer.`);

  return [
    { id: 'description', title: '1. Product / Service Description', content: `${a.summary.productDescription}\n\n**Source input:** ${a.input.original.length > 500 ? a.input.original.slice(0, 500) + '…' : a.input.original}` },
    { id: 'technical', title: '2. Technical Requirements', content: bullet(reqLines(['performance', 'electrical', 'environmental', 'mechanical', 'material', 'dimensional', 'quantity', 'warranty'])) },
    { id: 'standards', title: '3. Applicable Standards (AI-recommended)', content: bullet(applicable) + '\n\nThe supplied items shall conform to the latest edition of the standards listed above, including all amendments, subject to verification by the procurement officer.' },
    { id: 'testing', title: '4. Testing Requirements', content: bullet(testing.length ? testing.map((t) => `Tests as per ${t}`) : []) + '\n\nType test reports from a NABL-accredited laboratory and routine test certificates should be furnished with supply.' },
    { id: 'safety', title: '5. Safety Considerations', content: bullet([...reqLines(['safety']), ...safety.map((s) => `Safety requirements as per ${s}`)]) },
    { id: 'certification', title: '6. Certification Information', content: certs.length ? bullet(certs.map((c) => `${c.standardNumber}: ${c.certification.name} — ${APPLICABILITY_LABELS[c.applicability]}. Evidence: ${c.evidence}`)) : `- ${NO_CERTIFICATION_MESSAGE}` },
    { id: 'installation', title: '7. Installation Requirements', content: bullet([...reqLines(['installation']), ...installation.map((s) => `Installation practice as per ${s}`)]) },
    { id: 'references', title: '8. Reference Standards', content: bullet(references) },
    { id: 'notes', title: '9. Notes Requiring Procurement-Officer Review', content: bullet(notes) },
  ];
}

export function specToMarkdown(spec: GeneratedSpec): string {
  return [`# ${spec.title}`, `_${spec.disclaimer}_`, '', ...spec.sections.map((s) => `## ${s.title}\n\n${s.content}\n`), `---\n_Generated by IS Copilot on ${new Date(spec.createdAt).toLocaleString()} (${spec.mode} mode)._`].join('\n');
}
