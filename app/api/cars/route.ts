
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
    const car = searchParams.get("car")
    const model = searchParams.get("model")
    const year = searchParams.get("year")
    const seats = searchParams.get("seats")
    const minDailyPrice = searchParams.get("minDailyPrice")
    const maxDailyPrice = searchParams.get("maxDailyPrice")
    const type = searchParams.get("type")
    const limit = parseInt(searchParams.get("limit") || "10", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    let query = serviceClient
      .from("vehicles")
      .select(`
        id,
        name,
        make,
        model,
        model_year,
        seating_capacity,
        status,
        rental_prices,
        utilization_pct,
        image_url,
        body_style
      `, { count: 'exact' })
      .eq("status", "available") // Only available cars by default as per TЗ context (available for upcoming dates is tricky without date param, but let's start with status check)

    if (car) query = query.ilike("make", `%${car}%`)
    if (model) query = query.ilike("model", `%${model}%`)
    if (year) query = query.eq("model_year", year)
    if (seats) query = query.eq("seating_capacity", seats)
    if (type) query = query.ilike("body_style", `%${type}%`)

    // Price filtering needs to be done carefully with JSONB or fetch all and filter.
    // Supabase supports JSONB filtering.
    // rental_prices->daily
    if (minDailyPrice) query = query.gte("rental_prices->daily", minDailyPrice)
    if (maxDailyPrice) query = query.lte("rental_prices->daily", maxDailyPrice)

    // Sorting by popularity (utilization_pct)
    query = query.order("utilization_pct", { ascending: false })
    
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching cars:", error)
      return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 })
    }

    const mappedData = data.map(vehicle => ({
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
      availability: { // Placeholder, needs real calculation if dates provided
        from: new Date().toISOString().split('T')[0],
        to: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]
      }
    }))

    return NextResponse.json({
      data: mappedData,
      meta: {
        total: count,
        limit,
        offset
      }
    })

  } catch (err) {
    console.error("Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error", message: "Unexpected error occurred" }, { status: 500 })
  }
}
