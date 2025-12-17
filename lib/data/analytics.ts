import { cache } from "react"

import type { Booking, EntityId, ExecDashboardData, ExecReportsSnapshot } from "@/lib/domain/entities"
import { getLiveBookings, getLiveClients, getLiveFleetVehicles } from "@/lib/data/live-data"
import { toDubaiDate } from "@/lib/formatters"

export type AnalyticsSnapshot = {
  rangeOptions: string[]
  pipeline: Array<{ id: string; label: string; value: number; velocity: string; probability: string }>
  managerRevenue: Array<{ manager: string; revenue: number }>
  sourceBreakdown: Array<{ source: string; value: number }>
  rating: { average: number; caption: string; updated: string }
}

const RANGE_OPTIONS = ["7d", "30d", "90d"]
const EXPENSE_RATE = 0.62

export const getAnalyticsSnapshot = cache(async (): Promise<AnalyticsSnapshot> => {
  const [bookings, clients] = await Promise.all([getLiveBookings(), getLiveClients()])
  const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.totalAmount ?? 0), 0)

  const pipelineDefs = [
    { id: "new", label: "New booking", probability: "30%", filter: (status: string) => status === "new" },
    { id: "preparation", label: "Preparation", probability: "45%", filter: (status: string) => status === "preparation" },
    { id: "delivery", label: "Delivery", probability: "60%", filter: (status: string) => status === "delivery" },
    { id: "in-rent", label: "In rent", probability: "90%", filter: (status: string) => status === "in-rent" },
    { id: "settlement", label: "Settlement", probability: "100%", filter: (status: string) => status === "settlement" },
  ]

  const pipeline = pipelineDefs.map((stage) => {
    const value = bookings.filter((booking) => stage.filter(booking.status)).length
    const velocity = value > 0 ? `${Math.max(1, Math.round(7 / value))}d` : "—"
    return { id: stage.id, label: stage.label, value, velocity, probability: stage.probability }
  })

  const revenueByManager = new Map<string, number>()
  bookings.forEach((booking) => {
    const owner = booking.ownerName ?? booking.ownerId ?? "Unassigned"
    const current = revenueByManager.get(owner) ?? 0
    revenueByManager.set(owner, current + (booking.totalAmount ?? 0))
  })
  const managerRevenue = Array.from(revenueByManager.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([manager, revenue]) => ({ manager, revenue }))

  const revenueBySource = new Map<string, number>()
  bookings.forEach((booking) => {
    const source = booking.channel || "Unknown"
    revenueBySource.set(source, (revenueBySource.get(source) ?? 0) + (booking.totalAmount ?? 0))
  })
  const sourceBreakdown = Array.from(revenueBySource.entries()).map(([source, revenue]) => ({
    source,
    value: totalRevenue ? Math.round((revenue / totalRevenue) * 100) : 0,
  }))

  const avgNps = clients.length ? clients.reduce((sum, client) => sum + (client.nps ?? 0), 0) / clients.length : 0
  const ratingCaption = avgNps >= 8 ? "Excellent" : avgNps >= 6 ? "Healthy" : "Needs attention"

  return {
    rangeOptions: RANGE_OPTIONS,
    pipeline,
    managerRevenue,
    sourceBreakdown,
    rating: {
      average: Number(avgNps.toFixed(1)),
      caption: ratingCaption,
      updated: new Date().toLocaleString("en-CA", { hour12: false, timeZone: "Asia/Dubai" }),
    },
  }
})

