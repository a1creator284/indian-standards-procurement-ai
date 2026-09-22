-- ============================================================================
-- IS Copilot — core schema (PostgreSQL + pgvector)
-- Run in the Supabase SQL editor or via `supabase db push`.
-- ============================================================================

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ───────────────────────────── Enumerations ──────────────────────────────────

do $$ begin
  create type standard_category as enum
    ('product','test-method','code-of-practice','safety','terminology','installation','general');
exception when duplicate_object then null; end $$;

do $$ begin
  create type relationship_type as enum
    ('normative_reference','test_method','terminology','safety','installation',
     'related_product','allied','superseded_by','part_of');
exception when duplicate_object then null; end $$;

do $$ begin
  create type revision_status as enum
    ('indexed-current','historical','superseded','withdrawn','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type certification_applicability as enum
    ('indexed-mandatory','indexed-voluntary','indexed-listed','unknown');
exception when duplicate_object then null; end $$;

-- ───────────────────────────── Users / profiles ──────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  organisation text,
  role text default 'procurement-officer',
  created_at timestamptz not null default now()
);

-- ───────────────────────────── Standards knowledge model ─────────────────────

create table if not exists public.standards (
  id text primary key,                       -- slug, e.g. is-10322-5-3
  number text not null,
  title text not null,
  category standard_category not null,
  sector text not null,
  product_types text[] not null default '{}',
  scope text not null default '',
  keywords text[] not null default '{}',
  revision_status revision_status not null default 'unknown',
  is_demo boolean not null default true,
  source_name text not null default 'Demo Dataset',
  source_type text not null default 'demo-dataset',
  source_url text,
  source_note text,
  indexed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists standards_number_idx on public.standards (number);
create index if not exists standards_category_idx on public.standards (category);
create index if not exists standards_sector_idx on public.standards (sector);
create index if not exists standards_keywords_gin on public.standards using gin (keywords);
create index if not exists standards_title_trgm on public.standards using gin (to_tsvector('english', title || ' ' || scope));

create table if not exists public.standard_versions (
  id uuid primary key default gen_random_uuid(),
  standard_id text not null references public.standards (id) on delete cascade,
  label text not null,
  year int,
  status revision_status not null default 'unknown',
  note text,
  is_latest boolean not null default false,
  unique (standard_id, label)
);
create index if not exists standard_versions_standard_idx on public.standard_versions (standard_id);

create table if not exists public.standard_amendments (
  id uuid primary key default gen_random_uuid(),
  standard_id text not null references public.standards (id) on delete cascade,
  number int not null,
  year int,
  summary text not null default '',
  is_placeholder boolean not null default true,
  unique (standard_id, number)
);

create table if not exists public.standard_relationships (
  id uuid primary key default gen_random_uuid(),
  from_id text not null references public.standards (id) on delete cascade,
  to_id text not null references public.standards (id) on delete cascade,
  type relationship_type not null,
  note text,
  source_name text default 'Demo Dataset',
  unique (from_id, to_id, type)
);
create index if not exists standard_relationships_from_idx on public.standard_relationships (from_id);
create index if not exists standard_relationships_to_idx on public.standard_relationships (to_id);

create table if not exists public.certifications (
  id text primary key,
  scheme text not null,
  name text not null,
  authority text not null,
  description text not null default '',
  url text
);

create table if not exists public.standard_certifications (
  id uuid primary key default gen_random_uuid(),
  standard_id text not null references public.standards (id) on delete cascade,
  certification_id text not null references public.certifications (id) on delete cascade,
  applicability certification_applicability not null default 'unknown',
  evidence text not null default '',
  status text not null default 'verified-demo',
  source_name text default 'Demo Dataset',
  unique (standard_id, certification_id)
);

-- ───────────────────────────── Embeddings (pgvector) ─────────────────────────
-- Dimension must match EMBEDDING_PROVIDER. 1536 = OpenAI text-embedding-3-small.
-- For the local demo provider (256 dims) create a second table or alter the type.

create table if not exists public.standard_embeddings (
  id uuid primary key default gen_random_uuid(),
  standard_id text not null references public.standards (id) on delete cascade,
  chunk_index int not null default 0,
  content text not null,
  embedding vector(1536) not null,
  provider text not null,
  model text not null,
  created_at timestamptz not null default now(),
  unique (standard_id, chunk_index, provider, model)
);
create index if not exists standard_embeddings_hnsw
  on public.standard_embeddings using hnsw (embedding vector_cosine_ops);

-- ───────────────────────────── Documents (tender uploads) ────────────────────

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete set null,
  file_name text not null,
  mime_type text not null,
  size_bytes int not null,
  page_count int,
  extracted_text text,
  extraction_status text not null default 'pending', -- pending | ok | failed | needs-ocr
  created_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  unique (document_id, chunk_index)
);

-- ───────────────────────────── Analyses ──────────────────────────────────────

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete set null,
  document_id uuid references public.documents (id) on delete set null,
  source text not null default 'text',           -- text | paste | pdf
  language text not null default 'en',
  original_input text not null,
  normalized_input text not null,
  mode text not null default 'demo',             -- demo | live
  summary jsonb not null default '{}'::jsonb,
  result jsonb not null,                          -- full AnalysisResult (denormalised)
  created_at timestamptz not null default now()
);
create index if not exists analyses_owner_idx on public.analyses (owner_id, created_at desc);

create table if not exists public.analysis_requirements (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  category text not null,
  text text not null,
  entity text,
  value text,
  unit text,
  confidence real not null default 0
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  standard_id text not null references public.standards (id),
  role text not null default 'primary',
  confidence_total real not null,
  confidence_band text not null,
  breakdown jsonb not null default '{}'::jsonb,
  reasons text[] not null default '{}',
  explanation text not null default '',
  rank int not null default 0
);
create index if not exists recommendations_analysis_idx on public.recommendations (analysis_id, rank);

create table if not exists public.gap_findings (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  type text not null,
  severity text not null,
  issue text not null,
  why_it_matters text not null default '',
  related_standard_ids text[] not null default '{}',
  evidence text not null default '',
  suggested_action text not null default ''
);

create table if not exists public.search_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete set null,
  analysis_id uuid references public.analyses (id) on delete cascade,
  query text not null,
  source text not null default 'text',
  language text not null default 'en',
  recommendation_count int not null default 0,
  top_standard text,
  gap_count int not null default 0,
  mode text not null default 'demo',
  created_at timestamptz not null default now()
);
create index if not exists search_history_owner_idx on public.search_history (owner_id, created_at desc);

-- ───────────────────────────── updated_at trigger ────────────────────────────

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists standards_set_updated_at on public.standards;
create trigger standards_set_updated_at before update on public.standards
  for each row execute function public.set_updated_at();
