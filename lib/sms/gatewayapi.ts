import { runtimeEnv } from '@/lib/env/runtime'

export type SendSmsOptions = {
  recipient: string
  message: string
}

export type SendSmsResult =
  | { ok: true; msgId?: string | number }
  | { ok: false; error: string; status?: number }

/**
 * Normalizes user phone input to numeric MSISDN format without leading '+'
 * (e.g. "+919876543210" -> 919876543210, "9876543210" -> 919876543210)
 */
export function formatPhoneToMsisdn(phone: string): number | null {
  if (!phone) return null

  const trimmed = phone.trim()
  const digitsOnly = trimmed.replace(/[^\d]/g, '')
  if (!digitsOnly) return null

  // If Indian 10-digit national number without country code
  if (digitsOnly.length === 10 && !trimmed.startsWith('+')) {
    return Number(`91${digitsOnly}`)
  }

  const num = Number(digitsOnly)
  return isNaN(num) || num <= 0 ? null : num
}

/**
 * Low-level GatewayAPI Client
 * Docs: https://gatewayapi.com/docs/rest/#single-message
 */
export async function sendGatewayApiSms(
  options: SendSmsOptions
): Promise<SendSmsResult> {
  const baseUrl = (runtimeEnv('GATEWAYAPI_BASE_URL') || 'https://messaging.gatewayapi.com').replace(/\/+$/, '')
  const apiToken = runtimeEnv('GATEWAYAPI_API_TOKEN')
  const sender = runtimeEnv('GATEWAYAPI_SENDER') || 'ITU'

  if (!apiToken) {
    console.error('[GatewayAPI] Missing GATEWAYAPI_API_TOKEN in environment.')
    return { ok: false, error: 'SMS service configuration missing.' }
  }

  const recipientMsisdn = formatPhoneToMsisdn(options.recipient)
  if (!recipientMsisdn) {
    return { ok: false, error: 'Invalid recipient phone number format.' }
  }

  const endpoint = `${baseUrl}/mobile/single`
  const payload = {
    sender,
    message: options.message,
    recipient: recipientMsisdn,
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const responseText = await res.text().catch(() => '')
    let responseData: any = null
    try {
      responseData = responseText ? JSON.parse(responseText) : {}
    } catch {
      responseData = { raw: responseText }
    }

    if (res.status === 202 || res.status === 200 || res.status === 201) {
      const msgId = responseData?.msg_id || responseData?.id
      return { ok: true, msgId }
    }

    // Log provider error safely (Never log the API token!)
    console.error(
      `[GatewayAPI] SMS delivery failed (HTTP ${res.status}):`,
      responseData?.message || responseData?.error || responseText || 'Unknown provider error'
    )

    return {
      ok: false,
      error: 'Unable to send SMS. Please try again later.',
      status: res.status,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[GatewayAPI] Request network exception:', message)
    return {
      ok: false,
      error: 'SMS service temporarily unavailable.',
    }
  }
}
