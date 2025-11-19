import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { supabaseFetch } from '@/lib/supabase/fetch-with-retry'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL env var')
}

if (!serviceKey) {
  throw new Error('[supabase] Missing SUPABASE_SERVICE_ROLE_KEY env var (server-side only)')
}

export const serviceClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
  },
  global: {
    fetch: supabaseFetch,
  },
})
