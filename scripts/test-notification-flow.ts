import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
})

async function main() {
    console.log("🚀 Testing Task Notification Flow")

    // 1. Fetch a booking to attach task to
    const { data: booking } = await serviceClient
        .from("bookings")
        .select("id, client_id, vehicle_id, driver_id")
        .limit(1)
        .single()

    if (!booking) {
        console.error("No booking found to test with.")
        return
    }

    console.log(`Using Booking ID: ${booking.id}`)

    // 2. Create a dummy task
    const taskPayload = {
        booking_id: booking.id,
        client_id: booking.client_id,
        vehicle_id: booking.vehicle_id,
        assignee_driver_id: booking.driver_id || "07c91c85-62c8-44dd-8351-ef78826e633f", // Use dummy driver if none
        task_type: "delivery",
        title: "Test Notification Task " + Date.now(),
        status: "todo",
        deadline_at: new Date(Date.now() + 86400000).toISOString(),
        metadata: { scope: "test" }
    }

    console.log("Creating Task...")
    const { data: task, error } = await serviceClient
        .from("tasks")
        .insert(taskPayload)
        .select()
        .single()

    if (error) {
        console.error("Failed to create task:", error)
        return
    }

    console.log(`✅ Task Created: ${task.id}`)

    // 3. Verify Outbox Entry
    console.log("Verifying Outbox Entry...")
    // Give a small delay for trigger to fire (should be immediate though)
    await new Promise(r => setTimeout(r, 1000))

    const { data: outbox } = await serviceClient
        .from("integrations_outbox")
        .select("*")
        .eq("target_system", "telegram")
        .eq("event_type", "task_created")
        .contains("payload", { task_id: task.id })
        .single()

    if (outbox) {
        console.log(`✅ Outbox entry found: ${outbox.id}`)
        console.log(`   Status: ${outbox.status}`)
        console.log(`   Payload:`, JSON.stringify(outbox.payload))
    } else {
        console.error("❌ Outbox entry NOT found!")
    }

    // 4. Test Sales Order Notification Trigger
    console.log("\n🚀 Testing Sales Order Notification Flow")
    
    // Update booking with a dummy sales order ID
    const dummySOId = "SO-" + Date.now()
    const dummyUrl = `https://books.zoho.com/app/123#/salesorders/${dummySOId}`

    console.log(`Updating Booking ${booking.id} with SO ID: ${dummySOId}`)
    const { error: updateError } = await serviceClient
        .from("bookings")
        .update({
            zoho_sales_order_id: dummySOId,
            sales_order_url: dummyUrl
        })
        .eq("id", booking.id)

    if (updateError) {
        console.error("Failed to update booking:", updateError)
    } else {
        console.log("✅ Booking updated.")
        
        await new Promise(r => setTimeout(r, 1000))

        const { data: soOutbox } = await serviceClient
            .from("integrations_outbox")
            .select("*")
            .eq("target_system", "telegram")
            .eq("event_type", "sales_order_linked")
            .contains("payload", { booking_id: booking.id, sales_order_id: dummySOId })
            .single()

        if (soOutbox) {
            console.log(`✅ Sales Order Outbox entry found: ${soOutbox.id}`)
            console.log(`   Status: ${soOutbox.status}`)
        } else {
            console.error("❌ Sales Order Outbox entry NOT found!")
        }
    }

    // Cleanup
    console.log("\nCleaning up...")
    await serviceClient.from("tasks").delete().eq("id", task.id)
    await serviceClient.from("integrations_outbox").delete().eq("payload->>task_id", task.id)
    if (outbox) await serviceClient.from("integrations_outbox").delete().eq("id", outbox.id)
    
    // Revert booking change (optional, but good practice if testing on live data)
    // await serviceClient.from("bookings").update({ zoho_sales_order_id: null }).eq("id", booking.id) 
    // ^ skipped to avoid messing up history if it was already set. 
}

main().catch(console.error)
