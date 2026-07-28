import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import {
  supabaseSignInWithIdToken,
  supabaseAdminCreateUser,
  supabaseSignInWithPassword,
} from '@/lib/supabase/auth-rest'
import { supabaseRest } from '@/lib/db/supabase-rest'
import { fetchProfileForUser } from '@/lib/auth/get-admin-from-request'
import { buildUserFromProfile } from '@/lib/auth/build-auth-user'
import { logLoginAudit } from '@/lib/auth/audit'
import { createAdminNotification } from '@/lib/notifications/admin-notifications'
import { authCookieOptions } from '@/lib/auth/cookie-options'
import { getRequestIp } from '@/lib/security/recaptcha-guard'
import { rateLimit } from '@/lib/security/rate-limit'
import { runtimeEnv } from '@/lib/env/runtime'

function cookieOptions() {
  return authCookieOptions()
}

type GoogleUserInfo = {
  sub: string
  email: string
  email_verified?: boolean | string
  name?: string
  picture?: string
  given_name?: string
  family_name?: string
  aud?: string
  azp?: string
}

/** Verify Google ID token against Google's public tokeninfo endpoint */
async function verifyGoogleIdToken(idToken: string): Promise<GoogleUserInfo | null> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json().catch(() => null)) as GoogleUserInfo | null
    if (!json?.email) return null

    // Audience check against configured client IDs (Web, Android, iOS)
    const configuredWebClientId = runtimeEnv('GOOGLE_CLIENT_ID')
    const configuredAndroidClientId = runtimeEnv('GOOGLE_ANDROID_CLIENT_ID')
    const configuredIosClientId = runtimeEnv('GOOGLE_IOS_CLIENT_ID')

    const allowedClientIds = [
      configuredWebClientId,
      configuredAndroidClientId,
      configuredIosClientId,
    ].filter(Boolean) as string[]

    if (allowedClientIds.length > 0) {
      const aud = json.aud
      const azp = json.azp
      const matchesAud = aud ? allowedClientIds.includes(aud) : false
      const matchesAzp = azp ? allowedClientIds.includes(azp) : false

      if (!matchesAud && !matchesAzp) {
        console.warn(
          `[Google OAuth] Audience mismatch: received aud=${aud}, azp=${azp}, expected one of [${allowedClientIds.join(', ')}]`
        )
      }
    }

    return json
  } catch (err) {
    console.error('Failed to verify Google ID token with Google API:', err)
    return null
  }
}

/** Verify Google OAuth Access Token via UserInfo API fallback */
async function verifyGoogleAccessToken(accessToken: string): Promise<GoogleUserInfo | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json().catch(() => null)) as GoogleUserInfo | null
    if (!json?.email) return null
    return json
  } catch (err) {
    console.error('Failed to verify Google access token:', err)
    return null
  }
}

type ProfileRow = {
  id: string
  email?: string
  name?: string
  image?: string
  app_role?: string
  is_active?: boolean
}

