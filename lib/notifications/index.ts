import { EmailProvider } from './email'
import { TelegramProvider } from './telegram'
import { NotificationChannel, NotificationPayload } from './types'

export * from './types'

const emailProvider = new EmailProvider()
const telegramProvider = new TelegramProvider()

export async function sendNotification(
  channel: NotificationChannel,
  payload: NotificationPayload
): Promise<boolean> {
  switch (channel) {
    case 'email':
      return emailProvider.send(payload)
    case 'telegram':
      return telegramProvider.send(payload)
    default:
      console.warn(`Unknown notification channel: ${channel}`)
      return false
  }
}
