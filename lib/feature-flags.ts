import 'server-only'
import { cache } from 'react'
import { serviceClient } from '@/lib/supabase/service-client'

export type FeatureFlag =
  | 'enableKommoLive'
  | 'enableZohoLive'
  | 'enableSlackAlerts'
  | 'enableAiCopilot'
  | 'enableTelemetryPipelines'

export type FeatureFlagSnapshot = Record<FeatureFlag, boolean>

const fetchFlags = cache(async () => {
  const { data, error } = await serviceClient
    .from('system_feature_flags')
    .select('flag, is_enabled')

  if (error) {
    throw error
  }

  const snapshot = data?.reduce((acc, row) => {
    acc[row.flag as FeatureFlag] = row.is_enabled
    return acc
  }, {} as FeatureFlagSnapshot) ?? {}

  return snapshot
})

export async function isFeatureEnabled(flag: FeatureFlag) {
  const snapshot = await fetchFlags()
  return snapshot[flag] ?? false
}

export async function getFeatureFlags() {
  return fetchFlags()
}
