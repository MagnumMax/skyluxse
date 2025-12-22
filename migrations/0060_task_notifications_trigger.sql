-- Function to queue task notifications
create or replace function public.queue_task_notification()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only queue for newly created tasks
  -- You can add filters here (e.g. only specific types)
  insert into public.integrations_outbox (
    target_system,
    event_type,
    status,
    payload,
    created_at,
    next_run_at
  ) values (
    'telegram',
    'task_created',
    'pending',
    jsonb_build_object('task_id', NEW.id),
    now(),
    now()
  );
  return null;
end;
$$;

-- Trigger on tasks table
drop trigger if exists trg_queue_task_notification on public.tasks;
create trigger trg_queue_task_notification
  after insert on public.tasks
  for each row
  execute function public.queue_task_notification();
