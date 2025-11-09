import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 25;
const RETRY_BASE_SECONDS = 60;

serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/process_outbox_batch`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        batch_size: BATCH_SIZE,
        max_attempts: MAX_ATTEMPTS,
        retry_base_seconds: RETRY_BASE_SECONDS,
      }),
    });

    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("process-outbox error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
