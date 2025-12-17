-- Remove 'Kommo · ' prefix from sales_pipeline_stages names
UPDATE public.sales_pipeline_stages
SET name = TRIM(REPLACE(name, 'Kommo · ', ''))
WHERE name LIKE 'Kommo · %';
