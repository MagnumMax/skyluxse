
import { createClient } from "@supabase/supabase-js"
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
    const id = "6dcfe205-954d-4c43-8f06-ae2246a5f7e6"
    console.log(`Fetching details for car ID: ${id}`)
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

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
        console.error("Error or not found:", error)
        return
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

    console.log(JSON.stringify({ data: carData }, null, 2))
}

main()
