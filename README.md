# IS Copilot — AI-Powered Indian Standards Intelligence for Procurement

> An AI-assisted recommendation engine that reads an unstructured procurement specification and identifies potentially applicable Indian Standards, with explainable confidence, evidence and gap analysis.

[![Smart India Hackathon 2026](https://img.shields.io/badge/Smart%20India%20Hackathon-2026-0b5394)](https://www.sih.gov.in/)
[![Problem Statement](https://img.shields.io/badge/Problem%20Statement-SIH26108-1f6feb)](#smart-india-hackathon-2026--sih26108)
[![Stack](https://img.shields.io/badge/stack-React%2019%20%C2%B7%20TypeScript%20%C2%B7%20Vite-3178c6)](#technology-stack)
[![Tests](https://img.shields.io/badge/vitest-54%20tests%20passing-2f9e44)](#testing)

**🚀 [Live Demo](https://indian-standards-procurement-ai.vercel.app/)** · **[GitHub Repository](https://github.com/rajaryan1111/indian-standards-procurement-ai)**

---

## Table of Contents

| # | Section | # | Section |
|---|---|---|---|
| 1 | [Smart India Hackathon 2026 · SIH26108](#smart-india-hackathon-2026--sih26108) | 11 | [Project Structure](#project-structure) |
| 2 | [Problem Statement](#problem-statement) | 12 | [Example Workflow](#example-workflow) |
| 3 | [Solution / Overview](#solution--overview) | 13 | [Local Setup](#local-setup) |
| 4 | [How It Works](#how-it-works) | 14 | [Environment Variables](#environment-variables) |
| 5 | [Core Features](#core-features) | 15 | [Running the Application](#running-the-application) |
| 6 | [AI / Retrieval Pipeline](#ai--retrieval-pipeline) | 16 | [Testing](#testing) |
| 7 | [Confidence Model](#confidence-model) | 17 | [Security](#security) |
| 8 | [System Architecture](#system-architecture) | 18 | [My Contribution](#my-contribution) |
| 9 | [Database Architecture](#database-architecture) | 19 | [Dataset Scope & Limitations](#dataset-scope--limitations) |
| 10 | [Technology Stack](#technology-stack) | 20 | [Future Improvements](#future-improvements) · [Disclaimer](#disclaimer) |

---

## Smart India Hackathon 2026 · SIH26108

**Problem Statement ID:** `SIH26108`
**Title:** *AI-Powered Recommendation Engine for Identifying Applicable Indian Standards for Procurement Specifications*
**Event:** Smart India Hackathon 2026

The project was built as a working prototype for this problem statement. The Smart India Hackathon context is also surfaced inside the application on the **About** page (`src/pages/AboutPage.tsx`), and the internal build plan is kept in `docs/IMPLEMENTATION_PLAN.md`.

---

## Problem Statement

Procurement officers in government departments, PSUs and public agencies must cite the correct Indian Standards when drafting tenders. In practice this is difficult:

- **Scale and overlap.** There are thousands of standards, many with overlapping or adjacent scopes.
- **Allied standards are easy to miss.** A single product typically pulls in normative references, test methods, safety, installation and terminology standards.
- **Editions change.** Specifications often quote superseded editions or a year that no longer matches the current revision.
- **Keyword search is not enough.** "Waterproof", "IP66" and "जलरोधक" express the same intent but share no keywords.
- **Specifications are unstructured.** Requirements arrive as free text, pasted tender clauses, mixed English/Hindi/Hinglish phrasing, or PDF documents.

The result is inconsistent tender quality, missing test/safety clauses and avoidable compliance risk.

---

## Solution / Overview

**IS Copilot** is a retrieval-augmented, evidence-grounded assistant for standards discovery. It converts an unstructured procurement requirement into a structured, explainable analysis report.

Given a sentence, a pasted clause, a Hindi/Hinglish query or an uploaded tender PDF, the system:

1. Extracts structured technical requirements from the free text.
2. Retrieves semantically similar standards from an indexed dataset using embeddings.
3. Reranks candidates against the extracted requirements.
4. Expands the result set along a typed standards relationship graph.
5. Attaches evidence snippets, a transparent confidence breakdown and certification mappings.
6. Flags potentially outdated references and specification gaps.
7. Generates an editable, standards-ready specification draft.

Every output is labelled as an **AI Recommendation**, is tied back to indexed source metadata, and is presented for human verification — not as an authoritative determination.

The application runs **fully offline in demo mode with no API keys**, and upgrades to live LLM providers, hosted embeddings and Supabase pgvector purely through environment variables.

---

## How It Works

```
                    Procurement Specification
             (text · pasted clause · EN/HI/Hinglish · PDF)
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Requirement          │  clean → language detect/normalise →
                    │ Extraction           │  rule-based parameter + concept rules
                    └──────────┬───────────┘  (+ optional LLM extraction, merged)
                               ▼
                    ┌──────────────────────┐
                    │ Reference & Entity   │  parse "IS 694:1990",
                    │ Detection            │  "IS 10322 (Part 5/Sec 3):2012", "IS/IEC 60529"
                    └──────────┬───────────┘  + product / sector concept entities
                               ▼
                    ┌──────────────────────┐
                    │ Semantic Retrieval   │  chunk → embed → nearest-neighbour search
                    │                      │  (in-memory cosine or pgvector RPC)
                    └──────────┬───────────┘  + soft sector boost, lexical fallback
                               ▼
                    ┌──────────────────────┐
                    │ Candidate Ranking    │  provider rerank fused with metadata overlap,
                    │                      │  requirement coverage, graph connectivity
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │ Confidence Analysis  │  6 weighted components → 0–100 score
                    │                      │  → Very High / High / Medium / Low band
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │ Evidence &           │  per-requirement snippets with source metadata,
                    │ Recommendations      │  reasons, relationship expansion, freshness
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │ Standards /          │  certification mappings · outdated-reference
                    │ Compliance Analysis  │  detection · gap findings · knowledge graph
                    └──────────┬───────────┘  · standards-ready specification draft
                               ▼
                         Analysis Report
```

### Stage-by-stage

| Stage | What happens | Implementation |
|---|---|---|
| **1. Requirement Extraction** | Input is cleaned (control characters, hyphenation), the language is detected (English / Devanagari Hindi / Hinglish) and normalised through a domain concept lexicon into canonical English while preserving the original. Rule-based extractors then pull structured requirements — IP/IK ratings, wattage, voltage, lm/W, CCT, CRI, power factor, THD, surge, life, warranty, conductor size, grades, accuracy class, quantity and more — plus concept requirements and ambiguous phrases. When a live LLM is configured, its extraction is merged with the rule output rather than replacing it. | `src/engine/text/clean.ts`, `src/engine/language/`, `src/engine/extraction/requirements.ts` |
| **2. Reference & Entity Detection** | A dedicated parser recognises Indian Standard citations in many written forms (`IS 694:2010`, `IS 10322 (Part 5/Sec 3) : 2012`, `IS/IEC 60529`, `IS 1554 Part 1 - 1988`) and canonicalises them into a lookup key (base number, part, section, year). Concept matching simultaneously infers the likely sector(s) of the request. | `src/engine/extraction/references.ts`, `src/engine/retrieval/retrieve.ts` (`inferSectors`) |
| **3. Semantic Retrieval** | The normalised text is chunked with overlap, each chunk is embedded, and nearest-neighbour search is run per chunk. Hits are aggregated per standard (best similarity + hit count + snippet). Inferred sectors are applied as a *soft boost* rather than a hard filter, so cross-sector allied standards are not lost. If vector search is unavailable, the system falls back to lexical/full-text search. | `src/engine/retrieval/retrieve.ts`, `src/engine/repository/` |
| **4. Candidate Ranking** | Retrieved candidates are reranked by fusing the provider rerank score (LLM JSON scores with reasons in live mode, deterministic blend in demo mode) with metadata overlap, extracted-requirement coverage, relationship-graph connectivity and evidence strength. | `src/engine/ranking/rerank.ts` |
| **5. Confidence Analysis** | Each candidate receives a transparent six-component confidence breakdown, summed to a 0–100 score and mapped to a band. Candidates below the primary threshold are demoted to *Related* instead of being shown as primary recommendations. | `src/engine/ranking/confidence.ts`, `src/engine/pipeline.ts` |
| **6. Evidence & Recommendations** | For every recommendation the engine assembles per-requirement evidence snippets from indexed title / scope / keywords / product types with source metadata and strength, generates human-readable reasons and an explanation, expands one hop along the typed relationship graph in both directions, and computes edition freshness. | `src/engine/ranking/rerank.ts` (`matchRequirements`), `src/engine/analysis/explain.ts`, `src/engine/graph/expand.ts` |
| **7. Standards / Compliance Analysis** | Finally the engine looks up indexed certification mappings, checks quoted references against indexed editions, runs the gap rule engine over the specification, builds the knowledge graph for visualisation, and can generate a nine-section standards-ready specification draft. | `src/engine/analysis/certifications.ts`, `analysis/outdated.ts`, `analysis/gaps.ts`, `generation/spec.ts` |

---

## Core Features

All features below are implemented in the repository.

### Analysis & retrieval

| Feature | Description | Where |
|---|---|---|
| Procurement specification analysis | Analyse a natural-language description or a pasted tender clause end to end via `POST /api/analyze`. | `server/routes.ts`, `src/pages/AnalyzePage.tsx` |
| Requirement extraction | Rule-based extraction of technical parameters, concept requirements and ambiguous wording, optionally merged with LLM extraction. | `src/engine/extraction/requirements.ts` |
| Standard reference parsing | Detects and canonicalises IS / IS-IEC / IS-ISO citations including part, section and year. | `src/engine/extraction/references.ts` |
| Embedding-based semantic retrieval | Chunked embedding + nearest-neighbour search with aggregation per standard, sector soft-boost and lexical fallback. | `src/engine/retrieval/retrieve.ts` |
| Candidate ranking | Rerank fusing provider scores with metadata overlap, requirement coverage, graph connectivity and evidence strength. | `src/engine/ranking/rerank.ts` |
| Confidence scoring | Six weighted components, 0–100 total, four bands, displayed with a per-component breakdown. | `src/engine/ranking/confidence.ts`, `src/components/analysis/ConfidenceMeter.tsx` |
| Evidence presentation | Per-requirement evidence snippets with indexed source metadata and strength. | `src/components/analysis/EvidenceList.tsx` |

### Compliance analysis

| Feature | Description | Where |
|---|---|---|
| Relationship expansion | One-hop, bidirectional expansion over nine typed edges: `normative_reference`, `test_method`, `terminology`, `safety`, `installation`, `related_product`, `allied`, `superseded_by`, `part_of`. | `src/engine/graph/expand.ts` |
| Standards relationship graph | Interactive React Flow graph (zoom, pan, focus, node inspector) built from the expansion result. | `src/components/graph/StandardsGraph.tsx`, `src/pages/GraphPage.tsx` |
| Certification analysis | Looks up indexed BIS scheme mappings (`BIS-ISI`, `BIS-CRS`, `BIS-Hallmarking`) with applicability and evidence; returns an explicit "no verified mapping in the indexed dataset" message when none exists. | `src/engine/analysis/certifications.ts` |
| Outdated-standard analysis | Compares quoted references against indexed editions and reports one of six statuses: `potentially-outdated`, `superseded`, `matches-indexed`, `newer-than-indexed`, `not-in-index`, `year-not-specified`. | `src/engine/analysis/outdated.ts` |
| Requirement gap analysis | Rule engine producing ten gap types (missing standard / test / safety / installation / terminology / certification / performance, outdated reference, ambiguous requirement, incomplete field) with severity, why-it-matters and suggested action. | `src/engine/analysis/gaps.ts`, `src/pages/GapsPage.tsx` |
| Specification generator | Nine editable sections (description, technical, applicable standards, testing, safety, certification, installation, references, review notes) with Markdown export. | `src/engine/generation/spec.ts`, `src/pages/SpecPage.tsx` |
| Evidence-grounded assistant | Intent-routed Q&A (why / related / missing / outdated / testing / certification / connected / search) answered from retrieved evidence with citations. | `src/engine/chat/answer.ts`, `src/components/analysis/CopilotPanel.tsx` |

### Input, data & platform

| Feature | Description | Where |
|---|---|---|
| Tender PDF upload | In-browser pdf.js text extraction (the file never leaves the device), with type/size validation and detection of empty, corrupted and scanned PDFs. An `OcrProvider` port exists but is intentionally left unconfigured. | `src/services/pdf.ts`, `src/pages/UploadPage.tsx` |
| Language detection / multilingual processing | Devanagari and Hinglish detection with a concept lexicon mapping EN/HI/Hinglish surface forms to canonical English; optional LLM translation when live. A bilingual EN/HI UI dictionary drives the navigation labels. | `src/engine/language/`, `src/context/LanguageContext.tsx` |
| Standards Explorer | Search, faceted filters (category, sector, product type, revision status, certification), sorting, pagination and a detail drawer. | `src/pages/ExplorerPage.tsx`, `GET /api/standards` |
| Search history & reports | Always stored in `localStorage`; additionally persisted to Supabase when configured, and merged for display. | `src/services/history.ts`, `src/pages/HistoryPage.tsx`, `src/pages/ReportsPage.tsx` |
| Supabase persistence | Optional PostgreSQL + pgvector repository and analysis persistence behind a repository port, with automatic fallback to the in-memory dataset. | `src/engine/repository/supabaseRepository.ts`, `server/persistence.ts`, `supabase/migrations/` |
| Data ingestion pipeline | CLI ingestion: import → validate → normalise → deduplicate → map relationships → embed → index, with a `--dry-run` mode and CSV/JSON input. | `scripts/ingest.ts`, `src/engine/repository/normalize.ts` |
| Graceful degradation | If the LLM rerank fails, retrieval-only ranking is used; if embeddings fail, full-text search is used; if Supabase is unreachable or empty, the in-memory dataset is used. Warnings surface on `GET /api/status`. | `server/config.ts` |
| Vercel deployment | `vercel.json` rewrites `/api/*` to a bundled Node function; the build step bundles `server/serverless.ts` with esbuild. | `vercel.json`, `server/serverless.ts` |
| Automated testing | 53 Vitest tests across 7 files covering the engine, the API router and jsdom UI flows. | `tests/` |

---

## AI / Retrieval Pipeline

| Stage | Implementation |
|---|---|
| Text / PDF extraction | `src/services/pdf.ts` — pdf.js in the browser; `OcrProvider` port left unconfigured |
| Cleaning + chunking | `src/engine/text/clean.ts` — control characters, hyphenation repair, overlapping chunks (1200 chars / 150 overlap at retrieval time, capped at 12 chunks for long PDFs) |
| Language detection & normalisation | `src/engine/language/detect.ts`, `language/lexicon.ts` — Devanagari/Hinglish detection, single-pass concept lexicon, original text preserved; LLM translation used only when a live provider is configured |
| Requirement extraction | `src/engine/extraction/requirements.ts` — parameter rules across 15 requirement categories (product, performance, electrical, environmental, safety, mechanical, material, installation, testing, certification, dimensional, quantity, warranty, reference, other); LLM output merged via `mergeRequirements` |
| Embeddings | `EmbeddingProvider` port — `local` (deterministic hashed n-gram + concept features, 384 dimensions) or `voyage` at runtime; `OpenAIEmbeddingProvider` is additionally available to the ingestion script |
| Vector retrieval + metadata filtering | `src/engine/retrieval/retrieve.ts` → `StandardsRepository.searchByVector` (in-memory cosine, or the `match_standards_ranked` pgvector RPC); sector inferred from concepts and applied as a soft boost; lexical fallback |
| Reranking | `src/engine/ranking/rerank.ts` — provider rerank (LLM JSON scores + reasons, or deterministic demo blend) fused with metadata overlap, requirement coverage, graph connectivity and evidence strength |
| Relationship expansion | `src/engine/graph/expand.ts` — one hop, both directions, nine typed edge kinds |
| Evidence assembly | `matchRequirements` — per-requirement snippets from title / scope / keywords / product types, with source metadata and strength |
| Certification lookup | `src/engine/analysis/certifications.ts` — indexed mappings only |
| Outdated-reference check | `src/engine/analysis/outdated.ts` — statuses computed relative to the indexed edition data |
| Gap analysis | `src/engine/analysis/gaps.ts` — ten-rule engine with severity and cautious wording |
| Report / spec / chat | `src/engine/pipeline.ts`, `generation/spec.ts`, `chat/answer.ts` — templates in demo mode; in live mode the LLM refines output under a grounding system prompt and is rejected if it introduces standards that are not in the index |

### Provider ports

The LLM, the embedding model and the standards store are all interfaces (`src/engine/providers/types.ts`, `src/engine/repository/types.ts`). Switching vendors is an environment-variable change; the pipeline itself never depends on a specific vendor.

| Port | Implementations |
|---|---|
| `LLMProvider` | `DemoLLMProvider` (default) · `AnthropicLLMProvider` · `OpenAILLMProvider` (also used for Groq via a custom base URL) |
| `EmbeddingProvider` | `LocalEmbeddingProvider` (default, 384-d) · `VoyageEmbeddingProvider` · `OpenAIEmbeddingProvider` (ingestion) |
| `StandardsRepository` | `MemoryStandardsRepository` (bundled dataset) · `SupabaseStandardsRepository` (PostgreSQL + pgvector) |

---

## Confidence Model

The score is a transparent weighted sum, not a black box and **not an official BIS score**:

```
total = 100 × ( 0.35·semantic + 0.20·metadata + 0.10·category
              + 0.15·coverage + 0.10·relationship + 0.10·evidence )
```

| Component | Weight | Meaning |
|---|---|---|
| `semantic` | 0.35 | Vector similarity plus provider rerank score |
| `metadata` | 0.20 | Keyword / product-type / scope overlap |
| `category` | 0.10 | Sector / product-category match |
| `coverage` | 0.15 | Share of extracted requirements the standard addresses |
| `relationship` | 0.10 | Connectivity with other candidates in the graph |
| `evidence` | 0.10 | Number and strength of evidence snippets |

| Band | Score | Presentation |
|---|---|---|
| Very High | ≥ 80 | Primary recommendation |
| High | 65 – 79 | Primary recommendation |
| Medium | 45 – 64 | Primary recommendation (threshold = 45) |
| Low | < 45 | Shown under *Related*, never as a primary recommendation |

---

## System Architecture

```
┌──────────────── Browser — React 19 + Vite + Tailwind CSS v4 ─────────────────┐
│  pages · components · React Flow graph · pdf.js extraction · localStorage    │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │  fetch /api/*  (JSON, zod-validated, rate limited)
┌──────────────────────────────▼───────────────────────────────────────────────┐
│  API layer — framework-agnostic handlers in server/                          │
│    dev & preview: Vite middleware plugin                                     │
│    production:    esbuild-bundled Node function (api/index.js on Vercel)     │
└──────────────────────────────┬───────────────────────────────────────────────┘
┌──────────────────────────────▼───────────────────────────────────────────────┐
│  Engine — src/engine (pure TypeScript, isomorphic, no secrets, no DOM)       │
│    language · text · extraction · embeddings · retrieval · ranking · graph   │
│    analysis · generation · chat · pipeline                                   │
│    ports: LLMProvider · EmbeddingProvider · StandardsRepository              │
└──────┬───────────────────────┬──────────────────────────┬────────────────────┘
       │                       │                          │
  demo provider        Anthropic / OpenAI / Groq    in-memory dataset  ·  Supabase
  (rules + templates)  (server-side keys only)      (data/demo/*.json)   (pgvector)
```

**Design principles**

- **Ports and adapters** — the AI, embedding and data layers are interfaces with swappable implementations.
- **Isomorphic engine** — `src/engine/` is pure TypeScript with no DOM and no secrets, so it can run in the browser, on the server, in the CLI smoke script and directly in tests.
- **Graceful degradation** — every AI or network dependency is optional and degrades to a deterministic local path.
- **Secrets stay server-side** — the browser only ever receives the mode, provider *names* and dataset info from `GET /api/status`.

### API endpoints

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/status` | Mode, provider names, repository, dataset info, warnings, upload limit |
| `POST` | `/api/analyze` | Run the full analysis pipeline on text or extracted PDF text |
| `GET` | `/api/standards` | Search / filter / sort / paginate the indexed standards |
| `GET` | `/api/standards/facets` | Facet counts for categories, sectors, revision statuses, certifications |
| `GET` | `/api/standards/:id` | One standard with relationships, certifications and its graph |
| `POST` | `/api/spec` | Generate a standards-ready specification from an analysis |
| `POST` | `/api/chat` | Evidence-grounded Q&A over an analysis |
| `GET` | `/api/history`, `/api/history/:id` | Server-persisted history (when Supabase is configured) |

---

## Database Architecture

Supabase schema is defined in `supabase/migrations/`.

`0001_schema.sql` creates:

| Table | Purpose |
|---|---|
| `profiles` | User profile linked to `auth.users` |
| `standards` | Core entity — number, title, category, sector, product types, scope, keywords, revision status, source, `is_demo` |
| `standard_versions`, `standard_amendments` | Edition history and amendment records (`is_placeholder` flag for demo records) |
| `standard_relationships` | Typed graph edges (`relationship_type` enum) |
| `certifications`, `standard_certifications` | Schemes (ISI / CRS / Hallmarking) and indexed mappings with applicability and evidence |
| `standard_embeddings` | pgvector chunks per standard with an HNSW cosine index |
| `documents`, `document_chunks` | Uploaded tender text and chunk embeddings |
| `analyses`, `analysis_requirements`, `recommendations`, `gap_findings`, `search_history` | Persisted analysis reports |

`0002_functions_rls.sql` adds `match_standards` / `match_standards_ranked` (nearest-neighbour with sector and category filters), `search_standards_text` (full-text fallback) and Row Level Security — reference data is public-read, user data is owner-scoped.

---

## Technology Stack

Derived from `package.json` and the source; no versions are guessed.

### Frontend

| Technology | Role |
|---|---|
| React 19 (`react`, `react-dom`) | UI library |
| TypeScript | Language across frontend, server and engine |
| Vite | Dev server, build tool and API middleware host |
| Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`) | Styling |
| React Router (`react-router`) | Client-side routing with lazy-loaded heavy pages |
| `@xyflow/react` (React Flow) | Interactive standards relationship graph |
| `lucide-react` | Icon set |
| `pdfjs-dist` | In-browser PDF text extraction |

### Backend / API

| Technology | Role |
|---|---|
| Node.js (ESM, target `node20`) | Server runtime |
| Framework-agnostic handlers (`server/http.ts`, `server/routes.ts`) | Router, body parsing, error handling, security headers |
| `zod` | Request validation on every route |
| In-memory rate limiter | Per-IP request throttling |
| `esbuild` (via the build script) | Bundles `server/serverless.ts` into the deployable function |

### AI / ML / Retrieval

| Technology | Role |
|---|---|
| `@anthropic-ai/sdk` | Anthropic LLM provider (optional) |
| OpenAI-compatible HTTP client (`src/engine/providers/openai.ts`) | OpenAI and Groq LLM providers, OpenAI and Voyage embedding providers (optional) |
| Local embedding model (`src/engine/embeddings/local.ts`) | Deterministic hashed n-gram + domain-concept embeddings, 384 dimensions, zero-dependency default |
| Custom RAG pipeline (`src/engine/`) | Extraction, retrieval, reranking, confidence, graph expansion, evidence, gap analysis |

### Database / Persistence

| Technology | Role |
|---|---|
| Supabase (`@supabase/supabase-js`) | PostgreSQL client, optional repository and analysis persistence |
| PostgreSQL + pgvector | Vector similarity search via SQL RPC functions |
| Bundled JSON dataset (`data/demo/`) | Default in-memory repository |
| Browser `localStorage` | Always-on local search history |

### Deployment

| Technology | Role |
|---|---|
| Vercel (`vercel.json`) | Static frontend plus `/api/*` Node function (60 s max duration) |
| Any Node host | Serve `dist/` and mount `server/routes.ts` behind `readNodeRequest` / `writeNodeResponse` |

### Testing & tooling

| Technology | Role |
|---|---|
| Vitest | Unit, integration and UI test runner |
| Testing Library (`@testing-library/react`, `dom`, `jest-dom`, `user-event`) | UI flow assertions |
| `jsdom` | Browser environment for UI tests |
| ESLint (`typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`) | Linting |
| `tsc -b` project references (`tsconfig.app/node/test.json`) | Type checking |
| `tsx` | Running the ingestion and smoke CLI scripts |

---

## Project Structure

```
.
├── api/                      Build output directory for the deployed serverless function
├── data/
│   └── demo/                 Bundled, clearly-labelled dataset
│       ├── standards.json        876 indexed standard records (+ dataset meta/disclaimer)
│       ├── relationships.json    95 typed relationship edges
│       └── certifications.json   3 BIS schemes, 26 standard→scheme mappings
├── docs/
│   └── IMPLEMENTATION_PLAN.md    Internal build plan (layers, pipeline, demo mode)
├── public/                   Static assets (favicon, map image)
├── scripts/
│   ├── ingest.ts             CSV/JSON → validate → normalise → dedupe → embed → Supabase
│   └── smoke.ts              CLI end-to-end pipeline run against the bundled dataset
├── server/                   Framework-agnostic API layer
│   ├── http.ts                   Router, zod body parsing, rate limiter, Node req/res adapters
│   ├── routes.ts                 Route definitions and response shaping
│   ├── config.ts                 Builds providers + repository from env, collects warnings
│   ├── persistence.ts            Best-effort Supabase persistence of analyses
│   ├── serverless.ts             Node function entry (bundled by the build script)
│   └── vite-plugin-api.ts        Mounts /api/* on the Vite dev and preview servers
├── src/
│   ├── engine/               Isomorphic RAG engine (no DOM, no secrets)
│   │   ├── language/             Detection, concept lexicon, normalisation
│   │   ├── text/                 Cleaning and chunking
│   │   ├── embeddings/           Local embedding model
│   │   ├── extraction/           Requirement rules, IS reference parser
│   │   ├── retrieval/            Chunked vector retrieval, sector inference, fallback
│   │   ├── ranking/              Rerank, evidence matching, confidence model
│   │   ├── graph/                Relationship expansion, knowledge-graph builder
│   │   ├── analysis/             Certifications, outdated references, gaps, explanations
│   │   ├── generation/           Standards-ready specification generator
│   │   ├── chat/                 Intent-routed, evidence-grounded answers
│   │   ├── providers/            LLM + embedding ports and adapters, prompts
│   │   ├── repository/           Repository port, memory + Supabase adapters, normalisation
│   │   ├── pipeline.ts           Orchestrates the full analysis
│   │   └── types.ts              Shared domain types
│   ├── components/
│   │   ├── ui/                   Primitives (buttons, cards, badges, Markdown, skeletons)
│   │   ├── analysis/             Recommendation card, confidence meter, evidence, gaps,
│   │   │                         certifications, outdated table, copilot panel, detail drawer
│   │   └── graph/                React Flow standards graph
│   ├── pages/                Dashboard, Analyze, Upload, Results, Explorer, Graph, Gaps,
│   │                         Spec, History, Reports, About, Settings, NotFound
│   ├── layouts/              AppShell (sidebar, header, copilot)
│   ├── context/              App state, theme, language
│   ├── hooks/                Async data, analysis route, standard drawer
│   └── services/             API client, history store, PDF extraction
├── supabase/
│   └── migrations/           0001_schema.sql · 0002_functions_rls.sql (vector RPCs + RLS)
└── tests/
    ├── engine/               language, extraction, ranking, analysis, tender scenario
    ├── server/               API router behaviour
    └── ui/                   jsdom UI flows
```

---

## Example Workflow

1. Start the app with `npm run dev` and open <http://localhost:5173>. The header reports the current mode and the number of indexed standards.
2. On the **Dashboard**, pick an example query or type your own, for example:
   `LED street lighting system for municipal roads, 120W, IP66, outdoor installation`.
3. Click **Analyze Standards**. The engine extracts requirements, retrieves candidates, reranks them and builds the report.
4. **Recommendations** — each card shows the standard, its confidence band, the reasons, matched requirements, evidence snippets, edition freshness and typed relationships. Expand a card to see the per-component confidence breakdown.
5. **Certification** — indexed BIS scheme mappings with applicability and evidence, or an explicit "no verified mapping in the indexed dataset" message.
6. **Potential Gaps** — missing test, safety, installation or certification clauses with severity, why it matters and a suggested action.
7. **Knowledge Graph** — product → primary → normative / test / safety / installation / terminology / allied → certification; click a node to focus it.
8. **Tender Specification** — generate a nine-section editable draft and export it as Markdown.
9. **Ask Copilot** — ask "Why was this standard recommended?" or "What testing standards are related?" and get an answer grounded in the retrieved evidence with citations.
10. Try a Hindi or Hinglish query, or paste a clause citing an older edition such as `IS 694:1990` to see the outdated-reference detector in action.
11. Upload a tender PDF from the **Upload** page — text is extracted in the browser and fed through the same pipeline.

Everything above runs in demo mode without any API key.

---

## Local Setup

**Requirements:** Node.js 20 or newer, npm.

```bash
git clone https://github.com/rajaryan1111/indian-standards-procurement-ai.git
cd indian-standards-procurement-ai
npm install
cp .env.example .env    # optional — the app runs in demo mode with no .env at all
npm run dev
```

Then open <http://localhost:5173>. The Vite dev server also mounts the API at `/api/*` on the same port, so no second process is required.

> **Note:** `.env` is entirely optional. With no environment file the app starts in **demo mode** using the bundled dataset, the local embedding model and the deterministic demo LLM provider.

### Optional — Supabase + pgvector

1. Create a Supabase project. In the **SQL Editor**, run `supabase/migrations/0001_schema.sql`, then `0002_functions_rls.sql` (or `supabase db push` with the Supabase CLI).
2. Make the vector dimension match your embedding provider before running the migrations — the local provider produces 384-dimension vectors. The dimension must be consistent across the column, the RPC signatures and the ingestion run.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` (server-side only).
4. Index the data with `npm run ingest` (use `npm run ingest -- --dry-run` first to validate without writing).
5. Restart the dev server. `GET /api/status` will report the Supabase repository and `persistence: true`.

If the `standards` table is empty or Supabase is unreachable, the server automatically falls back to the in-memory dataset and reports a warning.

### Optional — data ingestion

```bash
npm run ingest -- --dry-run                         # validate + normalise only, no writes
npm run ingest                                      # ingest the bundled dataset into Supabase
npm run ingest -- --input data/my-standards.json    # JSON in the RawDatasetInput shape
npm run ingest -- --input data/standards.csv --relationships data/relationships.json
```

CSV header: `id,number,title,category,sector,productTypes,scope,keywords,year,status` (list columns are `;`-separated). `normalizeDataset` validates required fields, deduplicates by id, drops dangling relationships and certifications, marks `superseded_by` targets and fills `source` metadata; its report is printed by the script.

---

## Environment Variables

Copy `.env.example` to `.env`. **All variables are server-side only** and are never bundled into the frontend.

| Variable | Default / values | Notes |
|---|---|---|
| `AI_PROVIDER` | `demo` (default) · `anthropic` · `openai` · `groq` | LLM used for reranking, extraction, translation, specification refinement and chat |
| `ANTHROPIC_API_KEY` | — | Required when `AI_PROVIDER=anthropic` |
| `ANTHROPIC_MODEL` | see `.env.example` | Anthropic model id |
| `OPENAI_API_KEY` | — | Required when `AI_PROVIDER=openai` |
| `OPENAI_MODEL` | see `.env.example` | OpenAI model id |
| `GROQ_API_KEY` | — | Required when `AI_PROVIDER=groq` |
| `GROQ_MODEL` | see `.env.example` | Groq model id (served through the OpenAI-compatible client) |
| `EMBEDDING_PROVIDER` | `local` (default) · `voyage` | Must match the pgvector column dimension when Supabase is used |
| `VOYAGE_API_KEY` | — | Required when `EMBEDDING_PROVIDER=voyage` |
| `VOYAGE_EMBEDDING_MODEL` | see `.env.example` | Voyage embedding model id |
| `SUPABASE_URL` | — | Enables the Supabase repository and persistence |
| `SUPABASE_SERVICE_ROLE_KEY` | — | **Server-only secret.** `SUPABASE_SECRET_KEY` is also accepted |
| `OPENAI_EMBEDDING_MODEL` | see `scripts/ingest.ts` | Used only by the ingestion script when embedding with OpenAI |
| `MAX_UPLOAD_MB` | `10` | PDF size limit |
| `RATE_LIMIT_PER_MINUTE` | `60` | Per-IP API rate limit |

If a key is missing or invalid, the server records a warning (visible on the Dashboard status card and in `GET /api/status`) and falls back to demo behaviour instead of failing.

---

## Running the Application

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with the API mounted at `/api/*` → <http://localhost:5173> |
| `npm run build` | `tsc -b`, then `vite build` → `dist/`, then esbuild bundles `server/serverless.ts` into the deployable function |
| `npm run preview` | Serves the production build with the API middleware attached |
| `npm run typecheck` | `tsc -b --noEmit` across the app, node/server and test projects |
| `npm run lint` | ESLint over the repository |
| `npm run smoke` | CLI end-to-end pipeline run against the bundled dataset |
| `npm run ingest` | Data ingestion into Supabase (see [Local Setup](#local-setup)) |
| `npm run validate` | `lint` → `typecheck` → `test` → `build` |

Run the CLI pipeline directly:

```bash
npm run smoke -- "LED street lighting system for municipal roads, 120W, IP66"
```

It prints the detected language, the extracted requirements, primary and related recommendations with confidence, certification mappings, gaps, outdated references, graph size and per-stage timings.

### Deployment

- **Vercel** — `vercel.json` rewrites `/api/*` to the bundled Node function (60 s max duration) and serves the SPA for all other routes. Add the environment variables in the Vercel project settings.
- **Any Node host** — serve `dist/` and mount `server/routes.ts` behind `readNodeRequest` / `writeNodeResponse` (see `server/serverless.ts`).

---

## Testing

```bash
npm test          # vitest run — 54 tests across 7 files
npm run test:watch
npm run validate  # lint + typecheck + test + build
```

| Test file | Covers |
|---|---|
| `tests/engine/language.test.ts` | Language detection, Hindi/Hinglish normalisation, concept lexicon |
| `tests/engine/extraction.test.ts` | Requirement rules and IS reference parsing |
| `tests/engine/ranking.test.ts` | Vector retrieval, reranking, confidence, and degradation to retrieval-only when the LLM rerank throws |
| `tests/engine/analysis.test.ts` | Certifications, outdated-reference statuses, gap rules, specification generation, chat intents |
| `tests/engine/almirah.test.ts` | End-to-end tender scenario against the bundled dataset |
| `tests/server/routes.test.ts` | API router: full analysis response, validation, 404 and rate limiting |
| `tests/ui/app.test.tsx` | jsdom UI flows — navigation, empty states, explorer, PDF upload states, copilot |

Current status on the checked-in code: **54 tests passing (7 files)**, ESLint reports 0 errors (2 `react-refresh` warnings).

---

## Security

- **Never commit `.env`.** `.gitignore` excludes `.env*` with an explicit exception for `.env.example`.
- **`.env.example` contains only placeholders and configuration defaults** — no real credentials exist anywhere in the repository.
- **Do not expose API keys.** Every provider key and the Supabase service-role key are read server-side only; the browser never receives them. `GET /api/status` deliberately returns provider *names* and mode only.
- **Input validation** — `zod` schemas on every route, an input length cap, and PDF type/size checks on the client before upload.
- **Rate limiting** — configurable per-IP request throttling in `server/http.ts`.
- **Safe responses** — `X-Content-Type-Options: nosniff`, sanitised error messages, and React error boundaries per page and panel; the Markdown renderer never injects raw HTML.
- **Row Level Security** — reference tables are public-read and user data is owner-scoped in `supabase/migrations/0002_functions_rls.sql`; the server writes with the service-role key.
- If a key is ever exposed, rotate it at the provider and in your deployment environment immediately.

---

## My Contribution

My contribution focused on the development and integration of the AI-powered procurement workflow, application functionality, and system implementation — bringing the retrieval pipeline, the API layer and the user interface together into a working, testable prototype.

Areas I worked on, all evidenced by the code in this repository:

| Area | Work |
|---|---|
| **Procurement specification analysis** | Integration of the end-to-end analysis flow from raw input to a structured report (`src/engine/pipeline.ts`, `POST /api/analyze`). |
| **Requirement extraction** | Rule-based extraction of technical parameters and concept requirements, plus merging of optional LLM-extracted requirements. |
| **Semantic retrieval and standards matching** | Chunking, embedding and nearest-neighbour retrieval with sector inference, soft boosting and lexical fallback. |
| **Ranking and confidence analysis** | Score fusion across semantic similarity, metadata overlap, requirement coverage, graph connectivity and evidence, and the transparent six-component confidence model with banding. |
| **Evidence and recommendation presentation** | Per-requirement evidence assembly and the recommendation, confidence, certification, gap and outdated-reference UI components. |
| **Frontend implementation** | React 19 + Vite + Tailwind application shell, routing with code-splitting for heavy pages, the standards explorer, the PDF upload flow, the relationship-graph page and the specification editor. |
| **Backend / API integration** | Framework-agnostic route handlers, zod validation, rate limiting, the provider/repository configuration layer with graceful degradation, and the Vite dev middleware. |
| **Testing** | Vitest coverage across the engine, the API router and jsdom UI flows. |
| **Deployment integration** | Vercel configuration and the esbuild-bundled serverless entry point, plus the optional Supabase persistence path. |

This project was developed in a hackathon context and builds on open-source libraries and frameworks listed in the [Technology Stack](#technology-stack). The description above reflects the areas I worked on rather than a claim of sole authorship of every part of the system.

---

## Dataset Scope & Limitations

`data/demo/` contains a **clearly-labelled demonstration dataset**, not an official BIS export:

- **876** standard records, **95** typed relationship edges, **3** BIS certification schemes and **26** standard→scheme mappings.
- Standard numbers and titles are representative metadata; **scope summaries are paraphrased descriptions written for this project, not official standard text**.
- Edition years, edition history and amendment records are best-effort (amendment records carry an `isPlaceholder` flag) and must be verified with BIS.
- Relationships and certification mappings describe what *this index records*; they are not a legal determination.
- Every record carries `isDemo: true` and `source.type = "demo-dataset"`, and the UI labels such data accordingly.
- The dataset itself embeds a disclaimer string that is surfaced through `GET /api/status`.

Replace or extend it through the ingestion pipeline before any real procurement use: export a catalogue into the JSON/CSV shape, set `source.type = "bis-catalogue"` and `isDemo: false`, then run `npm run ingest`.

Other current limitations:

- Demo-mode embeddings are a deterministic lexical/concept model, not a neural encoder — configure a hosted embedding provider for production-grade semantics.
- OCR for scanned PDFs exists as a port (`OcrProvider`) but is not implemented; scanned PDFs are detected and reported rather than processed.
- Authentication is architected in the schema (Supabase auth, RLS, owner-scoped rows) but there is no sign-in UI; history is per-browser unless Supabase is configured.

---

## Future Improvements

The following are **planned future work, not current functionality**:

- [ ] Ingest a larger, authoritative Indian Standards dataset sourced from BIS instead of the bundled demonstration dataset.
- [ ] Hybrid retrieval combining lexical (BM25 / full-text) and semantic scoring rather than falling back between them.
- [ ] Improved multilingual processing, including additional Indian languages beyond Hindi and Hinglish.
- [ ] Stronger evidence verification, including citation retrieval from full standard text.
- [ ] Continuous monitoring of standards updates, amendments and supersessions with change alerts.
- [ ] Domain-specific embedding evaluation and model selection for the standards corpus.
- [ ] Production authentication and authorisation (sign-in UI, organisation accounts, role-based access, audit logs).
- [ ] Evaluation against a manually verified benchmark of procurement specifications and their correct standards.
- [ ] OCR implementation for scanned tender PDFs.
- [ ] Document comparison and integration with procurement portals.

---

## Disclaimer

IS Copilot is an **AI assistance tool for standards discovery**, not a legal, regulatory or certification authority. All recommendations, confidence scores, certification mappings, outdated-reference statuses and gap findings are generated from an indexed dataset and must be **verified against the latest authoritative Indian Standards documentation published by the Bureau of Indian Standards (BIS)** before being used for any procurement, tendering or compliance decision.
