DO $$
BEGIN
  EXECUTE 'ALTER TYPE public.client_segment RENAME VALUE ''premier_loyalист'' TO ''premier_loyalist''';
EXCEPTION
  WHEN undefined_object THEN NULL;
END$$;
