
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

  // Constant time comparison would be better but simple string compare is okay for this scope
  return providedKey === ENV_API_KEY
}
