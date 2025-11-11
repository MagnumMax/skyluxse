insert into public.sales_pipeline_stages (id, name, probability, sla_days)
values
  ('skyluxse_bot_answering', 'Kommo · Bot answering', 0.05, 1),
  ('skyluxse_confirmed', 'Kommo · Confirmed booking', 0.8, 2),
  ('skyluxse_delivery_24h', 'Kommo · Delivery within 24h', 0.9, 1),
  ('skyluxse_with_customer', 'Kommo · With customer', 0.95, 5)
on conflict (id) do update set
  name = excluded.name,
  probability = excluded.probability,
  sla_days = excluded.sla_days;
