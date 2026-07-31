import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import { runtimeEnv } from '@/lib/env/runtime'
import { shouldExposeDevOtp } from '@/lib/security/expose-dev-otp'

export interface SendEmailOptions {
  to: string
  subject: string
  text: string
  html?: string
  from?: string
}

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  const apiKey = runtimeEnv('RESEND_API_KEY')
  if (!apiKey) return null
  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

/**
 * Universal Email Sender for ITU Backend.
 * Priority:
 * 1. Resend API (if RESEND_API_KEY is set)
 * 2. SMTP (via Nodemailer - e.g. Resend SMTP or standard SMTP if SMTP_HOST is set)
 * 3. Development console log fallback if in dev mode or SHOW_DEV_OTP is true.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; id?: string }> {
  const resend = getResendClient()
  const defaultFrom = runtimeEnv('RESEND_FROM_EMAIL') || runtimeEnv('SMTP_USER') || 'ITU Support <onboarding@resend.dev>'
  const from = options.from || defaultFrom

  // 1. Send via Resend SDK
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      })

      if (error) {
        console.error('[Resend Error]', error)
        throw new Error(`Resend email error: ${error.message}`)
      }

      console.log(`[Resend Success] Email sent to ${options.to} (ID: ${data?.id})`)
      return { ok: true, id: data?.id }
    } catch (err) {
      if (shouldExposeDevOtp()) {
        console.warn(`[DEV ONLY] Resend API failed, falling back to console log.`, err)
        console.log(`\n========================================\n[DEV MAIL FALLBACK]\nTo: ${options.to}\nSubject: ${options.subject}\nContent:\n${options.text}\n========================================\n`)
        return { ok: true }
      }
      throw err
    }
  }

  // 2. Send via SMTP (Nodemailer) - e.g. smtp.resend.com or Gmail/custom SMTP
  const smtpHost = runtimeEnv('SMTP_HOST')
  const smtpPort = parseInt(runtimeEnv('SMTP_PORT') || '587', 10)
  const smtpUser = runtimeEnv('SMTP_USER')
  const smtpPass = runtimeEnv('SMTP_PASS')

  if (smtpHost && smtpUser && smtpPass && smtpHost !== 'smtp.example.com') {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })

      const info = await transporter.sendMail({
        from: from || `"ITU Support" <${smtpUser}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      })

      console.log(`[SMTP Success] Email sent to ${options.to} (MessageId: ${info.messageId})`)
      return { ok: true, id: info.messageId }
    } catch (mailErr) {
      if (shouldExposeDevOtp()) {
        console.warn(`[DEV ONLY] Failed to send email via SMTP, logging to console as fallback.`, mailErr)
        console.log(`\n========================================\n[DEV MAIL FALLBACK]\nTo: ${options.to}\nSubject: ${options.subject}\nContent:\n${options.text}\n========================================\n`)
        return { ok: true }
      }
      throw mailErr
    }
  }

  // 3. Neither Resend API Key nor SMTP is configured
  if (shouldExposeDevOtp()) {
    console.warn(`[DEV ONLY] No email provider configured (RESEND_API_KEY or SMTP). Logging email to console.`)
    console.log(`\n========================================\n[DEV MAIL LOG]\nTo: ${options.to}\nSubject: ${options.subject}\nContent:\n${options.text}\n========================================\n`)
    return { ok: true }
  }

  throw new Error('Email service configuration missing. Set RESEND_API_KEY or SMTP variables.')
}
