import { NextResponse } from 'next/server'
import { supabaseGetUser } from '@/lib/supabase/auth-rest'
import { supabaseRest } from '@/lib/db/supabase-rest'
import { fetchProfileForUser } from '@/lib/auth/get-admin-from-request'
import { buildUserFromProfile } from '@/lib/auth/build-auth-user'
import { verifyOtpSessionCookie } from '@/lib/auth/otp-session-cookie'
import { parsePhoneNumberFromString } from 'libphonenumber-js/core'
import { CountryCode } from 'libphonenumber-js'
import metadata from 'libphonenumber-js/metadata.min.json'
const actualMetadata = (metadata as any).default || metadata

import { getUserIdFromRequest } from '@/lib/auth/get-user-id-from-request'

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { name?: string; phone?: string; userId?: string; image?: string } | null
    const name = (body?.name ?? '').trim()
    const phone = (body?.phone ?? '').trim()
    const image = body?.image

    let userId: string | null = await getUserIdFromRequest(req)
    let authUser: any = null

    const cookie = req.headers.get('cookie') ?? ''
    const m = cookie.match(/(?:^|[;,]\s*)sb-access-token=([^;,]+)/)
    const token = m?.[1] ? decodeURIComponent(m[1]) : ''
    if (token && !token.startsWith('token-') && !token.startsWith('session-')) {
      try {
        authUser = await supabaseGetUser(token)
      } catch {}
    }

    if (!userId && body?.userId) {
      const uuidMatch = String(body.userId).match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
      if (uuidMatch && uuidMatch[0]) {
        userId = uuidMatch[0]
      }
    }

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!name) {
      return NextResponse.json({ ok: false, error: 'Name is required' }, { status: 400 })
    }

    // Resolve country context from the current profile
    const currentProfile = await fetchProfileForUser(userId)
    const isAdmin = currentProfile?.app_role === 'admin' || currentProfile?.app_role === 'super_admin'
    const defaultCountry = (currentProfile?.country || 'IN') as any

    const parsedGlobal = phone.startsWith('+')
      ? parsePhoneNumberFromString(phone, actualMetadata)
      : parsePhoneNumberFromString(phone, defaultCountry, actualMetadata)
    let nationalNumber = phone
    let dialCode = currentProfile?.country_code || '91'
    let countryIso = currentProfile?.country || 'IN'

    if (parsedGlobal) {
      nationalNumber = parsedGlobal.nationalNumber as string
      dialCode = parsedGlobal.countryCallingCode as string
      countryIso = parsedGlobal.country as string
    }

    // Update the profiles table
    const updateRes = await supabaseRest(`profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        phone: nationalNumber,
        country_code: dialCode,
        country: countryIso,
        ...(image !== undefined ? { image } : {}),
        updated_at: new Date().toISOString(),
      }),
    })

    if (!updateRes.ok) {
      const errText = await updateRes.text().catch(() => '')
      console.error('Profile update database error:', errText)
      return NextResponse.json({ ok: false, error: 'Failed to update profile in database' }, { status: 500 })
    }

    // Fetch the updated profile and construct client user object
    const profile = await fetchProfileForUser(userId)
    
    // Construct authUser if we didn't have it (fallback case)
    if (!authUser && profile) {
      authUser = {
        id: userId,
        email: profile.email ?? '',
        user_metadata: { name: profile.name ?? '' },
      }
    }

    const clientUser = authUser ? buildUserFromProfile(authUser, profile) : null

    return NextResponse.json({
      ok: true,
      user: clientUser,
    })
  } catch (e: any) {
    console.error('Profile update failed:', e)
    return NextResponse.json({ ok: false, error: e.message || 'Profile update failed' }, { status: 500 })
  }
}
