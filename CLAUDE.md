# Indian Standards Procurement AI

## Project
AI-powered recommendation engine for identifying applicable Indian Standards
for procurement specifications.

## Goal
Analyze procurement descriptions, technical specifications, and tender documents
and recommend applicable Indian Standards with evidence, related/normative
references, version information, amendments, certification requirements, and
identified specification gaps.

## Repository Structure

- apps/frontend/        React frontend
- services/backend/     FastAPI backend
- services/ai-engine/   RAG/recommendation/AI logic
- services/ingestion/   Document ingestion and processing
- supabase/             Database migrations and Supabase functions
- data/                 Sample and evaluation data
- docs/                 Architecture, research, and presentation material

## Git Rules

- main = production/demo-ready code
- develop = active integration branch
- Never commit secrets
- Never push API keys, database passwords, tokens, or .env files
- Do not make destructive changes without explicit approval
- Do not rewrite Git history
- Prefer small, focused commits

## Supabase Rules

- Database schema changes must use migrations in supabase/migrations/
- Never modify the production database manually when the change should be represented
  by a migration
- Do not store Supabase secrets in source code
- Use environment variables for credentials
- Do not create tables or schema based only on assumptions; follow the approved
  project architecture

## AI/RAG Rules

- Prefer source-grounded answers
- Never invent Indian Standard numbers, titles, versions, amendments, or
  certification requirements
- Every recommendation should have traceable evidence
- Distinguish retrieved facts from LLM-generated explanations
- Preserve source references and metadata

## Development Rules

Before changing architecture, database schema, or major dependencies:
1. Inspect the existing repository
2. Understand existing code
3. Reuse existing components where appropriate
4. Explain major architectural changes
5. Add or update tests when practical

Do not create unnecessary frameworks, services, or dependencies.

## Current Status

Initial repository and Supabase CLI configuration are complete.
The initial database migration is intentionally empty.
Do not design the final database schema until the team has approved the architecture.
