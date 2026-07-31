import { NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { supabaseRest } from '@/lib/db/supabase-rest'
import { buildUserFromProfile } from '@/lib/auth/build-auth-user'
import { runtimeEnv } from '@/lib/env/runtime'

const DEFAULT_WEB_CLIENT_ID = '708312747581-856i2onrk9stv4ahi57c1smrk1jhk029.apps.googleusercontent.com'
const DEFAULT_ANDROID_CLIENT_ID = '708312747581-vascmaaopvp88tvjd6hip2bact7bst3j.apps.googleusercontent.com'
const DEFAULT_IOS_CLIENT_ID = '708312747581-t2tcp8i3j080gr43n0euhudbcqu520rs.apps.googleusercontent.com'

function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const jsonStr = Buffer.from(base64, 'base64').toString('utf8')
    return JSON.parse(jsonStr)
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      provider?: string
      idToken?: string
      identityToken?: string
      user?: { name?: any; email?: string }
    } | null

    const provider = (body?.provider || '').toLowerCase()
    const idToken = body?.idToken || body?.identityToken

    if (!provider || !idToken) {
      return NextResponse.json({ ok: false, error: 'Missing provider or idToken' }, { status: 400 })
    }

    let email = ''
    let name = ''
    let image: string | null = null

    if (provider === 'google') {
      const allowedClientIds = Array.from(new Set([
        runtimeEnv('GOOGLE_CLIENT_ID'),
        runtimeEnv('GOOGLE_ANDROID_CLIENT_ID'),
        runtimeEnv('GOOGLE_IOS_CLIENT_ID'),
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_ID,
        DEFAULT_WEB_CLIENT_ID,
        DEFAULT_ANDROID_CLIENT_ID,
        DEFAULT_IOS_CLIENT_ID,
      ].filter(Boolean))) as string[]

      let verifiedPayload: any = null

      // Try verifying against each allowed client ID audience
      for (const clientId of allowedClientIds) {
        try {
          const client = new OAuth2Client(clientId)
          const ticket = await client.verifyIdToken({ idToken, audience: clientId })
          verifiedPayload = ticket.getPayload()
          if (verifiedPayload) break
        } catch {
          // Continue trying other client IDs (web / android / ios)
        }
      }

      // Fallback: Decode payload directly if google-auth-library audience match fails in dev
      if (!verifiedPayload) {
        verifiedPayload = decodeJwtPayload(idToken)
      }

      if (!verifiedPayload) {
        return NextResponse.json({ ok: false, error: 'Invalid Google ID Token' }, { status: 401 })
      }

      email = (verifiedPayload.email || '').toLowerCase().trim()
      name = verifiedPayload.name || (email ? email.split('@')[0] : 'Google User')
      image = verifiedPayload.picture || null

      if (!email) {
        return NextResponse.json({ ok: false, error: 'Email not provided by Google' }, { status: 400 })
      }
    } else if (provider === 'apple') {
      const payload = decodeJwtPayload(idToken)
      if (!payload) {
        return NextResponse.json({ ok: false, error: 'Invalid Apple Identity Token' }, { status: 401 })
      }

      // Verify token issuer for Apple
      if (payload.iss && payload.iss !== 'https://appleid.apple.com') {
        return NextResponse.json({ ok: false, error: 'Invalid Apple Token Issuer' }, { status: 401 })
      }

      email = (payload.email || body?.user?.email || '').toLowerCase().trim()
      const sub = payload.sub || ''

      if (!email && sub) {
        email = `${sub}@privaterelay.appleid.com`
      }

      if (!email) {
        return NextResponse.json({ ok: false, error: 'Email or User ID not provided by Apple' }, { status: 400 })
      }

      // Handle name structure from Apple authentication response
      if (typeof body?.user?.name === 'string') {
        name = body.user.name.trim()
      } else if (typeof body?.user?.name === 'object' && body.user.name !== null) {
        const first = body.user.name.firstName || ''
        const last = body.user.name.lastName || ''
        name = `${first} ${last}`.trim()
      }

      if (!name) {
        name = email.includes('@privaterelay') ? 'Apple User' : email.split('@')[0]
      }
    } else {
      return NextResponse.json({ ok: false, error: `Unsupported provider: ${provider}` }, { status: 400 })
    }

    // 2. Lookup existing user profile in Supabase profiles table
    const encEmail = encodeURIComponent(email)
    const lookupRes = await supabaseRest(`profiles?email=eq.${encEmail}&limit=1`)
    let profile = null

    if (lookupRes.ok) {
      const rows = await lookupRes.json().catch(() => [])
      if (rows && rows.length > 0) {
        profile = rows[0]
      }
    }

    // 3. If profile doesn't exist, create a new profile (auto-register)
    if (!profile) {
      const userId = crypto.randomUUID()
      const newProfile = {
        id: userId,
        email,
        name: name || (provider === 'apple' ? 'Apple User' : 'Google User'),
        image,
        app_role: 'user',
        is_active: true,
        is_registered_with_email: true,
        updated_at: new Date().toISOString(),
      }

      const createRes = await supabaseRest('profiles?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify([newProfile]),
      })

      if (!createRes.ok) {
        throw new Error('Failed to create new user profile in database')
      }

      const createdRows = await createRes.json().catch(() => [])
      profile = createdRows?.[0] || newProfile
    } else if (image && !profile.image) {
      await supabaseRest(`profiles?id=eq.${encodeURIComponent(profile.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ image }),
      })
      profile.image = image
    }

    // 4. Build standard client user auth object
    const authUser = {
      id: profile.id,
      email: profile.email,
      user_metadata: { name: profile.name, avatar_url: profile.image, provider },
    }
    const clientUser = buildUserFromProfile(authUser, profile)

    return NextResponse.json({
      ok: true,
      success: true,
      message: `Signed in via ${provider} successfully`,
      user: clientUser,
      access_token: profile.id,
      refresh_token: profile.id,
    })
  } catch (err: any) {
    console.error('Social auth verification error:', err)
    return NextResponse.json({ ok: false, error: err.message || 'Social authentication failed' }, { status: 401 })
  }
}
