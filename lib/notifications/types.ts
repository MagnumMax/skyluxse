export type NotificationChannel = 'email' | 'telegram'

export interface NotificationPayload {
  to?: string // Optional override for recipient (email or chat_id)
  subject?: string // For email
  message: string // Content
  html?: string // Optional HTML content for email
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<boolean>
}
