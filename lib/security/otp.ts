import crypto from 'crypto'
import { cacheSetJson, cacheGetJson, cacheDel } from '@/lib/cache/redis'

const OTP_TTL_SECONDS = 300 // 5 minutes

export function normalizeOtpPhone(phone: string): string {
  if (!phone) return ''
  const trimmed = phone.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return trimmed
  return hasPlus ? `+${digits}` : digits
}

function otpKeys(phone: string): string[] {
  const norm = normalizeOtpPhone(phone)
  const raw = phone.trim()
  const digits = phone.replace(/\D/g, '')

  const keys = new Set<string>()
  if (norm) keys.add(`otp:v1:${norm}`)
  if (raw) keys.add(`otp:v1:${raw}`)
  if (digits) keys.add(`otp:v1:${digits}`)
  if (digits && !norm.startsWith('+')) keys.add(`otp:v1:+${digits}`)
  return Array.from(keys)
}

function hashOtp(otp: string) {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

export function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000))
}

export async function storeOtp(phone: string, otp: string): Promise<void> {
  const normPhone = normalizeOtpPhone(phone)
  const otpHash = hashOtp(otp)
  const ttl = OTP_TTL_SECONDS

  // Store under normalized key as primary
  await cacheSetJson(`otp:v1:${normPhone}`, otpHash, ttl)
  // Also store under raw phone string if different
  if (phone.trim() !== normPhone) {
    await cacheSetJson(`otp:v1:${phone.trim()}`, otpHash, ttl)
  }
}

export async function verifyOtp(phone: string, otp: string): Promise<{ ok: boolean; reason?: string }> {
  const providedHash = hashOtp(otp)
  const possibleKeys = otpKeys(phone)

  let storedHash: string | null = null
  for (const key of possibleKeys) {
    const found = await cacheGetJson<string>(key)
    if (found) {
      storedHash = found
      break
    }
  }

  if (!storedHash) return { ok: false, reason: 'expired' }
  if (storedHash !== providedHash) return { ok: false, reason: 'invalid' }

  for (const key of possibleKeys) {
    await cacheDel(key)
  }
  return { ok: true }
}
