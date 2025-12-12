import { NotificationPayload, NotificationProvider } from './types'

export class EmailProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<boolean> {
    console.log('---------------------------------------------------')
    console.log('EMAIL NOTIFICATION (STUB)')
    console.log(`To: ${payload.to || 'Default Recipient'}`)
    console.log(`Subject: ${payload.subject}`)
    console.log(`Message: ${payload.message}`)
    if (payload.html) {
      console.log(`HTML: ${payload.html.substring(0, 50)}...`)
    }
    console.log('---------------------------------------------------')
    
    // TODO: Integrate with a real email service provider (e.g., Resend, SendGrid, Nodemailer)
    // For now, we return true to simulate success
    return true
  }
}
