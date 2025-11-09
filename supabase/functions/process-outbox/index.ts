import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"

const BATCH_SIZE = Number(Deno.env.get("OUTBOX_BATCH_SIZE") ?? 20)
const MAX_ATTEMPTS = Number(Deno.env.get("OUTBOX_MAX_ATTEMPTS") ?? 5)
const FEATURE_FLAG_KEY = 'enableZohoLive'

function getServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

async function isFeatureFlagEnabled(client: SupabaseClient, flag: string) {
  const { data } = await client
    .from('system_feature_flags')
    .select('is_enabled')
    .eq('flag', flag)
    .maybeSingle()

  return data?.is_enabled ?? false
}

serve(async () => {
  try {
    const supabase = getServiceClient()
    const { data: jobs, error } = await supabase
      .from("integrations_outbox")
      .select("id, target_system, event_type, payload, attempts")
      .eq("status", "pending")
      .lte("next_run_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE)

    if (error) {
      console.error("Failed to fetch outbox jobs", error)
      return new Response(JSON.stringify({ error: "fetch_failed" }), { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ status: "idle" }), { status: 200 })
    }

    const enableZoho = await isFeatureFlagEnabled(supabase, FEATURE_FLAG_KEY)
    const results = []

    for (const job of jobs) {
      if (job.attempts >= MAX_ATTEMPTS) {
        const { error: failureError } = await supabase
          .from("integrations_outbox")
          .update({ status: "failed", last_error: "max_attempts" })
          .eq("id", job.id)
        if (failureError) {
          console.error("Failed to mark job as failed", { jobId: job.id, failureError })
        }
        results.push({ id: job.id, status: "failed", reason: "max_attempts" })
        continue
      }

      if (!enableZoho) {
        const { error: stubError } = await supabase
          .from("integrations_outbox")
          .update({
            status: "succeeded",
            attempts: job.attempts + 1,
            response: { mode: "stubbed", processed_at: new Date().toISOString() },
          })
          .eq("id", job.id)
        if (stubError) {
          console.error("Failed to stub job", { jobId: job.id, stubError })
          continue
        }
        results.push({ id: job.id, status: "succeeded", mode: "stubbed" })
        continue
      }

      // Placeholder for live Zoho dispatch. For now, mark as processing and immediately succeeded.
      const { error: liveError } = await supabase
        .from("integrations_outbox")
        .update({
          status: "succeeded",
          attempts: job.attempts + 1,
          response: { mode: "live-placeholder", processed_at: new Date().toISOString() },
        })
        .eq("id", job.id)
      if (liveError) {
        console.error("Failed to update live placeholder job", { jobId: job.id, liveError })
        continue
      }
      results.push({ id: job.id, status: "succeeded", mode: "live-placeholder" })
    }

    return new Response(JSON.stringify({ status: "processed", results }), { status: 200 })
  } catch (error) {
    console.error("process-outbox error", error)
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 })
  }
})
