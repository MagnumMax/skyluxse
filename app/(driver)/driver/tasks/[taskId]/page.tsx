import { notFound } from "next/navigation"

import { DriverPageShell } from "@/components/driver-page-shell"
import { DriverTaskDetail } from "@/components/driver-task-detail"
import { getDriverTaskById, getVehicleMaxOdometer } from "@/lib/data/tasks"
import { getLiveClientByIdFromDb } from "@/lib/data/live-data"
import { getAdditionalServices, getTaskServices } from "@/app/actions/additional-services"
import { createSignedUrl } from "@/lib/storage/signed-url"
import { serviceClient } from "@/lib/supabase/service-client"

type PageProps = { params: Promise<{ taskId: string }> }

export default async function DriverTaskDetailPage({ params }: PageProps) {
  const { taskId } = await params
  const task = await getDriverTaskById(taskId)
  if (!task) notFound()
  
  const [client, additionalServices, availableServices, minOdometer] = await Promise.all([
    task.clientId ? getLiveClientByIdFromDb(String(task.clientId)).catch(() => null) : Promise.resolve(null),
    getTaskServices(taskId).catch(() => []),
    getAdditionalServices().catch(() => []),
    task.vehicleId ? getVehicleMaxOdometer(String(task.vehicleId)).catch(() => null) : Promise.resolve(null)
  ])

  const kommoLeadUrl = (() => {
    const baseUrl = process.env.KOMMO_BASE_URL
    const bookingCode = task.bookingCode
    if (!bookingCode || !baseUrl) return undefined
    if (bookingCode.startsWith("K-")) {
      const leadId = bookingCode.slice(2)
      if (!leadId) return undefined
      try {
        const base = new URL(baseUrl)
        const normalizedPath = base.pathname.endsWith("/") ? base.pathname.slice(0, -1) : base.pathname
        base.pathname = `${normalizedPath}/leads/detail/${leadId}`
        return base.toString()
      } catch {
        return undefined
      }
    }
    return undefined
  })()

  let handoverPhotos: string[] = []
  let baselineOdometer: number | undefined
  let baselineFuel: number | undefined
  
  if (task.type === "pickup" && task.bookingId) {
    // Direct fetch to ensure we get the latest data regardless of cache
    const { data: deliveryTasks } = await serviceClient
        .from("tasks")
        .select("id, task_required_input_values(key, value_number, value_text, storage_paths, bucket)")
        .eq("booking_id", task.bookingId)
        .eq("task_type", "delivery")
        .limit(1)

    const deliveryTask = deliveryTasks?.[0]

    if (deliveryTask?.task_required_input_values) {
      // Cast to any because the type inference for nested join is tricky
      const inputs = deliveryTask.task_required_input_values as any[]
      const photosInput = inputs.find((v) => v.key === "handover_photos")
      
      if (photosInput?.storage_paths?.length) {
        const bucket = photosInput.bucket ?? "task-media"
        const paths = photosInput.storage_paths as string[]
        const urls = await Promise.all(
          paths.map(path => createSignedUrl(bucket, path))
        )
        handoverPhotos = urls.filter((url): url is string => !!url)
      }
      
      const odoBefore = inputs.find((v) => v.key === "odo_before")
      const fuelBefore = inputs.find((v) => v.key === "fuel_before")
      
      const odoNum = typeof odoBefore?.value_number === "number" ? odoBefore?.value_number : Number(odoBefore?.value_text ?? "")
      baselineOdometer = Number.isFinite(odoNum) ? odoNum : undefined
      
      const fuelNum = typeof fuelBefore?.value_number === "number" ? fuelBefore?.value_number : Number(fuelBefore?.value_text ?? "")
      baselineFuel = Number.isFinite(fuelNum) ? fuelNum : undefined
    }
  }

  // Fallbacks if no delivery task or values missing
  if (task.type === "pickup") {
    if (baselineOdometer === undefined && minOdometer !== null) {
      baselineOdometer = minOdometer
    }
    if (baselineFuel === undefined && task.lastVehicleFuel !== undefined) {
      baselineFuel = task.lastVehicleFuel
    }
  }

  // Generate signed URLs for current task photos
  const signedPhotoUrls: Record<string, string[]> = {}
  if (task.inputValues) {
    for (const val of task.inputValues) {
      if (val.storagePaths?.length && val.bucket) {
        const urls = await Promise.all(
          val.storagePaths.map(path => createSignedUrl(val.bucket!, path))
        )
        // Keep null/empty strings to maintain index alignment with storagePaths
        signedPhotoUrls[val.key] = urls.map(url => url ?? "")
      }
    }
  }

  return (
    <DriverPageShell>
      <DriverTaskDetail 
        task={task} 
        client={client ?? undefined} 
        additionalServices={additionalServices}
        availableServices={availableServices}
        kommoLeadUrl={kommoLeadUrl}
        handoverPhotos={handoverPhotos}
        signedPhotoUrls={signedPhotoUrls}
        minOdometer={minOdometer ?? undefined}
        baselineOdometer={baselineOdometer}
        baselineFuel={baselineFuel}
      />
    </DriverPageShell>
  )
}
