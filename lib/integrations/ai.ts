import 'server-only'
import { isFeatureEnabled } from '@/lib/feature-flags'

type LeadSummaryInput = {
  leadId: string
  clientName: string
  itinerary: string
}

type LeadSummaryResponse = {
  mode: 'stubbed' | 'live'
  summary: string
  nextAction: string
}

export async function getLeadCopilotSummary(input: LeadSummaryInput): Promise<LeadSummaryResponse> {
  const enabled = await isFeatureEnabled('enableAiCopilot')

  if (!enabled) {
    return {
      mode: 'stubbed',
      summary: `Kommo lead ${input.leadId} for ${input.clientName} pending AI enablement.`,
      nextAction: 'Review documents, confirm fleet availability, then enable AI flag for narrative insights.',
    }
  }

  throw new Error('AI copilot integration not yet implemented - enable after provider contract is ready.')
}
