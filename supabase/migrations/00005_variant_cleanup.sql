-- Phase 2: Index support for stale variant cleanup queries
-- =============================================================================

create index if not exists idx_variants_stale_cleanup
  on public.track_variants (status, discovered_at)
  where status = 'rejected';
