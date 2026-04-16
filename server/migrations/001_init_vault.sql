-- ==============================================================================
-- AXIOM V4.6 DATA ENGINEERING UPGRADE: THE SOVEREIGN MULTILINGUAL SCHEMA
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. MULTILINGUAL HYBRID SEARCH FIX
-- Drop the English-hardcoded column and replace it with a globally agnostic one.
-- ------------------------------------------------------------------------------
ALTER TABLE document_chunks DROP COLUMN IF EXISTS fts_content CASCADE;

ALTER TABLE document_chunks 
ADD COLUMN fts_content tsvector 
GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED;

-- Recreate the Keyword Index
CREATE INDEX IF NOT EXISTS idx_fts_content ON document_chunks USING gin (fts_content);

-- ------------------------------------------------------------------------------
-- 2. VECTOR MATH OPTIMIZATION (Inner Product / L2 Norm Speedup)
-- ------------------------------------------------------------------------------
-- Drop the slow Cosine index
DROP INDEX IF EXISTS document_chunks_embedding_idx;

-- Create the blazing fast Inner Product HNSW index
CREATE INDEX idx_vector_ip ON document_chunks USING hnsw (embedding vector_ip_ops);

-- ------------------------------------------------------------------------------
-- 3. THE "SEQUENTIAL SCAN" KILLERS (B-Tree Indexes)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_chunks_user_doc ON document_chunks(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_docs_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON audit_logs(user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. JSONB TELEMETRY INDEXING
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_chat_metrics_gin ON chat_messages USING gin (metrics);

-- ------------------------------------------------------------------------------
-- 5. UPGRADED RPC: MULTILINGUAL & INNER PRODUCT HYBRID SEARCH
-- ------------------------------------------------------------------------------
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
    -- SOTA MATH: pgvector <#> returns negative inner product, so we multiply by -1
    (c.embedding <#> query_embedding) * -1 AS similarity,
    -- MULTILINGUAL FIX: use 'simple' dictionary
    ts_rank_cd(c.fts_content, websearch_to_tsquery('simple', query_text)) AS fts_rank
  FROM document_chunks c
  JOIN documents d ON c.document_id = d.id
  WHERE c.user_id = target_user_id
  -- SOTA: 0.7 Semantic (Inner Product) + 0.3 Keyword (Simple)
  ORDER BY (0.7 * ((c.embedding <#> query_embedding) * -1) + 0.3 * ts_rank_cd(c.fts_content, websearch_to_tsquery('simple', query_text))) DESC
  LIMIT match_count;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. UPGRADED RPC: SINGLE-DOCUMENT INNER PRODUCT MATCHING
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding VECTOR(1024),
  match_limit INT,
  target_document_id BIGINT,
  target_user_id TEXT
) RETURNS TABLE (
  content TEXT,
  similarity FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.content,
    (c.embedding <#> query_embedding) * -1 AS similarity
  FROM document_chunks c
  WHERE c.document_id = target_document_id AND c.user_id = target_user_id
  ORDER BY c.embedding <#> query_embedding -- Ascending because <#> returns negative inner product
  LIMIT match_limit;
END;
$$;

COMMIT;
