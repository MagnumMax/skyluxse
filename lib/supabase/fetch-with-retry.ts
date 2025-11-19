'use server'

const DEFAULT_TIMEOUT_MS = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS ?? 15_000)
const DEFAULT_RETRIES = Number(process.env.SUPABASE_FETCH_RETRIES ?? 2)
const RETRYABLE_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"])

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function isRetryable(error: unknown) {
  if (!error || typeof error !== "object") return false
  const anyErr = error as { code?: string; cause?: { code?: string }; name?: string; message?: string }
  const code = anyErr.code || anyErr.cause?.code
  if (code && RETRYABLE_CODES.has(code)) return true
  if (anyErr.name === "AbortError") return true
  return anyErr.message?.toLowerCase().includes("fetch failed") ?? false
}

export async function supabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let lastError: unknown

  for (let attempt = 1; attempt <= DEFAULT_RETRIES + 1; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(new Error(`Supabase fetch timed out after ${DEFAULT_TIMEOUT_MS}ms`)),
      DEFAULT_TIMEOUT_MS
    )

    try {
      // Use the passed signal if present to respect upstream cancellation.
      const signal = init?.signal ?? controller.signal
      return await fetch(input, { ...init, signal, cache: "no-store" })
    } catch (error) {
      lastError = error
      if (!isRetryable(error) || attempt > DEFAULT_RETRIES) break
      // Small backoff to avoid hammering the endpoint on transient network faults.
      await wait(100 * attempt)
    } finally {
      clearTimeout(timeout)
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Supabase fetch failed")
}
