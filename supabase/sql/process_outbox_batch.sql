-- Processes a batch of integration outbox rows and invokes HTTP endpoints via http extension.
-- This is a placeholder spec; actual implementation will depend on Supabase http extensions or
-- calling Edge Functions from server-side worker. RPC signature matches `process_outbox_batch`
-- invoked by the Edge Function `process-outbox`.
CREATE OR REPLACE FUNCTION process_outbox_batch(
  batch_size integer DEFAULT 25,
  max_attempts integer DEFAULT 5,
  retry_base_seconds integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  picked RECORD;
  processed integer := 0;
BEGIN
  FOR picked IN
    SELECT * FROM integrations_outbox
    WHERE status = 'pending' AND next_run_at <= now()
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT batch_size
  LOOP
    processed := processed + 1;
    UPDATE integrations_outbox
      SET status = 'processing', attempts = attempts + 1, updated_at = now()
      WHERE id = picked.id;

    -- Actual HTTP calls handled in Edge Function; here we simply return metadata.
    UPDATE integrations_outbox
      SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
          last_error = 'Not implemented in SQL stub',
          next_run_at = now() + (retry_base_seconds * (attempts + 1)) * interval '1 second'
      WHERE id = picked.id;
  END LOOP;

  RETURN jsonb_build_object('processed', processed);
END;
$$;
