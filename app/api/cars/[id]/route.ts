
import { NextResponse } from "next/server"
import { serviceClient } from "@/lib/supabase/service-client"
import { validateApiKey } from "@/lib/auth/api-key"

export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteParams) {
  if (!(await validateApiKey())) {
    return NextResponse.json({ error: "Unauthorized", message: "Invalid or missing API key" }, { status: 401 })
  }

  const { id } = await params
  
  if (!id) {
    return NextResponse.json({ error: "Invalid car ID", message: "Car ID is required" }, { status: 400 })
  }

  const { data: vehicle, error } = await serviceClient
    .from("vehicles")
    .select(`
      id,
      name,
      make,
      model,
      model_year,
      body_style,
      seating_capacity,
      exterior_color,
      interior_color,
      plate_number,
      vin,
      rental_prices,
      engine_displacement_l,
      power_hp,
      cylinders,
      zero_to_hundred_sec,
      transmission,
      image_url,
      status
    `)
    .eq("id", id)
    .single()

  if (error || !vehicle) {
    return NextResponse.json({ error: "Car not found", message: `No car found with id: ${id}` }, { status: 404 })
  }

  const carData = {
    id: vehicle.id,
    car: vehicle.make || vehicle.name?.split(" ")[0] || "Unknown",
    model: vehicle.model || vehicle.name?.split(" ").slice(1).join(" ") || "Unknown",
    year: vehicle.model_year,
    type: vehicle.body_style || "SUV",
    seats: vehicle.seating_capacity,
    color: vehicle.exterior_color,
    interiorColor: vehicle.interior_color,
    plateNumber: vehicle.plate_number,
    win: vehicle.vin,
    prices: vehicle.rental_prices || {
      daily: 0,
      weekly: 0,
      monthly: 0,
      minimumDays: 1
    },
    specifications: {
      engineCapacity: vehicle.engine_displacement_l,
      hpw: vehicle.power_hp,
      cylinders: vehicle.cylinders,
      acceleration: vehicle.zero_to_hundred_sec,
      transmission: vehicle.transmission
    },
    website: `https://skyluxse.ae/catalog/${(vehicle.make || "").toLowerCase()}-${(vehicle.model || "").toLowerCase()}/`,
    imageUrl: vehicle.image_url,
    keywords: [
        (vehicle.make || "").toLowerCase(),
        (vehicle.model || "").toLowerCase(),
        (vehicle.body_style || "").toLowerCase(),
        `${(vehicle.make || "").toLowerCase()} ${(vehicle.model || "").toLowerCase()}`
    ].filter(Boolean),
    availability: {
      from: new Date().toISOString().split('T')[0],
      to: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]
    }
  }

  return NextResponse.json({ data: carData })
}
