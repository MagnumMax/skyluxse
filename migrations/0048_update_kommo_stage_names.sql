-- Align sales_pipeline_stages.name with latest Kommo stage labels (SkyLuxse pipeline 9815931)
-- Source of truth: docs/schemas/kommo-import-mapping.md
-- This is a data-only migration; no schema changes.

update public.sales_pipeline_stages
set name = 'Incoming Leads'
where kommo_pipeline_id = '9815931' and kommo_status_id = '75440383';

update public.sales_pipeline_stages
set name = 'Request Bot Answering'
where kommo_pipeline_id = '9815931' and kommo_status_id = '79790631';

update public.sales_pipeline_stages
set name = 'Follow Up'
where kommo_pipeline_id = '9815931' and kommo_status_id = '91703923';

update public.sales_pipeline_stages
set name = 'Waiting for Payment'
where kommo_pipeline_id = '9815931' and kommo_status_id = '96150292';

update public.sales_pipeline_stages
set name = 'Confirmed Bookings'
where kommo_pipeline_id = '9815931' and kommo_status_id = '75440391';

update public.sales_pipeline_stages
set name = 'Delivery Within 24 Hours'
where kommo_pipeline_id = '9815931' and kommo_status_id = '75440395';

update public.sales_pipeline_stages
set name = 'Car with Customers'
where kommo_pipeline_id = '9815931' and kommo_status_id = '75440399';

update public.sales_pipeline_stages
set name = 'Pick Up Within 24 Hours'
where kommo_pipeline_id = '9815931' and kommo_status_id = '76475495';

update public.sales_pipeline_stages
set name = 'Objections'
where kommo_pipeline_id = '9815931' and kommo_status_id = '78486287';

update public.sales_pipeline_stages
set name = 'Refund Deposit'
where kommo_pipeline_id = '9815931' and kommo_status_id = '75440643';

update public.sales_pipeline_stages
set name = 'Deal Is Closed'
where kommo_pipeline_id = '9815931' and kommo_status_id = '75440639';

update public.sales_pipeline_stages
set name = 'Closed · Won'
where kommo_pipeline_id = '9815931' and kommo_status_id = '142';

-- Status 143 is intentionally excluded from bookings; update for completeness if present
update public.sales_pipeline_stages
set name = 'Closed · Lost'
where kommo_pipeline_id = '9815931' and kommo_status_id = '143';

