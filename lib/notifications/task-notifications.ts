import { SupabaseClient } from '@supabase/supabase-js'
import { sendNotification } from './index'

export async function sendTaskCreatedNotification(taskId: string, supabase: SupabaseClient) {
  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        bookings (
          external_code
        ),
        vehicles (
          name,
          plate_number
        ),
        clients (
          name
        )
      `)
      .eq('id', taskId)
      .single()

    if (error || !task) {
      console.error('Failed to fetch task for notification:', error)
      return
    }

    const taskType = task.task_type === 'delivery' ? 'Delivery' : (task.task_type === 'pickup' ? 'Pickup' : task.task_type)
    const title = task.title || 'Untitled Task'
    // @ts-ignore - Supabase types might not be perfectly inferred for joined tables
    const bookingCode = task.bookings?.external_code || 'N/A'
    // @ts-ignore
    const vehicleName = task.vehicles?.name || 'Unknown Vehicle'
    // @ts-ignore
    const plateNumber = task.vehicles?.plate_number || 'No Plate'
    // @ts-ignore
    const clientName = task.clients?.name || 'Unknown Client'
    const deadline = task.deadline_at ? new Date(task.deadline_at).toLocaleString('ru-RU', { timeZone: 'Asia/Dubai' }) : 'No Deadline'

    const message = `
🆕 <b>New Task Created</b>

<b>Type:</b> ${taskType}
<b>Title:</b> ${title}
<b>Booking:</b> ${bookingCode}
<b>Vehicle:</b> ${vehicleName} (${plateNumber})
<b>Client:</b> ${clientName}
<b>Deadline:</b> ${deadline}
    `.trim()

    await sendNotification('telegram', { message })
  } catch (err) {
    console.error('Error sending task notification:', err)
  }
}
