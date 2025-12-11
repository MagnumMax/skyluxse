-- 2025-11-XX: Capture required inputs and values for driver tasks

create table if not exists public.task_required_inputs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  key text not null,
  label text not null,
  input_type text not null check (input_type in ('number','text','select','file')),
  accept text,
  multiple boolean default false,
  required boolean default false,
  options text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (task_id, key)
);

create table if not exists public.task_required_input_values (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  key text not null,
  value_number numeric,
  value_text text,
  value_json jsonb,
  storage_paths text[],
  bucket text,
  document_id uuid references public.documents(id) on delete set null,
  captured_by uuid references public.staff_accounts(id) on delete set null,
  captured_at timestamptz not null default timezone('utc', now()),
  unique (task_id, key)
);

drop trigger if exists trg_task_required_inputs_updated on public.task_required_inputs;
create trigger trg_task_required_inputs_updated
  before update on public.task_required_inputs
  for each row execute function public.set_updated_at();

drop trigger if exists trg_task_required_input_values_updated on public.task_required_input_values;
create trigger trg_task_required_input_values_updated
  before update on public.task_required_input_values
  for each row execute function public.set_updated_at();

-- RLS: service role full access; driver inserts/updates allowed via service role in server actions
alter table public.task_required_inputs enable row level security;
alter table public.task_required_input_values enable row level security;

do $$
begin
  create policy "task required inputs service role" on public.task_required_inputs
    for all using (auth.role() = 'service_role') with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "task required input values service role" on public.task_required_input_values
    for all using (auth.role() = 'service_role') with check (true);
exception
  when duplicate_object then null;
end $$;
