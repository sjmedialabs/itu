import { NextResponse } from 'next/server'
import { supabaseRest } from '@/lib/db/supabase-rest'
import { generateOtp } from '@/lib/security/otp'
import { shouldExposeDevOtp } from '@/lib/security/expose-dev-otp'
import { cacheSetJson } from '@/lib/cache/redis'
import { runtimeEnv } from '@/lib/env/runtime'
import { assertStrongPassword } from '@/lib/validators/password-api'
import {
  parseProfilePhoneFromParts,
  profilePhoneExists,
  PROFILE_PHONE_EXISTS_MESSAGE,
} from '@/lib/auth/profile-phone'
import { sendEmail } from '@/lib/email/mailer'
import { requireCaptcha } from '@/lib/security/recaptcha-guard'

type PendingRegisterRecord = {
  email: string
  password?: string
  name?: string
  otp: string
  phone?: string
  country_code?: string
  country?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      email?: string
      password?: string
      name?: string
      phone?: string
      countryCode?: string
      dialCode?: string
      captchaToken?: string
    } | null
    const email = (body?.email ?? '').trim().toLowerCase()
    const password = (body?.password ?? '').trim()
    const name = (body?.name ?? '').trim()
    const phoneInput = (body?.phone ?? '').trim()
    const countryCode = (body?.countryCode ?? 'IN').trim().toUpperCase()
    const dialCode = (body?.dialCode ?? '91').trim()

    const captcha = await requireCaptcha(req, body?.captchaToken)
    if (!captcha.ok) {
      return captcha.response
    }

    if (!email || !password || !name) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
    }

    const passwordError = assertStrongPassword(password)
    if (passwordError) return passwordError

    let phoneFields: Pick<PendingRegisterRecord, 'phone' | 'country_code' | 'country'> = {}
    if (phoneInput) {
      const parsedPhone = parseProfilePhoneFromParts(phoneInput, countryCode, dialCode)
      if (!parsedPhone.ok) {
        return NextResponse.json({ ok: false, error: parsedPhone.error }, { status: 400 })
      }

      try {
        const exists = await profilePhoneExists(parsedPhone.parsed)
        if (exists) {
          return NextResponse.json({ ok: false, error: PROFILE_PHONE_EXISTS_MESSAGE }, { status: 400 })
        }
      } catch (e) {
        console.error('Check phone duplicate error:', e)
      }

      phoneFields = {
        phone: parsedPhone.parsed.nationalNumber,
        country_code: parsedPhone.parsed.dialCode,
        country: parsedPhone.parsed.countryIso,
      }
    }

    // 1. Check if email already registered in profiles
    try {
      const checkRes = await supabaseRest(`profiles?email=eq.${encodeURIComponent(email)}&select=id&limit=1`)
      if (checkRes.ok) {
        const rows = (await checkRes.json().catch(() => [])) as { id: string }[]
        if (rows && rows.length > 0) {
          return NextResponse.json({ ok: false, error: 'Email already registered' }, { status: 400 })
        }
      }
    } catch (e) {
      // Ignore DB errors at this check stage, let registration handle it if it occurs
      console.error('Check email duplicate error:', e)
    }

    // 2. Generate OTP
    const otp = generateOtp()

    // 3. Store user details and OTP in Redis (valid for 30 seconds)
    const ttlSeconds = 30
    const cacheKey = `pending_register:v1:${email}`
    await cacheSetJson(cacheKey, { email, password, name, otp, ...phoneFields }, ttlSeconds)

    // 4. Send email with OTP (Resend SDK / SMTP / dev console fallback)
    const exposeOtp = shouldExposeDevOtp()
    await sendEmail({
      to: email,
      subject: 'Verify your ITU registration',
      text: `Your OTP is: ${otp}. It is valid for 30 seconds.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Welcome to ITU!</h2>
          <p>Please use the following One-Time Password (OTP) to complete your registration:</p>
          <div style="font-size: 24px; font-weight: bold; background: #f0f0f0; padding: 10px 20px; display: inline-block; border-radius: 5px; margin: 10px 0;">
            ${otp}
          </div>
          <p>This code is valid for 30 seconds.</p>
          <p>If you did not request this code, please ignore this email.</p>
        </div>
      `,
    })

    return NextResponse.json({
      ok: true,
      message: 'Verification OTP sent successfully',
      ...(exposeOtp ? { otp } : {}),
    })
  } catch (e) {
    console.error('Registration failed:', e)
    const msg = e instanceof Error ? e.message : 'Registration failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
