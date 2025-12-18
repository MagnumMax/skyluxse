-- Lock task_additional_services for completed tasks

drop trigger if exists trg_lock_task_services on public.task_additional_services;
create trigger trg_lock_task_services
  before insert or update or delete on public.task_additional_services
  for each row execute function public.check_task_child_modification();
