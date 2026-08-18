import { sendGatewayApiSms, SendSmsOptions, SendSmsResult } from './gatewayapi'

/**
 * Unified SMS Service for ITU application.
 * Wraps SMS providers (GatewayAPI) to decouple business logic from provider details.
 */
export async function sendSms(options: SendSmsOptions): Promise<SendSmsResult> {
  return sendGatewayApiSms(options)
}
