with stage_seed(id, name, probability, sla_days, kommo_pipeline_id, kommo_status_id, booking_status) as (
  values
    -- 9815931 Sales / Booking Funnel
    ('skyluxse_incoming', 'Неразобранное', 0.15, 3, '9815931', '75440383', 'lead'),
    ('skyluxse_bot_answering', 'new lead', 0.2, 2, '9815931', '79790631', 'lead'),
    ('skyluxse_qualification', 'Qualification', 0.3, 3, '9815931', '96699420', 'lead'),
    ('skyluxse_follow_up', 'Follow up', 0.35, 4, '9815931', '91703923', 'lead'),
    ('skyluxse_sales_order_sent', 'Sales order sent', 0.5, 3, '9815931', '98035992', 'confirmed'),
    ('skyluxse_waiting_payment', 'Payment Pending', 0.55, 3, '9815931', '96150292', 'confirmed'),
    ('skyluxse_confirmed', 'Confirmed bookings', 0.8, 2, '9815931', '75440391', 'confirmed'),
    ('skyluxse_delivery_24h', 'Delivery within 24h', 0.9, 1, '9815931', '75440395', 'delivery'),
    ('skyluxse_with_customer', 'Car with Customers', 0.95, 5, '9815931', '75440399', 'in_progress'),
    ('skyluxse_pickup_24h', 'Pick up within 24h', 0.97, 2, '9815931', '76475495', 'completed'),
    ('skyluxse_objections', 'OBJECTIONS', 0.4, 3, '9815931', '78486287', 'lead'),
    ('skyluxse_refund_deposit', 'Deposit Settled', 0.7, 4, '9815931', '75440643', 'completed'),
    ('skyluxse_deal_closed', 'Deal is Closed', 0.99, 1, '9815931', '75440639', 'completed'),
    ('skyluxse_closed_won', 'Closed - won', 1.0, 0, '9815931', '142', 'completed'),
    ('skyluxse_closed_lost', 'lost', 0.0, 0, '9815931', '143', 'cancelled'),
    -- 10852939 Rental Operations Funnel
    ('rental_ops_incoming', 'Неразобранное', 0.15, 3, '10852939', '83223803', 'lead'),
    ('rental_ops_reservation_created', 'Reservation Created', 0.5, 3, '10852939', '83223807', 'confirmed'),
    ('rental_ops_pre_rental_check', 'Pre-Rental Check', 0.6, 3, '10852939', '88078291', 'confirmed'),
    ('rental_ops_vehicle_delivery', 'Vehicle Delivery', 0.8, 2, '10852939', '83223811', 'delivery'),
    ('rental_ops_active_rental', 'Active Rental', 0.9, 5, '10852939', '97688500', 'in_progress'),
    ('rental_ops_return_scheduled', 'Return Scheduled', 0.95, 2, '10852939', '97688504', 'in_progress'),
    ('rental_ops_vehicle_returned', 'Vehicle Returned', 1.0, 0, '10852939', '97688508', 'completed'),
    ('rental_ops_closed_won', 'Успешно реализовано', 1.0, 0, '10852939', '142', 'completed'),
    ('rental_ops_closed_lost', 'Закрыто и не реализовано', 0.0, 0, '10852939', '143', 'cancelled'),
    -- 10988431 Settlement & Finance Funnel
    ('finance_incoming', 'Неразобранное', 0.15, 3, '10988431', '84280207', 'lead'),
    ('finance_dispute_open', 'Dispute Open', 0.3, 3, '10988431', '84280215', 'lead'),
    ('finance_dispute_resolved', 'dispute Resolved', 0.9, 2, '10988431', '84280311', 'completed'),
    ('finance_deposit_settled', 'Deposit Settled', 0.95, 2, '10988431', '84280219', 'completed'),
    ('finance_invoice_closed', 'Invoice Closed', 1.0, 0, '10988431', '97688812', 'completed'),
    ('finance_closed_won', 'Closed - won', 1.0, 0, '10988431', '142', 'completed'),
    ('finance_closed_lost', 'Closed - lost', 0.0, 0, '10988431', '143', 'cancelled')
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

