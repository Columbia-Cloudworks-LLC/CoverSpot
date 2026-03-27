-- Phase 2: Community moderation tables and moderator role
-- =============================================================================

-- variant_flags: one flag per user per variant
create table public.variant_flags (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.track_variants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reason varchar(255) not null,
  created_at timestamptz default now(),
  unique (variant_id, user_id)
);

create index idx_variant_flags_variant on public.variant_flags (variant_id);
create index idx_variant_flags_user_recent on public.variant_flags (user_id, created_at);

alter table public.variant_flags enable row level security;

create policy variant_flags_insert_own on public.variant_flags
  for insert with check (user_id = auth.uid());

create policy variant_flags_select_own on public.variant_flags
  for select using (user_id = auth.uid());

-- moderation_audit_log: tracks moderator overrides
create table public.moderation_audit_log (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.track_variants(id) on delete cascade,
  moderator_id uuid not null references public.users(id),
  action varchar(50) not null,
  previous_status varchar(20) not null,
  new_status varchar(20) not null,
  reason text,
  created_at timestamptz default now()
);

alter table public.moderation_audit_log enable row level security;

-- Add moderator flag to users table
alter table public.users
  add column if not exists is_moderator boolean default false;
