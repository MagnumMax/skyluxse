
import { sendNotification } from '../lib/notifications/index'

async function main() {
  console.log('Testing Telegram Notification...')
  const result = await sendNotification('telegram', {
    message: '🔔 <b>Test Notification</b>\n\nIf you see this, the Telegram integration is working correctly.',
  })

  if (result) {
    console.log('✅ Telegram notification sent successfully!')
  } else {
    console.error('❌ Failed to send Telegram notification.')
  }
}

main().catch(console.error)
