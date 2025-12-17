create table if not exists public.kommo_pipeline_stages (
  id text primary key,
  label text not null,
  group_name text,
  description text,
  header_color text,
  border_color text,
  booking_status text,
  is_active boolean default true,
  updated_at timestamptz default timezone('utc', now())
);

-- Enable RLS
alter table public.kommo_pipeline_stages enable row level security;

-- Policies
create policy "Allow read access to authenticated users"
  on public.kommo_pipeline_stages for select
  to authenticated
  using (true);

create policy "Allow full access to admins and operations"
  on public.kommo_pipeline_stages for all
  to authenticated
  using (
    exists (
      select 1 from public.staff_accounts
      where id = auth.uid()
      and role in ('ceo', 'operations', 'integration')
    )
  );

-- Seed data
insert into public.kommo_pipeline_stages (id, label, group_name, description, header_color, border_color, booking_status)
values
  ('79790631', 'new lead', 'Intake', 'Bot logged lead; waiting on human follow-up.', '#99ccff', '#6fa8dc', 'new'),
  ('91703923', 'Follow up', 'Intake', 'Sales validating details with client.', '#99ccff', '#6fa8dc', 'new'),
  ('96699420', 'Qualification', 'Intake', 'Qualify lead before proposal.', '#bcd9ff', '#8db5e6', 'new'),
  ('98035992', 'Sales order sent', 'Preparation', 'Sales order issued; awaiting confirmation.', '#d6eaff', '#9cc3e4', 'preparation'),
  ('96150292', 'Payment Pending', 'Preparation', 'Hold assets until upfront payment clears.', '#cfe4ff', '#96bbe0', 'preparation'),
  ('75440391', 'Confirmed bookings', 'Preparation', 'Docs ready; assign vehicle and driver.', '#d6eaff', '#9cc3e4', 'preparation'),
  ('75440395', 'Delivery within 24h', 'Delivery', 'Prep delivery run for the upcoming day.', '#fffeb2', '#d6d37a', 'delivery'),
  ('75440399', 'Car with Customers', 'Live', 'Vehicle with client; monitor trip and SLA.', '#fffd7f', '#d4c95a', 'in-rent'),
  ('76475495', 'Pick up within 24h', 'Return', 'Schedule pickup and closing logistics.', '#ebffb1', '#b5d67d', 'delivery'),
  ('78486287', 'OBJECTIONS', 'Live', 'Customer raised concerns under review.', '#ebffb1', '#b5d67d', 'preparation'),
  ('75440643', 'Deposit Settled', 'Settlement', 'Processing inspections and deposit refund.', '#deff81', '#a9d44c', 'settlement'),
  ('75440639', 'Deal is Closed', 'Settlement', 'Paperwork complete; awaiting archive.', '#87f2c0', '#54c995', 'settlement'),
  ('142', 'Closed - won', 'Closed', 'Won lead; archive booking record.', '#ccff66', '#97d433', 'settlement'),
  ('143', 'lost', 'Closed', 'Lost lead; keep for reporting only.', '#d5d8db', '#a6a9ac', 'settlement')
on conflict (id) do nothing;
