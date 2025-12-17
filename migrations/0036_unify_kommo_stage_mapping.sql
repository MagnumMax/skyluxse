alter table public.sales_pipeline_stages
  add column if not exists kommo_pipeline_id text,
  add column if not exists kommo_status_id text,
  add column if not exists booking_status text;

alter table public.sales_pipeline_stages
  drop constraint if exists sales_pipeline_stages_booking_status_check;

alter table public.sales_pipeline_stages
  add constraint sales_pipeline_stages_booking_status_check
  check (
    booking_status is null
    or booking_status in ('lead', 'confirmed', 'delivery', 'in_progress', 'completed', 'cancelled')
  );

create unique index if not exists sales_pipeline_stages_kommo_status_idx
  on public.sales_pipeline_stages (kommo_pipeline_id, kommo_status_id)
  where kommo_pipeline_id is not null
    and kommo_status_id is not null;

with stage_seed(id, name, probability, sla_days, kommo_pipeline_id, kommo_status_id, booking_status) as (
  values
    ('prospect', 'Prospect', 0.25, 5, null, null, 'lead'),
    ('proposal', 'Proposal', 0.6, 7, null, null, 'confirmed'),
    ('won', 'Won', 1.0, 0, null, null, 'completed'),
    ('skyluxse_incoming', 'Incoming leads', 0.15, 3, '9815931', '75440383', 'lead'),
    ('skyluxse_bot_answering', 'Request bot answering', 0.2, 2, '9815931', '79790631', 'lead'),
    ('skyluxse_follow_up', 'Follow up', 0.35, 4, '9815931', '91703923', 'lead'),
    ('skyluxse_waiting_payment', 'Waiting for payment', 0.55, 3, '9815931', '96150292', 'confirmed'),
    ('skyluxse_confirmed', 'Confirmed booking', 0.8, 2, '9815931', '75440391', 'confirmed'),
    ('skyluxse_delivery_24h', 'Delivery within 24h', 0.9, 1, '9815931', '75440395', 'delivery'),
    ('skyluxse_with_customer', 'Car with customer', 0.95, 5, '9815931', '75440399', 'in_progress'),
    ('skyluxse_pickup_24h', 'Pick up within 24h', 0.97, 2, '9815931', '76475495', 'completed'),
    ('skyluxse_objections', 'Objections', 0.4, 3, '9815931', '78486287', 'lead'),
    ('skyluxse_refund_deposit', 'Refund deposit', 0.7, 4, '9815931', '75440643', 'completed'),
    ('skyluxse_deal_closed', 'Deal is closed', 0.99, 1, '9815931', '75440639', 'completed'),
    ('skyluxse_closed_won', 'Closed - won', 1.0, 0, '9815931', '142', 'completed')
)
insert into public.sales_pipeline_stages as s
  (id, name, probability, sla_days, kommo_pipeline_id, kommo_status_id, booking_status)
select id, name, probability, sla_days, kommo_pipeline_id, kommo_status_id, booking_status
from stage_seed
on conflict (id) do update
set name = excluded.name,
    probability = excluded.probability,
    sla_days = excluded.sla_days,
    kommo_pipeline_id = excluded.kommo_pipeline_id,
    kommo_status_id = excluded.kommo_status_id,
    booking_status = excluded.booking_status;
