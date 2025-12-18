-- Lock completed tasks and their related data from modification

-- Function to lock tasks table
create or replace function public.check_task_modification()
returns trigger
language plpgsql
as $$
begin
  if OLD.status = 'done' then
    raise exception 'Cannot modify a completed task';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_lock_completed_tasks on public.tasks;
create trigger trg_lock_completed_tasks
  before update or delete on public.tasks
  for each row execute function public.check_task_modification();

-- Function to lock child tables (checklist, inputs)
create or replace function public.check_task_child_modification()
returns trigger
language plpgsql
as $$
declare
  t_status public.task_status;
  t_id uuid;
begin
  if TG_OP = 'DELETE' then
    t_id := OLD.task_id;
  else
    t_id := NEW.task_id;
  end if;

  select status into t_status from public.tasks where id = t_id;

  if t_status = 'done' then
    raise exception 'Cannot modify items of a completed task';
  end if;

  return NEW;
end;
$$;

-- Apply to task_checklist_items
drop trigger if exists trg_lock_task_checklist on public.task_checklist_items;
create trigger trg_lock_task_checklist
  before insert or update or delete on public.task_checklist_items
  for each row execute function public.check_task_child_modification();

-- Apply to task_required_input_values
drop trigger if exists trg_lock_task_inputs on public.task_required_input_values;
create trigger trg_lock_task_inputs
  before insert or update or delete on public.task_required_input_values
  for each row execute function public.check_task_child_modification();

-- Apply to task_required_inputs (definitions)
drop trigger if exists trg_lock_task_input_defs on public.task_required_inputs;
create trigger trg_lock_task_input_defs
  before insert or update or delete on public.task_required_inputs
  for each row execute function public.check_task_child_modification();

-- Function to lock document links for tasks
create or replace function public.check_document_link_modification()
returns trigger
language plpgsql
as $$
declare
  t_status public.task_status;
  e_id uuid;
  d_scope public.document_scope;
begin
  if TG_OP = 'DELETE' then
    e_id := OLD.entity_id;
    d_scope := OLD.scope;
  else
    e_id := NEW.entity_id;
    d_scope := NEW.scope;
  end if;

  if d_scope = 'task' then
    select status into t_status from public.tasks where id = e_id;
    if t_status = 'done' then
      raise exception 'Cannot modify documents of a completed task';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_lock_task_documents on public.document_links;
create trigger trg_lock_task_documents
  before insert or update or delete on public.document_links
  for each row execute function public.check_document_link_modification();
