-- Merge client document fields into standard fields (07 Dec 2025)

-- 1. Add new standard columns
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS middle_name text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS nationality text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS document_number text,
ADD COLUMN IF NOT EXISTS issue_date date,
ADD COLUMN IF NOT EXISTS expiry_date date,
ADD COLUMN IF NOT EXISTS issuing_country text,
ADD COLUMN IF NOT EXISTS driver_license_class text,
ADD COLUMN IF NOT EXISTS driver_license_restrictions text,
ADD COLUMN IF NOT EXISTS driver_license_endorsements text;

-- 2. Migrate data from doc_* fields
UPDATE public.clients
SET
  name = COALESCE(doc_full_name, name),
  first_name = doc_first_name,
  last_name = doc_last_name,
  middle_name = doc_middle_name,
  date_of_birth = doc_date_of_birth::date,
  nationality = doc_nationality,
  address = doc_address,
  document_number = doc_document_number,
  issue_date = doc_issue_date::date,
  expiry_date = doc_expiry_date::date,
  issuing_country = doc_issuing_country,
  driver_license_class = doc_driver_class,
  driver_license_restrictions = doc_driver_restrictions,
  driver_license_endorsements = doc_driver_endorsements
WHERE
  doc_status = 'done' OR doc_status = 'done_multi';

-- 3. Drop migrated doc_* columns
ALTER TABLE public.clients
DROP COLUMN IF EXISTS doc_full_name,
DROP COLUMN IF EXISTS doc_first_name,
DROP COLUMN IF EXISTS doc_last_name,
DROP COLUMN IF EXISTS doc_middle_name,
DROP COLUMN IF EXISTS doc_date_of_birth,
DROP COLUMN IF EXISTS doc_nationality,
DROP COLUMN IF EXISTS doc_address,
DROP COLUMN IF EXISTS doc_document_number,
DROP COLUMN IF EXISTS doc_issue_date,
DROP COLUMN IF EXISTS doc_expiry_date,
DROP COLUMN IF EXISTS doc_issuing_country,
DROP COLUMN IF EXISTS doc_driver_class,
DROP COLUMN IF EXISTS doc_driver_restrictions,
DROP COLUMN IF EXISTS doc_driver_endorsements;
