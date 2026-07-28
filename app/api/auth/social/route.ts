import { NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { supabaseRest } from '@/lib/db/supabase-rest'
import { fetchProfileForUser } from '@/lib/auth/get-admin-from-request'
import { buildUserFromProfile } from '@/lib/auth/build-auth-user'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      provider?: string
      idToken?: string
    } | null

    const provider = body?.provider
    const idToken = body?.idToken

    if (!provider || !idToken) {
      return NextResponse.json({ ok: false, error: 'Missing provider or idToken' }, { status: 400 })
    }

    if (provider === 'google') {
      const audience = GOOGLE_CLIENT_ID || '708312747581-856i2onrk9stv4ahi57c1smrk1jhk029.apps.googleusercontent.com'
      const client = new OAuth2Client(audience)

      // 1. Verify token signature with Google API
      const ticket = await client.verifyIdToken({
        idToken,
        audience,
      })
      const payload = ticket.getPayload()
      if (!payload) {
        return NextResponse.json({ ok: false, error: 'Invalid Google ID Token' }, { status: 401 })
      }

      const email = payload.email?.toLowerCase().trim()
      const name = payload.name || 'Google User'
      const image = payload.picture || null

      if (!email) {
        return NextResponse.json({ ok: false, error: 'Email not provided by Google' }, { status: 400 })
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
          name,
          image,
          app_role: 'user',
          is_active: true,
          is_registered_with_email: true, // Mark verified
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
        // Optionally update profile avatar image if missing
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
        user_metadata: { name: profile.name },
      }
      const clientUser = buildUserFromProfile(authUser, profile)

      return NextResponse.json({
        ok: true,
        user: clientUser,
      })
    }

    return NextResponse.json({ ok: false, error: `Unsupported provider: ${provider}` }, { status: 400 })
  } catch (err: any) {
    console.error('Social auth verification error:', err)
    return NextResponse.json({ ok: false, error: err.message || 'Social authentication failed' }, { status: 401 })
  }
}
