import crypto from 'crypto'
import { cacheSetJson, cacheGetJson, cacheDel } from '@/lib/cache/redis'

const OTP_TTL_SECONDS = 30

function otpKey(phone: string) {
  return `otp:v1:${phone}`
}

function hashOtp(otp: string) {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

export function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000))
}

export async function storeOtp(phone: string, otp: string): Promise<void> {
  const otpHash = hashOtp(otp)
  await cacheSetJson(otpKey(phone), otpHash, OTP_TTL_SECONDS)
}

export async function verifyOtp(phone: string, otp: string): Promise<{ ok: boolean; reason?: string }> {
  const providedHash = hashOtp(otp)
  const key = otpKey(phone)
  const storedHash = await cacheGetJson<string>(key)

  if (!storedHash) return { ok: false, reason: 'expired' }
  if (storedHash !== providedHash) return { ok: false, reason: 'invalid' }

  await cacheDel(key)
  return { ok: true }
}
