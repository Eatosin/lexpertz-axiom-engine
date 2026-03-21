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
  latency float default 0,
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

-- V2.7-PATCH: Optimized Hybrid Vault Search
CREATE OR REPLACE FUNCTION hybrid_vault_search(
  query_text TEXT,
  query_embedding VECTOR(1024),
  match_count INT,
  target_user_id TEXT
) RETURNS TABLE (
  id BIGINT,
  document_id BIGINT,
  filename TEXT,
  content TEXT,
  similarity FLOAT,
  fts_rank REAL
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.document_id,
    d.filename,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity,
    -- FIX 1: websearch_to_tsquery for natural language resilience
    ts_rank_cd(c.fts_content, websearch_to_tsquery('english', query_text)) AS fts_rank
  FROM document_chunks c
  JOIN documents d ON c.document_id = d.id
  WHERE c.user_id = target_user_id
  -- FIX 2: Enterprise Hybrid Weighting (0.7 Vector + 0.3 Keyword)
  ORDER BY (0.7 * (1 - (c.embedding <=> query_embedding)) + 0.3 * ts_rank_cd(c.fts_content, websearch_to_tsquery('english', query_text))) DESC
  LIMIT match_count;
END;
$$;
-- 8. THE DOCUMENT SCOPE (Fixes Context Bleed)
-- Searches ONLY within a specific document ID.
create or replace function match_document_chunks(
  query_embedding vector(1024),
  match_limit int,
  target_document_id bigint,
  target_user_id text
) returns table (
  content text,
  similarity float
) language plpgsql as $$
begin
  return query
  select
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where document_id = target_document_id and user_id = target_user_id
  order by document_chunks.embedding <=> query_embedding
  limit match_limit;
end;
$$;
-- V2.9: Chat Persistence Layer
create table chat_messages (
  id bigserial primary key,
  document_id bigint references documents(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  -- We store the RAGAS metrics JSON here so the history keeps the scores!
  metrics jsonb, 
  created_at timestamptz default now()
);

-- Enable Security
alter table chat_messages enable row level security;

-- Policies (Strict User Isolation)
create policy "Users can only view their own chat history"
  on chat_messages for select using (user_id = auth.jwt() ->> 'sub');

create policy "Users can insert their own chat messages"
  on chat_messages for insert with check (user_id = auth.jwt() ->> 'sub');

-- Index for fast loading of long histories
create index idx_chat_history on chat_messages(document_id, created_at);

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL, -- Links to their Clerk ID
    name TEXT NOT NULL, -- e.g., "MacBook Claude Desktop"
    key_value TEXT NOT NULL UNIQUE, -- The actual axm_live_... token
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Index for ultra-fast auth lookups during API calls
CREATE INDEX IF NOT EXISTS idx_api_keys_value ON api_keys(key_value);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
