-- Phase 2: Config-driven weights, scoring support, and cache TTL
-- =============================================================================

-- app_config: key-value store for runtime-tunable settings
create table public.app_config (
  key varchar(100) primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz default now()
);

alter table public.app_config enable row level security;

-- track_variants: add duplicate linking column
alter table public.track_variants
  add column if not exists duplicate_of uuid references public.track_variants(id) on delete set null;

-- Seed default scoring and operational config
insert into public.app_config (key, value, description) values
  ('scoring.weights', '{"title": 0.40, "artist": 0.25, "duration": 0.25, "keyword": 0.10}', 'Weighted scoring signal coefficients for variant relevance'),
  ('scoring.thresholds', '{"high": 0.72, "low": 0.45}', 'Confidence tier boundaries'),
  ('scoring.duration_max_ratio', '3.0', 'Hard-reject if candidate duration > original * this'),
  ('scoring.duration_min_ratio', '0.4', 'Hard-reject if candidate duration < original * this'),
  ('moderation.flag_threshold', '3', 'Flags required to auto-move variant to review'),
  ('moderation.rate_limit_per_hour', '10', 'Max flags a single user can submit per hour'),
  ('cache.variant_ttl_hours', '168', 'Hours before cached variants are considered stale (7 days)');
