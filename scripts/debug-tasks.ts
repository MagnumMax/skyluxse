
import { getBookingRelatedTasks } from "@/lib/data/tasks"
import { serviceClient } from "@/lib/supabase/service-client"

// Mock cache since we are not in Next.js
// But getBookingRelatedTasks uses 'cache' from react.
// This might fail in tsx if 'react' cache is not available or behaves differently.
// Let's copy the logic of getBookingRelatedTasks instead of importing it if it fails.

async function main() {
  const bookingId = "55c59848-bbe8-47ec-af06-e96afb480e8b"
  
  console.log("Fetching tasks for booking:", bookingId)
  
  const { data: rows, error } = await serviceClient
    .from("tasks")
    .select(
      "id, title, task_type, status, task_required_input_values(key, value_number, value_text, storage_paths, bucket)"
    )
    .eq("booking_id", bookingId)

  if (error) {
    console.error("Error fetching tasks:", error)
    return
  }
  
  console.log("Found rows:", rows.length)
  
  const deliveryTask = rows.find(r => r.task_type === "delivery")
  if (deliveryTask) {
     console.log("Delivery task found:", deliveryTask.id)
     console.log("Input values:", JSON.stringify(deliveryTask.task_required_input_values, null, 2))
     
     const inputValues = deliveryTask.task_required_input_values || []
     const photosInput = inputValues.find((v: any) => v.key === "handover_photos")
     
     if (photosInput) {
         console.log("Handover photos input found:", photosInput)
         if (photosInput.storage_paths?.length) {
             console.log("Storage paths present:", photosInput.storage_paths)
         } else {
             console.log("No storage paths.")
         }
     } else {
         console.log("No handover_photos key found.")
     }
  } else {
      console.log("No delivery task found.")
  }
}

main()
