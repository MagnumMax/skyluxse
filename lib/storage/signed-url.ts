import "server-only"
import { serviceClient } from "@/lib/supabase/service-client"
import { buildStoragePublicUrl as fallbackPublicUrl } from "@/lib/data/live-data"

const SUPABASE_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SIGNED_URL_TTL_SECONDS = 60 * 60

type MaybeString = string | null | undefined

/**
 * Builds a signed URL for Supabase Storage objects.
 * Falls back to a public URL if signing fails or public-only access is desired.
 */
export async function createSignedUrl(bucket: MaybeString, path: MaybeString): Promise<string | undefined> {
  if (!bucket || !path) return undefined
  const normalizedPath = path.replace(/^\/+/, "")
  try {
    const { data, error } = await serviceClient.storage.from(bucket).createSignedUrl(normalizedPath, SIGNED_URL_TTL_SECONDS)
    if (error || !data?.signedUrl) {
      console.warn("[supabase] Failed to sign storage URL", { bucket, path: normalizedPath, error })
      return fallbackPublicUrl(bucket, normalizedPath)
    }
    const signedUrl = data.signedUrl
    if (signedUrl.startsWith("http")) {
      return signedUrl
    }

    // Fallback to service client URL if env var is missing
    const baseUrl = SUPABASE_PUBLIC_URL || (serviceClient as any).supabaseUrl
    if (baseUrl) {
      // Ensure we don't double slash
      const prefix = baseUrl.replace(/\/$/, "")
      const suffix = signedUrl.startsWith("/") ? signedUrl : `/${signedUrl}`
      return `${prefix}${suffix}`
    }

    return signedUrl
  } catch (error) {
    console.warn("[supabase] Unexpected error while signing URL", { bucket, path: normalizedPath, error })
    return fallbackPublicUrl(bucket, normalizedPath)
  }
}
