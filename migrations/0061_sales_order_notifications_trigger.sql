-- Function to queue sales order notifications
create or replace function public.queue_sales_order_notification()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only queue if zoho_sales_order_id has changed and is not null
  if (OLD.zoho_sales_order_id is distinct from NEW.zoho_sales_order_id) and (NEW.zoho_sales_order_id is not null) then
    insert into public.integrations_outbox (
      target_system,
      event_type,
      status,
      payload,
      created_at,
      next_run_at
    ) values (
      'telegram',
      'sales_order_linked',
      'pending',
      jsonb_build_object(
        'booking_id', NEW.id,
        'sales_order_id', NEW.zoho_sales_order_id,
        'sales_order_url', NEW.sales_order_url,
        'is_new', (OLD.zoho_sales_order_id is null)
      ),
      now(),
      now()
    );
  end if;
  return null;
end;
$$;

-- Trigger on bookings table
drop trigger if exists trg_queue_sales_order_notification on public.bookings;
create trigger trg_queue_sales_order_notification
  after update on public.bookings
  for each row
  execute function public.queue_sales_order_notification();
