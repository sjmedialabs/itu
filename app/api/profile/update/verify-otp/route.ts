import { NextResponse } from 'next/server'
import { verifyOtp } from '@/lib/security/otp'
import { rateLimit } from '@/lib/security/rate-limit'
import { supabaseGetUser, supabaseAdminUpdateUser, supabaseAdminCreateUser } from '@/lib/supabase/auth-rest'
import { supabaseRest } from '@/lib/db/supabase-rest'
import { fetchProfileForUser } from '@/lib/auth/get-admin-from-request'
import { buildUserFromProfile } from '@/lib/auth/build-auth-user'
import { verifyOtpSessionCookie } from '@/lib/auth/otp-session-cookie'
import { parsePhoneNumberFromString } from 'libphonenumber-js/core'
import metadata from 'libphonenumber-js/metadata.min.json'
const actualMetadata = (metadata as any).default || metadata

function getIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') ?? ''
  return fwd.split(',')[0]?.trim() || 'unknown'
}

export async function POST(req: Request) {
  try {
    const ip = getIp(req)
    const rl = await rateLimit({ key: `rl:v1:profile_update_verify:${ip}`, limit: 10, windowSeconds: 60 })
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: 'rate_limited', resetSeconds: rl.resetSeconds },
        { status: 429 }
      )
    }

    const cookie = req.headers.get('cookie') ?? ''
    const m = cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/)
    let userId: string | null = null
    let authUser: any = null

    const token = m?.[1] ? decodeURIComponent(m[1]) : ''
    if (token) {
      authUser = await supabaseGetUser(token)
      if (authUser?.id) {
        userId = authUser.id
      }
    }

    const body = (await req.json().catch(() => null)) as {
      type?: 'email' | 'phone'
      value?: string
      otp?: string
      userId?: string
      password?: string
    } | null
    const type = body?.type
    const value = (body?.value ?? '').trim()
    const otp = (body?.otp ?? '').trim()
    const password = (body?.password ?? '').trim()

    const headerUserId = req.headers.get('x-user-id')
    if (!userId && headerUserId) {
      userId = headerUserId
    }
    if (!userId && body?.userId) {
      userId = body.userId
    }

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!type || !value || !otp) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Verify OTP
    const verificationResult = await verifyOtp(value, otp)
    if (!verificationResult.ok) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired verification code' }, { status: 400 })
    }

    let finalUserId = userId

    if (type === 'email') {
      const currentProfile = await fetchProfileForUser(userId)
      if (currentProfile?.app_role === 'admin') {
        return NextResponse.json({ ok: false, error: 'Administrators are not allowed to change their email address' }, { status: 400 })
      }

      // 1. Try updating user email in Supabase Auth (GoTrue)
      const adminRes = await supabaseAdminUpdateUser(userId, {
        email: value,
        email_confirm: true,
        ...(password ? { password } : {}),
      })

      // If user not found in Auth GoTrue (mobile-only profile user created directly in profiles), create Auth user entry
      if (adminRes.error) {
        console.warn(`[verify-otp] supabaseAdminUpdateUser notice for user ${userId}:`, adminRes.error)
        const userPassword = password || `ItuP@ss${userId.slice(-6)}!`
        
        const createRes = await supabaseAdminCreateUser({
          email: value,
          password: userPassword,
          email_confirm: true,
          user_metadata: { name: currentProfile?.name || '' },
        })

        if (createRes.user?.id) {
          const newAuthId = createRes.user.id
          console.log(`[verify-otp] Created Auth user ${newAuthId} for mobile profile ${userId}`)
          if (newAuthId !== userId) {
            // Upsert profile under newAuthId so both IDs link correctly
            await supabaseRest('profiles', {
              method: 'POST',
              headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
              body: JSON.stringify([
                {
                  id: newAuthId,
                  email: value,
                  name: currentProfile?.name || '',
                  phone: currentProfile?.phone || null,
                  country_code: currentProfile?.country_code || null,
                  country: currentProfile?.country || null,
                  app_role: currentProfile?.app_role || 'user',
                  is_active: true,
                  is_registered_with_email: true,
                  image: currentProfile?.image || null,
                  updated_at: new Date().toISOString(),
                },
              ]),
            })
            finalUserId = newAuthId
          }
        } else if (createRes.error) {
          console.warn(`[verify-otp] supabaseAdminCreateUser fallback notice:`, createRes.error)
        }
      }

      // 2. Update email and is_registered_with_email in profiles table
      await supabaseRest(`profiles?id=eq.${encodeURIComponent(finalUserId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: value,
          is_registered_with_email: true,
          updated_at: new Date().toISOString(),
        }),
      })

      if (finalUserId !== userId) {
        await supabaseRest(`profiles?id=eq.${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: value,
            is_registered_with_email: true,
            updated_at: new Date().toISOString(),
          }),
        })
      }
    } else if (type === 'phone') {
      const currentProfile = await fetchProfileForUser(userId)
      const defaultCountry = (currentProfile?.country || 'IN') as any
      
      const parsedGlobal = value.startsWith('+')
        ? parsePhoneNumberFromString(value, actualMetadata)
        : parsePhoneNumberFromString(value, defaultCountry, actualMetadata)
        
      let nationalNumber = value
      let dialCode = currentProfile?.country_code || '91'
      let countryIso = currentProfile?.country || 'IN'

      if (parsedGlobal) {
        nationalNumber = parsedGlobal.nationalNumber as string
        dialCode = parsedGlobal.countryCallingCode as string
        countryIso = parsedGlobal.country as string
      }

      const updateRes = await supabaseRest(`profiles?id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: nationalNumber,
          country_code: dialCode,
          country: countryIso,
          updated_at: new Date().toISOString()
        })
      })
      if (!updateRes.ok) {
        const text = await updateRes.text().catch(() => '')
        throw new Error(`Failed to update phone in profiles database: ${text}`)
      }
    }

    // Fetch the updated profile and construct client user object
    const profile = (await fetchProfileForUser(finalUserId)) || (await fetchProfileForUser(userId))
    
    // Construct authUser object
    authUser = {
      id: profile?.id || finalUserId || userId,
      email: value || profile?.email || '',
      user_metadata: { name: profile?.name ?? '' },
    }

    const clientUser = buildUserFromProfile(authUser, profile)

    return NextResponse.json({
      ok: true,
      user: clientUser
    })
  } catch (e: any) {
    console.error('Failed to verify OTP:', e)
    const msg = e instanceof Error ? e.message : 'OTP verification failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
