-- Milestone 7: notifications run server-side with the service role (after the caller's own
-- access has been checked), so usage must answer for it too.

create or replace function public.agreement_usage(p_agreement_id uuid, p_month date default null)
returns table (used_minutes integer, included_minutes integer, month date)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_agreement public.maintenance_agreements;
  v_month date := date_trunc('month', coalesce(p_month, (now() at time zone 'Europe/Oslo')::date))::date;
begin
  select * into v_agreement from public.maintenance_agreements where id = p_agreement_id;
  if not found
     or not (private.is_admin() or private.is_member(v_agreement.client_id) or (select auth.jwt() ->> 'role') = 'service_role') then
    return;
  end if;

  return query
  select
    coalesce(sum(t.minutes), 0)::integer,
    coalesce(v_agreement.minutes_override, p.included_minutes_per_month),
    v_month
  from public.maintenance_plans p
  left join public.time_entries t
    on t.entry_date >= v_month
   and t.entry_date < (v_month + interval '1 month')::date
   and t.entry_date >= v_agreement.start_date
   and (
     exists (
       select 1 from public.maintenance_log ml
       where ml.id = t.maintenance_log_id and ml.project_id = v_agreement.project_id
     )
     or exists (
       select 1 from public.change_requests cr
       where cr.id = t.change_request_id and cr.project_id = v_agreement.project_id and cr.billing = 'included'
     )
   )
  where p.id = v_agreement.plan_id
  group by p.included_minutes_per_month;
end;
$$;
