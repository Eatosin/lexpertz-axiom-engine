-- 1. Enable the Vector Extension (Crucial for AI)
create extension if not exists vector;

-- 2. Documents Table (The Parent)
create table documents (
  id bigserial primary key,
  filename text not null,
  user_id uuid references auth.users(id) on delete cascade,
  status text default 'processing', -- 'processing', 'indexed', 'failed'
  created_at timestamptz default now()
);

-- 3. Document Chunks Table (The Evidence & Vectors)
-- We use 768 dimensions for Sovereign/Local model compatibility
create table document_chunks (
  id bigserial primary key,
  document_id bigint references documents(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  embedding vector(768), 
  metadata jsonb, -- Stores {page: 1, line: 12}
  created_at timestamptz default now()
);

-- 4. Row Level Security (The Compliance Shield)
alter table documents enable row level security;
alter table document_chunks enable row level security;

-- 5. RLS Policies (Users see ONLY their own data)
create policy "Users can only view their own documents"
  on documents for select using (auth.uid() = user_id);

create policy "Users can only insert their own documents"
  on documents for insert with check (auth.uid() = user_id);

create policy "Users can only view their own chunks"
  on document_chunks for select using (auth.uid() = user_id);

-- 6. High-Performance Indexing (HNSW)
-- Speeds up retrieval for large datasets
create index on document_chunks using hnsw (embedding vector_cosine_ops);
