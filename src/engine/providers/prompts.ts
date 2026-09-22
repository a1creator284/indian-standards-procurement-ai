import type { Requirement } from '../types';
import type { RerankCandidate } from './types';

/**
 * Shared prompt builders used by every live LLM provider so that behaviour is
 * consistent regardless of vendor. All prompts insist on grounding: the model
 * may only use the indexed metadata supplied in the prompt.
 */

export const GROUNDING_SYSTEM =
  'You are IS Copilot, an assistant that helps Indian procurement officers identify potentially ' +
  'applicable Indian Standards. You must ONLY use the indexed standard metadata provided in the prompt. ' +
  'Never invent standard numbers, titles, editions, amendments, certification requirements or legal obligations. ' +
  'If the provided data does not support a claim, say so explicitly. Use cautious wording such as ' +
  '"potentially applicable" and "based on indexed metadata". Respond in the language requested.';

export function buildRerankPrompt(query: string, requirements: Requirement[], candidates: RerankCandidate[]): string {
  const reqs = requirements.map((r) => `- [${r.category}] ${r.text}`).join('\n') || '- (none extracted)';
  const cands = candidates
    .map(
      (c, i) =>
        `${i + 1}. id="${c.standard.id}" number="${c.standard.number}" title="${c.standard.title}"\n` +
        `   category=${c.standard.category} sector=${c.standard.sector} productTypes=${c.standard.productTypes.join('; ')}\n` +
        `   scope="${c.standard.scope}"\n   vectorScore=${c.semanticScore.toFixed(2)}`,
    )
    .join('\n');
  return (
    `Procurement input:\n"""${query}"""\n\nExtracted requirements:\n${reqs}\n\n` +
    `Candidate standards (from vector retrieval):\n${cands}\n\n` +
    'Score each candidate 0.0–1.0 for how applicable it is to the procurement input, using ONLY the metadata above. ' +
    'Give 1–3 short reasons per candidate that reference the input and the metadata. ' +
    'Return ONLY a JSON array: [{"standardId": string, "score": number, "reasons": string[]}].'
  );
}

export function buildExtractionPrompt(text: string): string {
  return (
    `Extract the technical procurement requirements from the following text. ` +
    `Categories: product, performance, electrical, environmental, safety, mechanical, material, installation, ` +
    `testing, certification, dimensional, quantity, warranty, reference, other.\n\n"""${text.slice(0, 12000)}"""\n\n` +
    'Return ONLY a JSON array of objects: {"text": string, "category": string, "entity"?: string, "value"?: string, ' +
    '"unit"?: string, "confidence": number 0..1, "sourceSpan"?: string}. Do not add requirements that are not in the text.'
  );
}

export function buildTranslationPrompt(text: string, sourceLanguage: string): string {
  return (
    `Translate the following ${sourceLanguage} procurement text into precise technical English. ` +
    `Keep all numbers, units, ratings and standard references unchanged. Return only the translation.\n\n"""${text}"""`
  );
}
