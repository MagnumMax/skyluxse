create or replace function public.normalize_sales_leads_stage_id()
returns trigger
language plpgsql
as $$
declare
  normalized text;
begin
  if new.stage_id is null then
    return new;
  end if;

  select id
    into normalized
    from public.sales_pipeline_stages
   where id = new.stage_id
      or kommo_status_id = new.stage_id
   limit 1;

  if normalized is not null then
    new.stage_id := normalized;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sales_leads_normalize_stage on public.sales_leads;

create trigger trg_sales_leads_normalize_stage
  before insert or update on public.sales_leads
  for each row
  when (new.stage_id is not null)
  execute function public.normalize_sales_leads_stage_id();
