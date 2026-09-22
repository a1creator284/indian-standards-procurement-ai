import { analyze, MemoryStandardsRepository, loadDemoDataset, DemoLLMProvider, LocalEmbeddingProvider } from '../src/engine/index';

const q = process.argv.slice(2).join(' ') || 'LED street lighting system for municipal roads, 120W, IP66, outdoor installation';
const emb = new LocalEmbeddingProvider();
const repo = new MemoryStandardsRepository(loadDemoDataset(), emb);
const r = await analyze({ text: q }, { repo, ai: { llm: new DemoLLMProvider(), embeddings: emb } });
console.log('LANG', r.input.language, '| normalized:', r.input.normalized);
console.log('REQS', r.requirements.map((x) => `${x.category}:${x.text}`).join(' | '));
console.log('PRIMARY');
for (const p of r.recommendations) console.log(`  ${p.confidence.total} ${p.confidence.band} ${p.standard.number} — ${p.standard.title.slice(0, 60)}`);
console.log('RELATED', r.related.slice(0, 8).map((x) => `${x.standard.number}(${x.confidence.total})`).join(', '));
console.log('CERTS', r.certifications.filter(c=>r.recommendations.some(p=>p.standard.id===c.standardId)).map((c) => `${c.standardNumber}:${c.certification.scheme}`).join(', '));
console.log('GAPS', r.gaps.map((g) => `${g.severity}:${g.type}`).join(', '));
console.log('OUTDATED', r.outdated.map((o) => `${o.referenceText}=${o.status}`).join(', '));
console.log('GRAPH', r.graph.nodes.length, 'nodes', r.graph.edges.length, 'edges');
console.log('TIMINGS', r.timingsMs);
