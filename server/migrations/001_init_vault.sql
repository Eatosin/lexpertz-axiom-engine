-- AXIOM VAULT MASTER SCHEMA V2.7-STABLE
-- 1. Enable AI Extensions
create extension if not exists vector;

-- 2. Parent Documents Table (The Context Hub)
create table documents (
  id bigserial primary key,
  filename text not null,
  user_id text not null, -- Clerk Identity
  status text default 'processing',
  is_permanent boolean default false, -- Persistence Logic
  created_at timestamptz default now()
);

-- 3. Evidence Chunks Table (The Vector Store)
create table document_chunks (
  id bigserial primary key,
  document_id bigint references documents(id) on delete cascade,
  user_id text not null, -- Clerk Identity
  content text not null,
  embedding vector(1024), -- NVIDIA NIM E5-v5 Standard
  metadata jsonb,
  created_at timestamptz default now(),
  -- V2.7: Full-Text Search Vector (Calculated for Keyword matching)
  fts_content tsvector generated always as (to_tsvector('english', content)) stored
);

-- 4. Audit Logs Table (Security Telemetry)
create table audit_logs (
  id bigserial primary key,
  user_id text not null,
  document_id text, 
  question text not null,
  faithfulness float default 0,
  precision float default 0,
  relevance float default 0,
  created_at timestamptz default now()
);

-- 5. Security Framework (Row Level Security)
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table audit_logs enable row level security;

-- Document Policies
create policy "Users can only view their own documents" on documents for select using (user_id = auth.jwt() ->> 'sub');
create policy "Users can only insert their own documents" on documents for insert with check (user_id = auth.jwt() ->> 'sub');
create policy "Users can only delete their own documents" on documents for delete using (user_id = auth.jwt() ->> 'sub');

-- Chunk Policies
create policy "Users can only view their own chunks" on document_chunks for select using (user_id = auth.jwt() ->> 'sub');

-- Audit Log Policies
create policy "Users can only view their own logs" on audit_logs for select using (user_id = auth.jwt() ->> 'sub');
create policy "Users can insert own logs" on audit_logs for insert with check (user_id = auth.jwt() ->> 'sub');

-- 6. High-Performance Multi-Index Strategy
-- Semantic Search Index (Meaning)
create index on document_chunks using hnsw (embedding vector_cosine_ops);
-- Keyword Search Index (Exact matches)
create index idx_fts_content on document_chunks using gin (fts_content);

-- 7. THE VAULT INTERROGATOR (Hybrid Search Engine)
create or replace function hybrid_vault_search(
  query_text text,
  query_embedding vector(1024),
  match_count int,
  target_user_id text
) returns table (
  id bigint,
  document_id bigint,
  filename text,
  content text,
  similarity float,
  fts_rank real
) language plpgsql as $$
begin
  return query
  select 
    c.id,
    c.document_id,
    d.filename,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity,
    ts_rank_cd(c.fts_content, plainto_tsquery('english', query_text)) as fts_rank
  from document_chunks c
  join documents d on c.document_id = d.id
  where c.user_id = target_user_id
  order by similarity desc, fts_rank desc
  limit match_count;
end;
$$;
