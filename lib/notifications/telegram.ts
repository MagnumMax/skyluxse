import { NotificationPayload, NotificationProvider } from './types'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7719759217:AAEwerFTBeo3erPBfFHNWA-b62Iu-NpN-94'
const TELEGRAM_DEFAULT_CHAT_ID = process.env.TELEGRAM_DEFAULT_CHAT_ID || '-1003305843739'

export class TelegramProvider implements NotificationProvider {
  private botToken: string
  private defaultChatId: string

  constructor(token?: string, defaultChatId?: string) {
    this.botToken = token || TELEGRAM_BOT_TOKEN
    this.defaultChatId = defaultChatId || TELEGRAM_DEFAULT_CHAT_ID
  }

  async send(payload: NotificationPayload): Promise<boolean> {
    const chatId = payload.to || this.defaultChatId
    const text = payload.message

    if (!this.botToken) {
      console.error('Telegram Bot Token is missing')
      return false
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML', // Optional: supports basic HTML like <b>, <i>
        }),
      })

      const data = await response.json()

      if (!data.ok) {
        console.error('Telegram API Error:', data)
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to send Telegram message:', error)
      return false
    }
  }
}
