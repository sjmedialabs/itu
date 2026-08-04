import { NextResponse } from 'next/server'
import { cacheGetJson, cacheSetJson } from '@/lib/cache/redis'
import { generateOtp } from '@/lib/security/otp'
import { shouldExposeDevOtp } from '@/lib/security/expose-dev-otp'
import { runtimeEnv } from '@/lib/env/runtime'
import { sendEmail } from '@/lib/email/mailer'

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { email?: string } | null
    const email = (body?.email ?? '').trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Missing email' }, { status: 400 })
    }

    const cacheKey = `pending_register:v1:${email}`
    const record = await cacheGetJson<{
      email: string
      password?: string
      name?: string
      otp: string
      phone?: string
      country_code?: string
      country?: string
    }>(cacheKey)

    if (!record) {
      return NextResponse.json({ ok: false, error: 'Registration session expired. Please start over.' }, { status: 400 })
    }

    // Generate a new OTP
    const otp = generateOtp()

    // Update the OTP in Redis and extend TTL to 5 minutes
    const ttlSeconds = 300
    await cacheSetJson(cacheKey, { ...record, otp }, ttlSeconds)

    // Send the new OTP to the user's email via Resend/SMTP/Dev logger
    const exposeOtp = shouldExposeDevOtp()
    await sendEmail({
      to: email,
      subject: 'Verify your ITU registration - New OTP',
      text: `Your new OTP is: ${otp}. It is valid for 5 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>ITU Email Verification</h2>
          <p>You requested a new verification code. Please use the following OTP:</p>
          <div style="font-size: 24px; font-weight: bold; background: #f0f0f0; padding: 10px 20px; display: inline-block; border-radius: 5px; margin: 10px 0;">
            ${otp}
          </div>
          <p>This code is valid for 5 minutes.</p>
          <p>If you did not request this code, please ignore this email.</p>
        </div>
      `,
    })

    return NextResponse.json({
      ok: true,
      message: 'New OTP sent successfully',
      ...(exposeOtp ? { otp } : {}),
    })
  } catch (e: any) {
    console.error('Resending OTP failed:', e)
    const msg = e instanceof Error ? e.message : 'Resending OTP failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
