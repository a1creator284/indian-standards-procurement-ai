-- ============================================================================
-- IS Copilot — vector search function + Row Level Security
-- ============================================================================

-- Nearest-neighbour search over standard embeddings with optional metadata filters.
-- Returns one row per standard (best chunk), ordered by cosine similarity.
create or replace function public.match_standards (
  query_embedding vector(1536),
  match_count int default 12,
  filter_sector text default null,
  filter_category text default null,
  min_similarity float default 0.0
)
returns table (
  standard_id text,
  similarity float,
  content text
)
language sql stable as $$
  select distinct on (e.standard_id)
    e.standard_id,
    1 - (e.embedding <=> query_embedding) as similarity,
    e.content
  from public.standard_embeddings e
  join public.standards s on s.id = e.standard_id
  where (filter_sector is null or s.sector = filter_sector)
    and (filter_category is null or s.category::text = filter_category)
    and 1 - (e.embedding <=> query_embedding) >= min_similarity
  order by e.standard_id, similarity desc
  limit match_count * 4;
$$;

-- Wrapper that applies the final ordering/limit across distinct standards.
create or replace function public.match_standards_ranked (
  query_embedding vector(1536),
  match_count int default 12,
  filter_sector text default null,
  filter_category text default null,
  min_similarity float default 0.0
)
returns table (standard_id text, similarity float, content text)
language sql stable as $$
  select * from public.match_standards(query_embedding, match_count, filter_sector, filter_category, min_similarity)
  order by similarity desc
  limit match_count;
$$;

-- Full-text fallback (used when embeddings are unavailable).
create or replace function public.search_standards_text (q text, match_count int default 20)
returns table (standard_id text, rank real)
language sql stable as $$
  select s.id, ts_rank(to_tsvector('english', s.title || ' ' || s.scope || ' ' || array_to_string(s.keywords, ' ')),
                       plainto_tsquery('english', q)) as rank
  from public.standards s
  where to_tsvector('english', s.title || ' ' || s.scope || ' ' || array_to_string(s.keywords, ' '))
        @@ plainto_tsquery('english', q)
  order by rank desc
  limit match_count;
$$;

-- ───────────────────────────── Row Level Security ────────────────────────────
-- Reference data (standards, relationships, certifications) is publicly readable.
-- User data (documents, analyses, history) is readable/writable only by its owner.
-- The server uses the service-role key and bypasses RLS for writes made on behalf
-- of anonymous demo users (owner_id null).

alter table public.profiles enable row level security;
alter table public.standards enable row level security;
alter table public.standard_versions enable row level security;
alter table public.standard_amendments enable row level security;
alter table public.standard_relationships enable row level security;
alter table public.certifications enable row level security;
alter table public.standard_certifications enable row level security;
alter table public.standard_embeddings enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.analyses enable row level security;
alter table public.analysis_requirements enable row level security;
alter table public.recommendations enable row level security;
alter table public.gap_findings enable row level security;
alter table public.search_history enable row level security;

-- Public read of reference data
do $$ declare t text;
begin
  foreach t in array array['standards','standard_versions','standard_amendments','standard_relationships',
                           'certifications','standard_certifications','standard_embeddings'] loop
    execute format('drop policy if exists %I_public_read on public.%I', t, t);
    execute format('create policy %I_public_read on public.%I for select using (true)', t, t);
  end loop;
end $$;

-- Owner-scoped user data
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists documents_owner on public.documents;
create policy documents_owner on public.documents
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists document_chunks_owner on public.document_chunks;
create policy document_chunks_owner on public.document_chunks
  for select using (exists (select 1 from public.documents d where d.id = document_id and d.owner_id = auth.uid()));

drop policy if exists analyses_owner on public.analyses;
create policy analyses_owner on public.analyses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists analysis_requirements_owner on public.analysis_requirements;
create policy analysis_requirements_owner on public.analysis_requirements
  for select using (exists (select 1 from public.analyses a where a.id = analysis_id and a.owner_id = auth.uid()));

drop policy if exists recommendations_owner on public.recommendations;
create policy recommendations_owner on public.recommendations
  for select using (exists (select 1 from public.analyses a where a.id = analysis_id and a.owner_id = auth.uid()));

drop policy if exists gap_findings_owner on public.gap_findings;
create policy gap_findings_owner on public.gap_findings
  for select using (exists (select 1 from public.analyses a where a.id = analysis_id and a.owner_id = auth.uid()));

drop policy if exists search_history_owner on public.search_history;
create policy search_history_owner on public.search_history
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