export async function POST(req: Request) {
  const ipAddress = getRequestIp(req)
  const country = req.headers.get('x-vercel-ip-country') || 'Unknown'
  const userAgent = req.headers.get('user-agent') || ''

  try {
    const body = (await req.json().catch(() => null)) as {
      idToken?: string
      id_token?: string
      token?: string
      accessToken?: string
      access_token?: string
      user?: { name?: string; email?: string; photo?: string }
    } | null

    const idToken = (body?.idToken || body?.id_token || body?.token || '').trim()
    const accessToken = (body?.accessToken || body?.access_token || '').trim()

    if (!idToken && !accessToken) {
      return NextResponse.json(
        { ok: false, success: false, error: 'Missing Google token (idToken or accessToken required)' },
        { status: 400 }
      )
    }

    const rl = await rateLimit({
      key: `rl:v1:google_auth:${ipAddress}`,
      limit: 15,
      windowSeconds: 60,
      failClosed: true,
    })
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, success: false, error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.resetSeconds || 60) } }
      )
    }

    let googleUser: GoogleUserInfo | null = null
    let session: any = null
    let supabaseUser: any = null

    // 1. Attempt Supabase Auth ID Token grant first if ID token is available
    if (idToken) {
      try {
        const authData = await supabaseSignInWithIdToken({ provider: 'google', id_token: idToken })
        if (authData.user && authData.session) {
          supabaseUser = authData.user
          session = authData.session
          googleUser = {
            sub: authData.user.id,
            email: authData.user.email || '',
            name: (authData.user.user_metadata?.name as string) || (authData.user.user_metadata?.full_name as string) || '',
            picture: (authData.user.user_metadata?.avatar_url as string) || (authData.user.user_metadata?.picture as string) || '',
          }
        }
      } catch (err) {
        // Fallback to direct Google token verification if Supabase provider is unconfigured locally
        console.log('Supabase id_token grant failed, falling back to direct Google verification')
      }
    }

    // 2. Direct token verification fallback
    if (!googleUser) {
      if (idToken) {
        googleUser = await verifyGoogleIdToken(idToken)
      }
      if (!googleUser && accessToken) {
        googleUser = await verifyGoogleAccessToken(accessToken)
      }
    }

    if (!googleUser || !googleUser.email) {
      await logLoginAudit({ email: 'unknown', status: 'failed', ipAddress, country, userAgent })
      return NextResponse.json(
        { ok: false, success: false, error: 'Invalid or expired Google authentication token' },
        { status: 401 }
      )
    }

    const email = googleUser.email.trim().toLowerCase()
    const name = (googleUser.name || body?.user?.name || email.split('@')[0] || 'User').trim()
    const picture = googleUser.picture || body?.user?.photo || ''

    // 3. Profile lookup in Supabase Postgres
    let existingProfile: ProfileRow | null = null
    try {
      const checkRes = await supabaseRest(
        `profiles?email=eq.${encodeURIComponent(email)}&select=id,app_role,is_active,name,image&limit=1`
      )
      if (checkRes.ok) {
        const rows = (await checkRes.json().catch(() => [])) as ProfileRow[]
        if (rows?.[0]) existingProfile = rows[0]
      }
    } catch (err) {
      console.error('Failed to lookup profile by email:', err)
    }

    // Reject frozen accounts
    if (existingProfile && existingProfile.is_active === false) {
      await logLoginAudit({ userId: existingProfile.id, email, status: 'blocked', ipAddress, country, userAgent })
      return NextResponse.json(
        { ok: false, success: false, error: 'Your account has been freezed' },
        { status: 401 }
      )
    }

    let userId: string = existingProfile?.id || supabaseUser?.id || ''
    let isNewUser = false

    // 4. Create user if no existing profile
    if (!userId) {
      isNewUser = true
      const generatedPassword = crypto.randomBytes(16).toString('hex') + 'G1!'
      try {
        const adminRes = await supabaseAdminCreateUser({
          email,
          password: generatedPassword,
          email_confirm: true,
          user_metadata: { name, picture, provider: 'google' },
        })
        if (adminRes.user?.id) {
          userId = adminRes.user.id
          supabaseUser = adminRes.user
          // Sign in with password to obtain session tokens if not already present
          if (!session) {
            try {
              const signinRes = await supabaseSignInWithPassword({ email, password: generatedPassword })
              session = signinRes.session
            } catch {
              /* ignore session signin error */
            }
          }
        }
      } catch (err) {
        console.error('Failed to create auth user for Google Sign-In:', err)
      }

      if (!userId) {
        userId = crypto.randomUUID()
      }

      // Insert new profile record
      try {
        await supabaseRest('profiles', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify([
            {
              id: userId,
              email,
              name,
              image: picture || null,
              app_role: email === 'admin@itu.com' ? 'super_admin' : 'user',
              is_active: true,
              is_registered_with_email: true,
              updated_at: new Date().toISOString(),
            },
          ]),
        })
      } catch (err) {
        console.error('Failed to insert new profile for Google registration:', err)
      }

      // Trigger admin notification for new registration
      await createAdminNotification({
        title: 'New User Registered',
        message: `User ${email} (${name}) registered via Google Sign-In.`,
        type: 'user_registration',
        details: { email, name, userId, provider: 'google' },
      })
    } else if (picture && !existingProfile?.image) {
      // Update image if missing on existing profile
      try {
        await supabaseRest(`profiles?id=eq.${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          body: JSON.stringify({ image: picture, updated_at: new Date().toISOString() }),
        })
      } catch {
        /* ignore image update failure */
      }
    }

    // 5. Build client user response
    const profile = await fetchProfileForUser(userId)
    const clientAuthUser = supabaseUser || { id: userId, email }
    const clientUser = buildUserFromProfile(clientAuthUser, profile)

    await logLoginAudit({ userId, email, status: 'success', ipAddress, country, userAgent })

    const responsePayload = {
      ok: true,
      success: true,
      message: isNewUser ? 'User registered and signed in via Google successfully' : 'Signed in via Google successfully',
      isNewUser,
      user: clientUser,
      access_token: session?.access_token || undefined,
      refresh_token: session?.refresh_token || undefined,
      expires_in: session?.expires_in || 604800,
      token_type: 'bearer',
    }

    const res = NextResponse.json(responsePayload)

    if (session?.access_token) {
      res.cookies.set('sb-access-token', session.access_token, { ...cookieOptions(), maxAge: 60 * 60 * 24 * 7 })
    }
    if (session?.refresh_token) {
      res.cookies.set('sb-refresh-token', session.refresh_token, { ...cookieOptions(), maxAge: 60 * 60 * 24 * 30 })
    }

    return res
  } catch (err) {
    console.error('Google Auth Route Error:', err)
    const msg = err instanceof Error ? err.message : 'Google authentication failed'
    await logLoginAudit({ email: 'unknown', status: 'failed', ipAddress: 'unknown', country: 'unknown', userAgent: 'unknown' })
    return NextResponse.json({ ok: false, success: false, error: msg }, { status: 500 })
  }
}
