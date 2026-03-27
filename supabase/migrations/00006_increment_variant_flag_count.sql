-- Atomic flag_count bump + optional review promotion (avoids read-modify-write races)

create or replace function public.increment_track_variant_flag_count(
  p_variant_id uuid,
  p_flag_threshold int
)
returns table (new_flag_count integer, new_status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.track_variants tv
  set
    flag_count = coalesce(tv.flag_count, 0) + 1,
    status = case
      when coalesce(tv.flag_count, 0) + 1 >= p_flag_threshold
        and tv.status = 'active'
      then 'review'
      else tv.status
    end
  where tv.id = p_variant_id
  returning tv.flag_count, tv.status;
end;
$$;

revoke all on function public.increment_track_variant_flag_count(uuid, int) from public;
grant execute on function public.increment_track_variant_flag_count(uuid, int) to service_role;
