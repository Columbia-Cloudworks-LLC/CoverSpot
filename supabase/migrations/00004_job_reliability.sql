-- Phase 2: Job reliability columns for dead-letter workflow
-- =============================================================================

-- mutation_jobs: add reliability tracking
alter table public.mutation_jobs
  add column if not exists max_retries integer default 3,
  add column if not exists last_attempted_at timestamptz,
  add column if not exists is_dead_letter boolean default false;

-- sync_jobs: add reliability tracking
alter table public.sync_jobs
  add column if not exists max_retries integer default 3,
  add column if not exists last_attempted_at timestamptz,
  add column if not exists is_dead_letter boolean default false;

-- Index for dead-letter queries
create index if not exists idx_mutation_jobs_dead_letter
  on public.mutation_jobs (is_dead_letter) where is_dead_letter = true;

create index if not exists idx_sync_jobs_dead_letter
  on public.sync_jobs (is_dead_letter) where is_dead_letter = true;
