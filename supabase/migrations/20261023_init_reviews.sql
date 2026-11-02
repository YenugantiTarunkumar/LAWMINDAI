-- LawMind AI Database Migration: Private User Reviews with Row Level Security (RLS)
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. Create the reviews table
create table if not exists public.reviews (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  mode text not null,
  input_file_name text,
  original_content text not null,
  result jsonb not null,
  overall_risk_level text not null,
  executive_summary text not null,
  drafting_quality_score integer default 5
);

-- 2. Enable Row Level Security (RLS)
alter table public.reviews enable row level security;

-- 3. Row Level Security Policies
-- Policy: Users can only view their own reviews
create policy "Users can view their own reviews"
  on public.reviews
  for select
  using (auth.uid() = user_id);

-- Policy: Users can only insert their own reviews
create policy "Users can insert their own reviews"
  on public.reviews
  for insert
  with check (auth.uid() = user_id);

-- Policy: Users can only update their own reviews
create policy "Users can update their own reviews"
  on public.reviews
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Users can only delete their own reviews
create policy "Users can delete their own reviews"
  on public.reviews
  for delete
  using (auth.uid() = user_id);

-- 4. Indexes for high performance
create index if not exists idx_reviews_user_id on public.reviews(user_id);
create index if not exists idx_reviews_created_at on public.reviews(created_at desc);