export const getExecReportsSnapshot = cache(async (): Promise<ExecReportsSnapshot> => {
  const [bookings, vehicles] = await Promise.all([getLiveBookings(), getLiveFleetVehicles()])
  const revenueDaily = new Map<string, { revenue: number; expenses: number; bookings: number }>()

  bookings.forEach((booking) => {
    const date = normalizeDateKey(booking.startDate)
    const revenue = booking.totalAmount ?? 0
    const expenses = revenue * EXPENSE_RATE
    const entry = revenueDaily.get(date) ?? { revenue: 0, expenses: 0, bookings: 0 }
    entry.revenue += revenue
    entry.expenses += expenses
    entry.bookings += 1
    revenueDaily.set(date, entry)
  })

  const revenueTotals = Array.from(revenueDaily.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1))
  const totalRevenue = revenueTotals.reduce((sum, [, entry]) => sum + entry.revenue, 0)
  const totalExpenses = revenueTotals.reduce((sum, [, entry]) => sum + entry.expenses, 0)

  const financials = {
    revenue: Math.round(totalRevenue),
    expenses: Math.round(totalExpenses),
    profit: Math.round(totalRevenue - totalExpenses),
  }

  const topVehicles = Array.from(
    bookings.reduce((map, booking) => {
      const key = booking.carName || "Vehicle"
      const current = map.get(key) ?? { revenue: 0, utilization: 0 }
      current.revenue += booking.totalAmount ?? 0
      current.utilization += 1
      map.set(key, current)
      return map
    }, new Map<string, { revenue: number; utilization: number }>())
  )
    .map(([name, stats]) => {
      const vehicle = vehicles.find((car) => car.name === name)
      const utilization = vehicle ? vehicle.utilization : stats.utilization / Math.max(bookings.length, 1)
      return { name, revenue: Math.round(stats.revenue), utilization }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const channelMix = buildChannelMix(bookings)

  return {
    periodLabel: "Last 7 days",
    financials,
    revenueDaily: revenueTotals.map(([date, entry]) => ({ date, revenue: Math.round(entry.revenue), expenses: Math.round(entry.expenses) })),
    topVehicles,
    channelMix,
  }
})

export const getExecDashboardMetrics = cache(async (): Promise<ExecDashboardData> => {
  const [vehicles, bookings, clients] = await Promise.all([getLiveFleetVehicles(), getLiveBookings(), getLiveClients()])

  const fleetUtilization = vehicles.length
    ? vehicles.reduce((sum, vehicle) => sum + (vehicle.utilization ?? 0), 0) / vehicles.length
    : 0

  const slaBookings = bookings.filter((booking) => typeof booking.targetTime === "number")
  const slaMet = slaBookings.filter((booking) => (booking.targetTime ?? 0) >= Date.now()).length
  const slaCompliance = slaBookings.length ? slaMet / slaBookings.length : 1

  const clientNps = clients.length ? clients.reduce((sum, client) => sum + (client.nps ?? 0), 0) / clients.length : 0
  const revenueTrend = buildRevenueTrend(bookings)
  const driverPerformance = buildDriverPerformance(bookings)

  return {
    kpis: {
      fleetUtilization,
      slaCompliance,
      activeBookings: bookings.filter((booking) => booking.status !== "settlement").length,
      clientNps: clientNps / 10,
    },
    revenueTrend,
    driverPerformance,
  }
})

function buildRevenueTrend(bookings: Booking[]): ExecDashboardData["revenueTrend"] {
  const daily = new Map<string, { revenue: number; expenses: number; bookings: number }>()
  bookings.forEach((booking) => {
    const date = normalizeDateKey(booking.startDate)
    const revenue = booking.totalAmount ?? 0
    const entry = daily.get(date) ?? { revenue: 0, expenses: 0, bookings: 0 }
    entry.revenue += revenue
    entry.expenses += revenue * EXPENSE_RATE
    entry.bookings += 1
    daily.set(date, entry)
  })
  return Array.from(daily.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-7)
    .map(([date, entry]) => ({ date, revenue: Math.round(entry.revenue), expenses: Math.round(entry.expenses), bookings: entry.bookings }))
}

function buildDriverPerformance(bookings: Booking[]): ExecDashboardData["driverPerformance"] {
  const byDriver = new Map<EntityId, { total: number; completed: number; rating: number; ratingsCount: number }>()
  bookings.forEach((booking) => {
    if (!booking.driverId) return
    const bucket = byDriver.get(booking.driverId) ?? { total: 0, completed: 0, rating: 0, ratingsCount: 0 }
    bucket.total += 1
    if (booking.status === "settlement") {
      bucket.completed += 1
    }
    if (booking.salesService?.rating) {
      bucket.rating += booking.salesService.rating
      bucket.ratingsCount += 1
    }
    byDriver.set(booking.driverId, bucket)
  })

  return Array.from(byDriver.entries())
    .map(([driverId, stats]) => ({
      driverId,
      completionRate: stats.total ? stats.completed / stats.total : 0,
      nps: stats.ratingsCount ? stats.rating / stats.ratingsCount / 2 : 0.4,
    }))
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 5)
}

function buildChannelMix(bookings: Booking[]) {
  const revenueByChannel = new Map<string, number>()
  bookings.forEach((booking) => {
    const channel = booking.channel || "Unknown"
    revenueByChannel.set(channel, (revenueByChannel.get(channel) ?? 0) + (booking.totalAmount ?? 0))
  })
  const totalRevenue = Array.from(revenueByChannel.values()).reduce((sum, value) => sum + value, 0)
  return Array.from(revenueByChannel.entries()).map(([channel, revenue]) => ({
    channel,
    revenue: Math.round(revenue),
    share: totalRevenue ? revenue / totalRevenue : 0,
  }))
}

function normalizeDateKey(value: string) {
  if (!value) {
    const now = toDubaiDate(new Date())
    return now.toISOString().slice(0, 10)
  }
  try {
    const date = toDubaiDate(value)
    return date.toISOString().slice(0, 10)
  } catch {
    return value
  }
}
