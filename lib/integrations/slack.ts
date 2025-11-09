import 'server-only'
import { isFeatureEnabled } from '@/lib/feature-flags'

type AlertPayload = {
  channel: string
  title: string
  body: string
  severity?: 'info' | 'warn' | 'critical'
}

type AlertResult = {
  status: 'skipped' | 'queued'
  mode: 'stubbed' | 'live'
}

export async function sendSlackAlert(payload: AlertPayload): Promise<AlertResult> {
  const enabled = await isFeatureEnabled('enableSlackAlerts')

  if (!enabled) {
    console.info('[slack:stubbed]', payload)
    return { status: 'skipped', mode: 'stubbed' }
  }

  throw new Error('Slack webhook dispatch not yet wired. Enable after secrets rotation.')
}
