export const clientSegmentLabels: Record<string, string> = {
  premier_loyalist: "Премиум активен",
  dormant_vip: "VIP неактивен",
  growth_gold: "Gold растёт",
  at_risk: "Под риском",
  new_rising: "Новый клиент",
  high_value_dormant: "Ценный, но неактивный",
  general: "Общий сегмент",
}

export const clientSegmentFilterOptions = Object.entries(clientSegmentLabels).map(([value, label]) => ({
  value,
  label,
}))

export function getClientSegmentLabel(segment?: string | null) {
  if (!segment) {
    return clientSegmentLabels.general
  }
  return clientSegmentLabels[segment] ?? clientSegmentLabels.general
}
