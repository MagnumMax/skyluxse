"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"

import { VehicleFormValues, vehicleFormSchema, vehicleStatusValues } from "@/lib/fleet/vehicle-form-schema"
import type { FleetCar } from "@/lib/domain/entities"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"

type VehicleFormProps = {
  mode: "create" | "edit"
  vehicle?: FleetCar
  formId?: string
  renderActions?: boolean
  options?: {
    bodyStyle: string[]
    transmission: string[]
    location: string[]
  }
}

export function VehicleForm({
  mode,
  vehicle,
  formId = "vehicle-form",
  renderActions = true,
  options,
}: VehicleFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<VehicleFormValues, undefined, VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema) as Resolver<VehicleFormValues, undefined, VehicleFormValues>,
    defaultValues: toFormDefaults(vehicle),
  })

  const onSubmit = async (values: VehicleFormValues) => {
    setSubmitting(true)
    const endpoint = mode === "create" ? "/api/fleet/vehicles" : `/api/fleet/vehicles/${vehicle?.id}`
    const method = mode === "create" ? "POST" : "PATCH"

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    if (!response.ok) {
      const message = (await safeErrorMessage(response)) ?? "Failed to save data"
      toast({ title: "Error", description: message, variant: "destructive" })
      setSubmitting(false)
      return
    }

    const { id } = (await response.json()) as { id: string }
    toast({
      title: mode === "create" ? "Vehicle created" : "Changes saved",
      variant: "success",
    })
    router.push(`/fleet/${id}`)
    router.refresh()
    setSubmitting(false)
  }

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Vehicle details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="col-span-2 space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Rental Prices (AED)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="rentalPrices.daily"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Price</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="e.g. 1000" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rentalPrices.weekly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weekly Price</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="e.g. 6000" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rentalPrices.monthly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Price</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="e.g. 25000" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rentalPrices.minimumDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min. Days</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} placeholder="e.g. 1" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display name</FormLabel>
                  <FormControl>
                    <Input placeholder="Mercedes G63 AMG" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="plateNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plate number</FormLabel>
                  <FormControl>
                    <Input placeholder="Z32005" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicleStatusValues.map((option) => (
                        <SelectItem key={option} value={option}>
                          {labelize(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(options?.location ?? []).map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mileageKm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mileage (km)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kommoVehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kommo vehicle ID</FormLabel>
                  <FormControl>
                    <Input placeholder="958555" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VIN</FormLabel>
                  <FormControl>
                    <Input placeholder="WA1ZZZF12ND019208" maxLength={17} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="make"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Make</FormLabel>
                  <FormControl>
                    <Input placeholder="Mercedes-Benz" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input placeholder="G63 AMG" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="modelYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model year</FormLabel>
                  <FormControl>
                    <Input type="number" min={1980} max={2100} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bodyStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body style</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select body style" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(options?.bodyStyle ?? []).map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="exteriorColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exterior colour</FormLabel>
                  <FormControl>
                    <Input placeholder="Mango Blue" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="interiorColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interior colour</FormLabel>
                  <FormControl>
                    <Input placeholder="White / Black" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="seatingCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seating capacity</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={20} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transmission"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transmission</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select transmission" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(options?.transmission ?? []).map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="engineDisplacementL"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Engine (L)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" min={0} max={20} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="powerHp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Power (hp)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={2000} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cylinders"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cylinders</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={20} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="zeroToHundredSec"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>0-100 km/h (sec)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" min={0} max={20} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {renderActions ? (
          <div className="flex items-center justify-end">
            <Button type="submit" isLoading={submitting}>
              {mode === "create" ? "Create vehicle" : "Save changes"}
            </Button>
          </div>
        ) : null}
      </form>
    </Form>
  )
}

function toFormDefaults(vehicle?: FleetCar): VehicleFormValues {
  return {
    name: vehicle?.name ?? "",
    plateNumber: vehicle?.plate ?? "",
    status: mapStatusToDb(vehicle?.status),
    bodyStyle: vehicle?.bodyStyle ?? undefined,
    modelYear: vehicle?.year ?? new Date().getFullYear(),
    exteriorColor: vehicle?.color ?? undefined,
    interiorColor: vehicle?.interiorColor ?? undefined,
    seatingCapacity: vehicle?.seatingCapacity ?? undefined,
    transmission: vehicle?.transmission ?? undefined,
    engineDisplacementL: vehicle?.engineDisplacementL ?? undefined,
    powerHp: vehicle?.powerHp ?? undefined,
    cylinders: vehicle?.cylinders ?? undefined,
    zeroToHundredSec: vehicle?.zeroToHundredSec ?? undefined,
    location: vehicle?.location ?? undefined,
    kommoVehicleId: vehicle?.kommoVehicleId ?? undefined,
    vin: vehicle?.vin ?? undefined,
    mileageKm: vehicle?.mileage ?? 0,
    make: vehicle?.make ?? undefined,
    model: vehicle?.model ?? undefined,
    rentalPrices: {
      daily: vehicle?.rentalPrices?.daily ?? undefined,
      weekly: vehicle?.rentalPrices?.weekly ?? undefined,
      monthly: vehicle?.rentalPrices?.monthly ?? undefined,
      minimumDays: vehicle?.rentalPrices?.minimumDays ?? undefined,
    }
  }
}

function mapStatusToDb(status?: FleetCar["status"]): VehicleFormValues["status"] {
  const normalized = (status ?? "").toLowerCase()
  if (normalized === "in rent" || normalized === "in_rent") return "in_rent"
  if (normalized === "maintenance") return "maintenance"
  if (normalized === "reserved") return "reserved"
  if (normalized === "sold") return "sold"
  if (normalized === "service car" || normalized === "service_car") return "service_car"
  return "available"
}

function labelize(value: string) {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}

async function safeErrorMessage(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as { error?: string }
    return data.error ?? null
  } catch {
    return null
  }
}
