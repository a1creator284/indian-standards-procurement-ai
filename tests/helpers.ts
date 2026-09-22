import { MemoryStandardsRepository } from '../src/engine/repository/memoryRepository';
import { loadDemoDataset } from '../src/engine/repository/demoDataset';
import { DemoLLMProvider } from '../src/engine/providers/demo';
import { LocalEmbeddingProvider } from '../src/engine/providers/localEmbedding';
import { analyze } from '../src/engine/pipeline';
import type { AIProviders } from '../src/engine/providers/types';

export const LED_QUERY = 'LED street lighting system for municipal roads, 120W, IP66, outdoor installation';
export const CABLE_TENDER =
  'Supply of PVC insulated copper cables 2.5 sq mm as per IS 694:1990 and armoured XLPE cables 4 core 50 sqmm conforming to IS 7098 (Part 1):1988 and IS 13947. Switchgear of reputed make. Quantity 5000 m. 1 year warranty.';

export function demoDeps() {
  const embeddings = new LocalEmbeddingProvider();
  const repo = new MemoryStandardsRepository(loadDemoDataset(), embeddings);
  const ai: AIProviders = { llm: new DemoLLMProvider(), embeddings };
  return { repo, ai };
}

export function runDemoAnalysis(text: string, source: 'text' | 'paste' | 'pdf' = 'text') {
  const deps = demoDeps();
  return analyze({ text, source }, deps);
}
