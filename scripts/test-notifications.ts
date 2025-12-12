import { sendNotification } from '../lib/notifications/index'

async function main() {
  console.log('Testing Notifications...')

  // Test Telegram
  console.log('\n--- Testing Telegram ---')
  const telegramResult = await sendNotification('telegram', {
    message: 'Hello from Skyluxse! This is a test notification.',
  })
  console.log('Telegram Result:', telegramResult ? 'SUCCESS' : 'FAILURE')

  // Test Email
  console.log('\n--- Testing Email ---')
  const emailResult = await sendNotification('email', {
    to: 'test@example.com',
    subject: 'Test Notification',
    message: 'This is a test email body.',
  })
  console.log('Email Result:', emailResult ? 'SUCCESS' : 'FAILURE')
}

main().catch(console.error)
