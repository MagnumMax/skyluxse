import 'server-only'
import { isFeatureEnabled } from '@/lib/feature-flags'

type TelemetryEvent = {
  type: 'sla_breach' | 'integration_retry'
  payload: Record<string, unknown>
}

type TelemetryResult = {
  status: 'skipped' | 'queued'
  mode: 'stubbed' | 'live'
}

export async function enqueueTelemetry(event: TelemetryEvent): Promise<TelemetryResult> {
  const enabled = await isFeatureEnabled('enableTelemetryPipelines')

  if (!enabled) {
    console.info('[telemetry:stubbed]', event)
    return { status: 'skipped', mode: 'stubbed' }
  }

  throw new Error('Telemetry pipelines not yet connected to external bus.')
}
