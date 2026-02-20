-- AXIOM VAULT SCHEMA V2.6-STABLE
create extension if not exists vector;

create table documents (
  id bigserial primary key,
  filename text not null,
  user_id text not null, -- Clerk ID Compatible
  status text default 'processing',
  is_permanent boolean default false, -- Relevance for Save Button
  created_at timestamptz default now()
);

create table document_chunks (
  id bigserial primary key,
  document_id bigint references documents(id) on delete cascade,
  user_id text not null, -- Clerk ID Compatible
  content text not null,
  embedding vector(1024), -- NVIDIA NIM Standard
  metadata jsonb,
  created_at timestamptz default now()
);

alter table documents enable row level security;
alter table document_chunks enable row level security;

-- Policies
create policy "Users can only view their own documents"
  on documents for select using (user_id = auth.jwt() ->> 'sub');

create policy "Users can only insert their own documents"
  on documents for insert with check (user_id = auth.jwt() ->> 'sub');

create policy "Users can only view their own chunks"
  on document_chunks for select using (user_id = auth.jwt() ->> 'sub');

create index on document_chunks using hnsw (embedding vector_cosine_ops);
