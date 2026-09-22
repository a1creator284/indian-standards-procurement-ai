# IS Copilot — Implementation Plan (SIH26108)

Internal plan used to build the MVP. See README.md for user-facing docs.

## Layers

| Layer | Location | Notes |
|---|---|---|
| Frontend | `src/` (React 19 + Vite + Tailwind v4) | Pages, layouts, components, hooks |
| Engine (RAG) | `src/engine/` | Pure TS, isomorphic; no secrets, no DOM |
| AI ports | `src/engine/providers/` | `AIProvider` → demo / anthropic / openai; `EmbeddingProvider` → local / openai / voyage |
| Data ports | `src/engine/repository/` | `StandardsRepository` → memory (seed JSON) / supabase (pgvector) |
| API | `server/` | Framework-agnostic handlers; Vite dev middleware + Vercel adapter |
| Database | `supabase/migrations/` | PostgreSQL + pgvector schema, RLS, similarity function |
| Demo data | `data/demo/` | Clearly labelled representative dataset |
| Ingestion | `scripts/ingest.ts` | CSV/JSON → validate → normalise → dedupe → relationships → embed → index |
| Tests | `tests/` (Vitest) | Engine + server behaviour |

## Pipeline

input → (pdf text) → clean → language detect/normalise → requirement extraction →
query embedding → vector retrieval (topK) → metadata filter → rerank (LLM or local) →
relationship expansion → evidence assembly → confidence → gaps → outdated refs →
certifications → report → (optional) spec generation.

## Security

Server-only env vars; zod validation on every route; in-memory rate limiting;
10 MB / PDF-only upload gate; error boundary; sanitised error messages; RLS in SQL.

## Demo mode

`AI_PROVIDER=demo` (default when no key). Local embeddings (hashed n-grams + domain
concept lexicon), deterministic rerank, template explanations, rule-based chat grounded
in retrieved evidence. UI shows "Demo Dataset" badges everywhere data is shown.
