import { serviceClient } from "@/lib/supabase/service-client"

export type VehicleSelectOptions = {
  bodyStyle: string[]
  transmission: string[]
  location: string[]
}

const DEFAULT_OPTIONS: VehicleSelectOptions = {
  bodyStyle: ["SUV", "Sedan", "Coupe", "Convertible"],
  transmission: ["Automatic", "Manual", "DCT"],
  location: ["SkyLuxse HQ"],
}

export async function getVehicleOptions(): Promise<VehicleSelectOptions> {
  const { data, error } = await serviceClient.from("vehicles").select("body_style, transmission, location").limit(500)

  if (error || !data) {
    return DEFAULT_OPTIONS
  }

  const collect = (key: keyof VehicleSelectOptions, mapKey: keyof (typeof data)[number]) => {
    const set = new Set<string>()
    data.forEach((row) => {
      const value = (row as any)?.[mapKey]
      if (value && typeof value === "string" && value.trim()) {
        set.add(value.trim())
      }
    })
    const defaults = DEFAULT_OPTIONS[key] ?? []
    defaults.forEach((value) => set.add(value))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }

  return {
    bodyStyle: collect("bodyStyle", "body_style"),
    transmission: collect("transmission", "transmission"),
    location: collect("location", "location"),
  }
}
