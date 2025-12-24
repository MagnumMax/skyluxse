
import { NextResponse } from "next/server"
import { serviceClient } from "@/lib/supabase/service-client"
import { validateApiKey } from "@/lib/auth/api-key"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!(await validateApiKey())) {
    return NextResponse.json({ error: "Unauthorized", message: "Invalid or missing API key" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get("date_from")
    const dateTo = searchParams.get("date_to")

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: "Missing required parameter", message: "date_from and date_to are required" }, { status: 400 })
    }

    if (dateFrom > dateTo) {
        return NextResponse.json({ error: "Invalid date parameters", message: "date_from must be before date_to" }, { status: 400 })
    }

    // 1. Find occupied cars
    // We check for overlaps: booking.start <= requested.to AND booking.end >= requested.from
    // Also exclude cancelled bookings.
    const { data: occupied, error: bookingError } = await serviceClient
      .from("bookings")
      .select("vehicle_id")
      .neq("status", "cancelled") 
      .lte("start_at", dateTo)
      .gte("end_at", dateFrom)
    
    if (bookingError) {
      console.error("Error fetching bookings:", bookingError)
      return NextResponse.json({ error: "Internal server error", message: "Failed to check availability" }, { status: 500 })
    }

    const occupiedIds = new Set(occupied?.map(b => b.vehicle_id).filter(Boolean))

    // 2. Fetch available cars
    // Limit to 10 as per TЗ
    // We can fetch more and filter in memory if the fleet is small, or use .not('id', 'in', ...)
    
    let query = serviceClient
      .from("vehicles")
      .select(`
        id,
        name,
        make,
        model,
        model_year,
        seating_capacity,
        rental_prices,
        utilization_pct,
        status
      `)
      .eq("status", "available") // Only inherently available cars
      .order("utilization_pct", { ascending: false })
      .limit(50) // Fetch a bit more to ensure we have 10 after filtering (though .not.in is better)

    if (occupiedIds.size > 0) {
        // PostgREST supports 'not.in'
        // Convert Set to array
        const ids = Array.from(occupiedIds)
        // If too many IDs, might hit URL length limit, but for fleet it's okay.
        query = query.not("id", "in", `(${ids.join(',')})`)
    }
    
    const { data: vehicles, error: vehicleError } = await query

    if (vehicleError) {
      console.error("Error fetching vehicles:", vehicleError)
      return NextResponse.json({ error: "Internal server error", message: vehicleError.message }, { status: 500 })
    }

    // Limit to 10
    const availableVehicles = vehicles.slice(0, 10).map(vehicle => ({
      id: vehicle.id,
      car: vehicle.make || vehicle.name?.split(" ")[0] || "Unknown",
      model: vehicle.model || vehicle.name?.split(" ").slice(1).join(" ") || "Unknown",
      year: vehicle.model_year,
      seats: vehicle.seating_capacity,
      prices: vehicle.rental_prices || {
        daily: 0,
        weekly: 0,
        monthly: 0,
        minimumDays: 1
      },
      availability: {
        from: dateFrom,
        to: dateTo
      }
    }))

    return NextResponse.json({
      data: availableVehicles,
      meta: {
        total: availableVehicles.length,
        limit: 10,
        dateFrom,
        dateTo
      }
    })

  } catch (err) {
    console.error("Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error", message: "Unexpected error occurred" }, { status: 500 })
  }
}
