
import { headers } from "next/headers"

const API_KEY_HEADER = "x-api-key"

export async function validateApiKey() {
  const ENV_API_KEY = process.env.CHATBOT_API_KEY
  
  // If no API key is configured in env, we might want to default to allowing or failing.
  // Secure by default: if env var is missing, fail (unless we want to allow public access temporarily).
  // Given this is for a specific chatbot integration, let's enforce it if the env var is present.
  // If env var is NOT present, we should probably block or log a warning.
  // Let's enforce it strictly.
  
  if (!ENV_API_KEY) {
    console.warn("CHATBOT_API_KEY is not set in environment variables. Rejecting request.")
    return false
  }

  const headerList = await headers()
  const providedKey = headerList.get(API_KEY_HEADER)

  if (!providedKey) return false

  // Constant time comparison to prevent timing attacks
  const encoder = new TextEncoder()
  const a = encoder.encode(providedKey)
  const b = encoder.encode(ENV_API_KEY)

  if (a.length !== b.length) {
    return false
  }

  // crypto.timingSafeEqual requires buffers of equal length
  // In Edge runtime or browser environments where crypto.timingSafeEqual might differ, 
  // we can use a custom implementation or standard crypto if available.
  // Next.js runs in Node/Edge. 
  try {
    // @ts-ignore - timingSafeEqual is not in the standard Web Crypto API type definition but available in some environments
    return crypto.timingSafeEqual(a, b)
  } catch (e) {
    // Fallback for environments where timingSafeEqual might fail or strict types
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i]
    }
    return result === 0
  }
}
