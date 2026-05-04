import { NextResponse } from 'next/server'

/**
 * Production note:
 * - This endpoint is designed to be called after login to persist locale into Supabase `profiles`.
 * - It uses Supabase REST if `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are configured.
 * - If Supabase is not configured, it no-ops (returns 200) so existing functionality is not broken.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { userId?: string; country?: string; language?: string; currency?: string }
    | null

  const userId = body?.userId
  const country = body?.country
  const language = body?.language
  const currency = body?.currency

  if (!userId || !country || !language || !currency) {
    return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
  }

  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    // Keep app working in non-Supabase setups.
    return NextResponse.json({ ok: true, persisted: false })
  }

  // Update `profiles` row by id using PostgREST.
  // Assumes table: profiles(id uuid primary key, country text, language text, currency text, updated_at timestamptz)
  const res = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      country,
      language,
      currency,
      updated_at: new Date().toISOString(),
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return NextResponse.json({ ok: false, persisted: false, error: text || 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, persisted: true })
}

