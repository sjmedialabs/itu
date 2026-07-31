import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/get-user-id-from-request'
import { fetchProfileForUser } from '@/lib/auth/get-admin-from-request'
import { supabaseRest } from '@/lib/db/supabase-rest'

/**
 * GET /api/profile
 * Returns the full profile for the currently authenticated user.
 * Works for both email/password users and phone OTP users.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await fetchProfileForUser(userId)
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Try to fetch phone data too
    let phone = profile.phone || ''
    let countryCode = profile.country_code || ''
    if (!phone) {
      try {
        const res = await supabaseRest(
          `profiles?id=eq.${encodeURIComponent(userId)}&select=phone,country_code,country,currency,avatar_url&limit=1`,
          { cache: 'no-store' },
        )
        if (res.ok) {
          const rows = (await res.json().catch(() => [])) as any[]
          if (rows[0]) {
            phone = rows[0].phone || ''
            countryCode = rows[0].country_code || countryCode
          }
        }
      } catch { /* optional */ }
    }

    const fullPhone = phone
      ? (countryCode ? `+${countryCode}${phone}` : phone)
      : ''

    return NextResponse.json({
      profile: {
        id: userId,
        name: profile.name || '',
        email: profile.email || '',
        phone: fullPhone,
        country: profile.country || '',
        country_code: countryCode,
        currency: profile.currency || '',
        avatar: profile.avatar_url || '',
        avatar_url: profile.avatar_url || '',
        app_role: profile.app_role || 'user',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load profile'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
