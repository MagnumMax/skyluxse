import { z } from "zod"

export const vehicleStatusValues = ["available", "in_rent", "maintenance", "reserved", "sold", "service_car"] as const

const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length ? value : undefined))

const optionalNumber = (min?: number, max?: number) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined
      const parsed = Number(value)
      return Number.isNaN(parsed) ? value : parsed
    },
    z
      .number()
      .finite()
      .refine((val) => (typeof min === "number" ? val >= min : true), {
        message: min != null ? `Must be at least ${min}` : "Invalid number",
      })
      .refine((val) => (typeof max === "number" ? val <= max : true), {
        message: max != null ? `Must be at most ${max}` : "Invalid number",
      })
      .optional()
  )

export const vehicleFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  plateNumber: z.string().trim().min(1, "Plate number is required"),
  status: z.enum(vehicleStatusValues).default("available"),
  bodyStyle: optionalTrimmedString,
  modelYear: optionalNumber(1980, 2100),
  exteriorColor: optionalTrimmedString,
  interiorColor: optionalTrimmedString,
  seatingCapacity: optionalNumber(1, 20),
  engineDisplacementL: optionalNumber(0, 20),
  powerHp: optionalNumber(0, 2000),
  cylinders: optionalNumber(0, 20),
  zeroToHundredSec: optionalNumber(0, 20),
  transmission: optionalTrimmedString,
  location: optionalTrimmedString,
  kommoVehicleId: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      const numeric = (value ?? "").replace(/[^0-9]/g, "")
      return numeric.length ? numeric : undefined
    }),
  vin: z
    .string()
    .trim()
    .max(17, "VIN must be 17 characters or less")
    .optional()
    .transform((value) => (value && value.length ? value.toUpperCase() : undefined)),
  mileageKm: optionalNumber(0),
  make: optionalTrimmedString,
  model: optionalTrimmedString,
})

export type VehicleFormInput = z.input<typeof vehicleFormSchema>
export type VehicleFormValues = z.output<typeof vehicleFormSchema>

export function mapVehicleFormToDb(values: VehicleFormValues) {
  return {
    name: values.name,
    make: values.make ?? null,
    model: values.model ?? null,
    vin: values.vin ?? null,
    plate_number: values.plateNumber,
    status: values.status,
    body_style: values.bodyStyle ?? null,
    model_year: values.modelYear ?? null,
    exterior_color: values.exteriorColor ?? null,
    interior_color: values.interiorColor ?? null,
    seating_capacity: values.seatingCapacity ?? null,
    engine_displacement_l: values.engineDisplacementL ?? null,
    power_hp: values.powerHp ?? null,
    cylinders: values.cylinders ?? null,
    zero_to_hundred_sec: values.zeroToHundredSec ?? null,
    transmission: values.transmission ?? null,
    location: values.location ?? null,
    kommo_vehicle_id: values.kommoVehicleId ?? null,
    mileage_km: values.mileageKm ?? null,
  }
}
