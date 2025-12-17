-- Add order_index column
alter table public.kommo_pipeline_stages 
add column if not exists order_index integer default 0;

-- Update existing rows with correct order
update public.kommo_pipeline_stages set order_index = 0 where id = '79790631';
update public.kommo_pipeline_stages set order_index = 1 where id = '91703923';
update public.kommo_pipeline_stages set order_index = 2 where id = '96699420';
update public.kommo_pipeline_stages set order_index = 3 where id = '98035992';
update public.kommo_pipeline_stages set order_index = 4 where id = '96150292';
update public.kommo_pipeline_stages set order_index = 5 where id = '75440391';
update public.kommo_pipeline_stages set order_index = 6 where id = '75440395';
update public.kommo_pipeline_stages set order_index = 7 where id = '75440399';
update public.kommo_pipeline_stages set order_index = 8 where id = '76475495';
update public.kommo_pipeline_stages set order_index = 9 where id = '78486287';
update public.kommo_pipeline_stages set order_index = 10 where id = '75440643';
update public.kommo_pipeline_stages set order_index = 11 where id = '75440639';
update public.kommo_pipeline_stages set order_index = 12 where id = '142';
update public.kommo_pipeline_stages set order_index = 13 where id = '143';
