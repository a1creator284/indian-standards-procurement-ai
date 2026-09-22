# IS Copilot — AI-Powered Indian Standards Intelligence for Procurement

**Smart India Hackathon 2026 · Problem Statement SIH26108**
*AI-Powered Recommendation Engine for Identifying Applicable Indian Standards for Procurement Specifications*

IS Copilot turns an unstructured procurement requirement — a sentence, a pasted clause, a Hindi/Hinglish query or a tender PDF — into an explainable set of potentially applicable Indian Standards, their allied/normative ecosystem, certification mappings, a tender gap analysis, an outdated-reference check and a standards-ready specification draft.

> **Legal / factual safety.** IS Copilot is an AI *assistance* system, not a legal or regulatory authority. Every recommendation is labelled "AI Recommendation Confidence", is tied to indexed source metadata, and must be verified against the authoritative BIS sources before procurement use. The bundled dataset is a clearly-labelled **demo dataset** (see [Demo data limitations](#demo-data-limitations)).

---

## Contents

1. [Problem & solution](#problem--solution)
2. [60-second judge demo](#60-second-judge-demo)
3. [Features](#features)
4. [Architecture](#architecture)
5. [RAG pipeline](#rag-pipeline)
6. [Confidence model](#confidence-model)
7. [Database architecture](#database-architecture)
8. [Project structure](#project-structure)
9. [Getting started (demo mode)](#getting-started-demo-mode)
10. [Environment variables](#environment-variables)
11. [Supabase + pgvector setup](#supabase--pgvector-setup)
12. [Data ingestion](#data-ingestion)
13. [PDF workflow](#pdf-workflow)
14. [Testing, lint, build](#testing-lint-build)
15. [Deployment](#deployment)
16. [Security](#security)
17. [Demo data limitations](#demo-data-limitations)
18. [Limitations & future enhancements](#limitations--future-enhancements)

---

## Problem & solution

Procurement officers in government departments, PSUs and agencies must cite the correct Indian Standards in tenders, but face thousands of standards with overlapping scopes, allied test/safety/installation standards, superseded editions, amendments and certification schemes. Keyword search does not capture semantics ("waterproof" ≈ "IP66" ≈ "जलरोधक").

IS Copilot applies a **retrieval-augmented, evidence-grounded pipeline**:

```
Unstructured requirement (EN / HI / Hinglish / PDF)
  → requirement extraction → embeddings → vector retrieval → metadata filtering
  → LLM (or local) reranking → relationship expansion → evidence assembly
  → transparent confidence → certification lookup → outdated-reference check
  → gap analysis → explainable report → standards-ready specification
```

## 60-second judge demo

1. `npm install && npm run dev` → open <http://localhost:5173>.
2. On the **Dashboard**, click the example *LED street lighting* (or type
   `LED street lighting system for municipal roads, 120W, IP66, outdoor installation`).
3. Click **Analyze Standards**.
4. **Recommendations**: `IS 10322 (Part 5/Sec 3)` at *Very High* confidence with reasons, matched requirements, evidence, version freshness and 15 typed relationships; expand the card to see the confidence breakdown.
5. **Certification** tab → BIS CRS mapping recorded in the index (with evidence and "not a legal determination" note).
6. **Potential Gaps** tab → missing safety / test / certification clauses with *why it matters* and *suggested action*.
7. **Knowledge Graph** tab (or *Open graph*) → product → primary → normative / test / safety / installation / terminology / allied → certification; click nodes to focus.
8. **Generate Standards-Ready Specification** → nine editable sections, copy / download `.md` / print.
9. **Ask Copilot** → "Why was this standard recommended?", "What testing standards are related?" — answered from retrieved evidence with citations.
10. Try Hindi (`नगर निगम की सड़कों के लिए एलईडी स्ट्रीट लाइट, 120 वाट, जलरोधक`) or paste a clause citing `IS 694:1990` and `IS 13947` to see the **Outdated Reference** detector.

Everything above runs **without any API key** (demo mode).

## Features

| Feature | Where |
|---|---|
| Natural-language / pasted-spec analysis, English · Hindi · Hinglish | Dashboard, Analyze |
| Tender PDF upload (in-browser text extraction, OCR-ready port) | Upload Tender |
| Explainable recommendations: reasons, matched requirements, scope, version/amendments, evidence + source, freshness | Recommendations |
| Transparent **AI Recommendation Confidence** (6 weighted components, 4 bands) | Recommendations |
| Related / allied / normative / test / safety / installation / terminology standards | Recommendations, Graph |
| Interactive standards relationship graph (zoom, pan, focus, labels, inspector) | Relationship Graph |
| Tender gap analyzer (10 gap types, severity, evidence, suggested action) | Gap Analysis |
| Outdated-reference detector (older edition / superseded / newer than index / not indexed) | Gap Analysis, Recommendations |
| Certification section (BIS ISI / CRS / Hallmarking mappings from index only) | Recommendations |
| Standards-ready specification generator (editable, export Markdown, print) | Tender Specification |
| Evidence-grounded assistant (why / related / missing / outdated / testing / certification / search) | Ask Copilot |
| Standards Explorer (search, filters, sort, pagination, detail drawer) | Standards Explorer |
| Search history (localStorage; Supabase when configured) | Search History |
| Demo mode with zero credentials; live mode with Anthropic / OpenAI + OpenAI/Voyage embeddings + Supabase pgvector | `.env` |

## Architecture

```
┌────────────────────────── Browser (React 19 + Vite + Tailwind v4) ──────────────────────────┐
│ pages · components · React Flow graph · pdf.js extraction · localStorage history             │
└───────────────────────────────┬──────────────────────────────────────────────────────────────┘
                                │ fetch /api/*  (JSON, validated with zod, rate limited)
┌───────────────────────────────▼──────────────────────────────────────────────────────────────┐
│ API layer (framework-agnostic handlers in server/)                                            │
│   dev/preview: Vite middleware plugin      prod: Vercel function api/index.ts                 │
└───────────────────────────────┬──────────────────────────────────────────────────────────────┘
┌───────────────────────────────▼──────────────────────────────────────────────────────────────┐
│ Engine (src/engine — pure TypeScript, isomorphic, no secrets)                                 │
│   language · extraction · embeddings · retrieval · ranking · graph · analysis · generation    │
│   ports:  AIProvider (LLM)  ·  EmbeddingProvider  ·  StandardsRepository                      │
└──────┬────────────────────────────┬───────────────────────────────┬──────────────────────────┘
       │                            │                               │
  demo-local                  Anthropic / OpenAI         in-memory demo dataset  |  Supabase
  (rules + templates)         (server-side keys)         (data/demo/*.json)        (PostgreSQL + pgvector)
```

* **Ports & adapters.** The LLM, the embedding model and the standards store are interfaces (`src/engine/providers/types.ts`, `src/engine/repository/types.ts`). Swapping vendors is a one-line env change; the pipeline never depends on a specific vendor.
* **Graceful degradation.** Every AI call is optional: if the LLM rerank fails, retrieval-only ranking is used; if embeddings fail, full-text search is used; if Supabase is unreachable, the in-memory dataset is used. Warnings surface in `/api/status`.
* **Secrets stay server-side.** The browser only ever receives `mode`, provider *names* and dataset info.

## RAG pipeline

| Stage | Implementation |
|---|---|
| Text / PDF extraction | `src/services/pdf.ts` (pdf.js in the browser; OCR port `ocrProvider` left unconfigured) |
| Cleaning + chunking | `src/engine/text/clean.ts` (control chars, hyphenation, 900–1200 char overlapping chunks) |
| Language detection & normalisation | `src/engine/language/` — Devanagari/Hinglish detection, single-pass concept lexicon (EN/HI/Hinglish surface forms → canonical English), original preserved; live LLM translation when available |
| Requirement extraction | `src/engine/extraction/requirements.ts` — 30+ parameter rules (IP/IK, W, V, lm/W, CCT, CRI, PF, THD, surge, life, warranty, sq mm, grades, IE class, accuracy class, quantity…), concept requirements, standard references, ambiguous phrases; LLM extraction merged when live |
| Embeddings | `EmbeddingProvider`: `local` (deterministic hashed n-gram + concept features, 384 d) · `openai` · `voyage` |
| Vector retrieval + metadata filtering | `src/engine/retrieval/retrieve.ts` → `StandardsRepository.searchByVector` (in-memory cosine or `match_standards_ranked` pgvector RPC); sector inferred from concepts and applied as a soft boost; lexical fallback |
| Reranking | `src/engine/ranking/rerank.ts` — provider rerank (LLM JSON scores + reasons, or demo blend) fused with metadata overlap, requirement coverage, graph connectivity and evidence strength |
| Relationship expansion | `src/engine/graph/expand.ts` — one hop, both directions, typed (normative_reference, test_method, terminology, safety, installation, related_product, allied, superseded_by, part_of) |
| Evidence | `matchRequirements` — per-requirement snippets from title / scope / keywords / product types with source metadata and strength |
| Certification | `src/engine/analysis/certifications.ts` — indexed mappings only; otherwise "No verified certification mapping found in the indexed dataset." |
| Outdated references | `src/engine/analysis/outdated.ts` — parses `IS 694:1990`, `IS 10322 (Part 5/Sec 3) : 2012`, `IS/IEC 60529`…; statuses are relative to the index |
| Gap analysis | `src/engine/analysis/gaps.ts` — rule engine (missing standard / test / safety / installation / terminology / certification / performance parameters, ambiguous wording, incomplete fields, outdated references) with cautious wording |
| Report / spec / chat | `src/engine/pipeline.ts`, `generation/spec.ts`, `chat/answer.ts` — templates in demo mode; live LLM refines under a grounding system prompt and is rejected if it introduces unknown standards |

## Confidence model

`total = 100 × (0.35·semantic + 0.20·metadata + 0.10·category + 0.15·coverage + 0.10·relationship + 0.10·evidence)`

| Band | Score |
|---|---|
| Very High | ≥ 80 |
| High | 65–79 |
| Medium | 45–64 |
| Low | < 45 (shown under *Related*, never as primary) |

Displayed everywhere as **AI Recommendation Confidence** with a per-component breakdown. It is *not* an official BIS score.

## Database architecture

`supabase/migrations/0001_schema.sql` creates:

| Table | Purpose |
|---|---|
| `profiles` | user profile linked to `auth.users` |
| `standards` | core entity (number, title, category, sector, product types, scope, keywords, revision status, source, `is_demo`) |
| `standard_versions`, `standard_amendments` | edition history and amendment records (`is_placeholder` flag for demo records) |
| `standard_relationships` | typed graph edges (`relationship_type` enum) |
| `certifications`, `standard_certifications` | schemes (ISI / CRS / Hallmarking) and indexed mappings with applicability + evidence |
| `standard_embeddings` | pgvector `vector(1536)` chunks per standard, HNSW cosine index |
| `documents`, `document_chunks` | uploaded tender text and chunk embeddings |
| `analyses`, `analysis_requirements`, `recommendations`, `gap_findings`, `search_history` | persisted analysis reports |

`0002_functions_rls.sql` adds `match_standards` / `match_standards_ranked` (nearest-neighbour with sector/category filters), `search_standards_text` (full-text fallback) and Row Level Security (reference data public-read; user data owner-scoped).

## Project structure

```
api/                 Vercel serverless entry (api/index.ts)
data/demo/           clearly-labelled demo dataset (standards, relationships, certifications)
docs/                implementation plan
scripts/             ingest.ts (CSV/JSON → Supabase + pgvector), smoke.ts (CLI pipeline run)
server/              framework-agnostic API: http.ts (router, validation, rate limit), routes.ts,
                     config.ts (providers/repository from env), persistence.ts, vite-plugin-api.ts
src/engine/          RAG engine (language, text, embeddings, extraction, retrieval, ranking,
                     graph, analysis, generation, chat, providers, repository, pipeline)
src/components/      ui primitives, analysis components, React Flow graph
src/pages/           Dashboard, Analyze, Upload, Results, Explorer, Graph, Gaps, Spec, History
src/layouts/         AppShell (sidebar, header, copilot)
src/services/        api client, history store, pdf extraction
src/context, hooks/  app state, async data, route helpers
supabase/migrations/ schema, vector functions, RLS
tests/               vitest: engine, server router, jsdom UI flows
```

## Getting started (demo mode)

Requirements: Node 20+ (tested on Node 24), npm.

```bash
npm install
npm run dev        # http://localhost:5173  (UI + /api on the same port)
```

No `.env` is needed. The header shows **Demo mode · 61 standards indexed**. To exercise the pipeline from the CLI:

```bash
npx tsx scripts/smoke.ts "LED street lighting system for municipal roads, 120W, IP66"
```

## Environment variables

Copy `.env.example` to `.env` (never commit `.env`). All variables are **server-side only** and are never bundled into the frontend.

| Variable | Values / default | Notes |
|---|---|---|
| `AI_PROVIDER` | `demo` (default) · `anthropic` · `openai` · `groq` | LLM for reranking, extraction, translation, spec refinement, chat |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | — · `claude-opus-5` | used when `AI_PROVIDER=anthropic` |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | — · `gpt-4o-mini` | used when `AI_PROVIDER=openai` |
| `GROQ_API_KEY`, `GROQ_MODEL` | — · `llama-3.3-70b-versatile` | used when `AI_PROVIDER=groq` |
| `EMBEDDING_PROVIDER` | `local` (default) · `voyage` | must match the pgvector column dimension when Supabase is used |
| `VOYAGE_API_KEY`, `VOYAGE_EMBEDDING_MODEL` | — · `voyage-3-lite` (512 d) | |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | — | enables the Supabase repository + persistence; **service-role key is server-only** |
| `MAX_UPLOAD_MB` | `10` | PDF size limit |
| `RATE_LIMIT_PER_MINUTE` | `60` | per-IP API limit |

If a key is missing or invalid the app logs a warning (visible on the Dashboard status card) and falls back to demo mode instead of failing.

## Supabase + pgvector setup

1. Create a Supabase project. In **SQL Editor** run `supabase/migrations/0001_schema.sql`, then `0002_functions_rls.sql` (or `supabase db push` with the CLI).
2. If you use the local embedding provider, change `vector(1536)` to `vector(384)` in both files before running them (OpenAI small = 1536, Voyage lite = 512). The dimension must be consistent across the column, the RPC signatures and the ingestion run.
3. Put `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` (server-side).
4. Index the data: `npm run ingest` (demo dataset) — see below.
5. Restart `npm run dev`. `/api/status` now reports `repository: supabase:pgvector` and `persistence: true`; analyses are stored in `analyses` / `search_history` and the History page shows *Synced with Supabase*.

If the `standards` table is empty the server automatically keeps using the in-memory demo dataset and reports a warning.

## Data ingestion

```
import → validate → normalise → deduplicate → map relationships → embed → index
```

```bash
npm run ingest -- --dry-run                       # validate + normalise the bundled demo dataset
npm run ingest                                    # ingest demo dataset into Supabase
npm run ingest -- --input data/my-standards.json  # RawDatasetInput JSON (see src/engine/repository/normalize.ts)
npm run ingest -- --input data/standards.csv --relationships data/relationships.json
```

* CSV header: `id,number,title,category,sector,productTypes,scope,keywords,year,status` (lists `;`-separated).
* `normalizeDataset` validates required fields, dedupes by id (last wins), drops dangling relationships/certifications, marks `superseded_by` targets, and fills `source` metadata. Its report is printed by the script.
* To add **real BIS data later**: export the catalogue to the JSON/CSV shape, set `source.type = "bis-catalogue"` and `isDemo: false`, run the script. The UI automatically stops showing the *Demo dataset* badge for those records.

## PDF workflow

Upload → pdf.js text extraction in the browser (file never leaves the device) → validation (type, size, empty, corrupted/password-protected, scanned) → document preview with page statistics → `/api/analyze` with `source: "pdf"` → requirement extraction, chunked embeddings, retrieval, gap analysis.

Scanned PDFs are detected (no selectable text) and reported with a clear message. The `OcrProvider` port in `src/services/pdf.ts` can be implemented with Tesseract.js or a cloud OCR without touching the pipeline.

## Testing, lint, build

```bash
npm run lint        # ESLint 10 (typescript-eslint, react-hooks, react-refresh)
npm run typecheck   # tsc -b (app, node/server, tests)
npm test            # vitest — 50 tests: engine, API router, jsdom UI flows
npm run build       # tsc -b && vite build → dist/
npm run validate    # all of the above
npm run preview     # serve dist/ with the API middleware
```

Test coverage includes: language detection/normalisation, local embeddings, chunking, requirement + reference extraction, retrieval and fallback, reranking and confidence, relationship expansion and graph building, certification lookup, outdated-reference statuses, gap rules, end-to-end demo pipeline (EN + HI), spec generation, chat intents, API validation / 404 / rate limiting, and full UI flows (dashboard, navigation, empty states, judge demo flow, explorer, PDF upload states, copilot).

## Deployment

* **Vercel**: `vercel.json` sets the Vite framework and rewrites `/api/*` to `api/index.ts` (Node function). Add the environment variables in the Vercel project settings.
* **Supabase**: database + pgvector + RLS as above.
* Any Node host works too — serve `dist/` and mount `server/routes.ts` behind `readNodeRequest`/`writeNodeResponse` (see `api/index.ts`).

## Security

* Secrets only in server-side env; `/api/status` exposes provider *names*, never keys.
* `zod` validation on every route, JSON body size cap (6 MB of extracted text), PDF type/size checks client-side, per-IP rate limiting, `X-Content-Type-Options`, no stack traces in responses.
* React error boundaries per page/panel; Markdown renderer never injects raw HTML.
* Supabase RLS: reference tables public-read; user data owner-scoped; the server writes with the service-role key.
* `.gitignore` excludes `.env*` (except `.env.example`), build output and logs. No real credentials exist in the repository.

## Demo data limitations

`data/demo/*.json` is a **representative demo dataset** compiled for the hackathon:

* Standard numbers and titles are representative metadata for well-known Indian Standards; **scope summaries are paraphrased descriptions written for this demo, not official standard text**.
* Edition years, edition history and amendment records are best-effort (`isPlaceholder: true` on amendment records) and must be verified with BIS.
* Relationships (normative/test/safety/…) and certification mappings (CRS / ISI / Hallmarking, "indexed-mandatory" / "indexed-listed" / "indexed-voluntary") describe what *this index records*; they are not a legal determination.
* Every record carries `isDemo: true`, `source.type = "demo-dataset"` and the UI labels it *Demo dataset* / *Demo record*.

Replace or extend it through the ingestion pipeline before any real procurement use.

## Limitations & future enhancements

* Demo-mode embeddings are a deterministic lexical/concept model, not a neural encoder; use `openai`/`voyage` for production-grade semantics.
* OCR for scanned PDFs is a port, not implemented.
* Authentication is architected (Supabase auth + RLS + `owner_id`) but the UI has no sign-in yet; history is per-browser unless Supabase is configured.
* Planned: official BIS data ingestion and live update sync, more Indian languages (add a lexicon `forms` key + detector), organisation accounts and role-based access, audit logs, standards change alerts, document comparison, citation retrieval from full standard text, procurement-portal API.
