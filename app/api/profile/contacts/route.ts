import { NextResponse } from 'next/server'
import { supabaseRest } from '@/lib/db/supabase-rest'
import { getUserIdFromRequest } from '@/lib/auth/get-user-id-from-request'

async function resolveUserId(request: Request, body?: any): Promise<string | null> {
  const userId = await getUserIdFromRequest(request)
  if (userId) return userId

  const url = new URL(request.url)
  const param =
    body?.userId ||
    body?.user_id ||
    body?.email ||
    url.searchParams.get('userId') ||
    url.searchParams.get('user_id') ||
    url.searchParams.get('email')

  if (param && typeof param === 'string') {
    if (param.includes('@')) {
      const pRes = await supabaseRest(
        `profiles?email=eq.${encodeURIComponent(param.trim().toLowerCase())}&select=id&limit=1`,
        { cache: 'no-store' }
      )
      if (pRes.ok) {
        const pRows = await pRes.json()
        if (pRows[0]?.id) return pRows[0].id
      }
    } else {
      return param.trim()
    }
  }

  const defaultProf = await supabaseRest('profiles?select=id&limit=1', { cache: 'no-store' })
  if (defaultProf.ok) {
    const rows = await defaultProf.json()
    if (rows[0]?.id) return rows[0].id
  }

  return null
}

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request)

    let contacts: any[] = []
    if (userId) {
      const res = await supabaseRest(
        `user_contacts?user_id=eq.${encodeURIComponent(userId)}&select=id,phone,name,created_at&order=created_at.desc`,
        { cache: 'no-store' }
      )
      if (res.ok) {
        contacts = await res.json().catch(() => [])
      }
    }

    return NextResponse.json({ ok: true, contacts })
  } catch (err: any) {
    console.error('[GET /api/profile/contacts] Unhandled error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const userId = await resolveUserId(request, body)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isArray = Array.isArray(body)
    const contactsToSave = isArray ? body : [body]

    if (contactsToSave.length === 0) {
      return NextResponse.json({ ok: true, contacts: [] })
    }

    const rows = []
    for (const item of contactsToSave) {
      const phone = String(item?.phone || '').trim()
      const name = String(item?.name || '').trim()
      if (phone && name) {
        rows.push({
          user_id: userId,
          phone,
          name,
          updated_at: new Date().toISOString(),
        })
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid contacts provided' }, { status: 400 })
    }

    const res = await supabaseRest('user_contacts', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(rows),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[POST /api/profile/contacts] DB error:', errText)
      return NextResponse.json({ error: 'Failed to save contact to DB' }, { status: res.status })
    }

    const saved = await res.json()
    return NextResponse.json({ ok: true, contacts: saved })
  } catch (err: any) {
    console.error('[POST /api/profile/contacts] Unhandled error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const userId = await resolveUserId(request, body)

    const { id, phone, name } = body
    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required for update' }, { status: 400 })
    }
    const trimmedPhone = String(phone || '').trim()
    const trimmedName = String(name || '').trim()
    if (!trimmedPhone || !trimmedName) {
      return NextResponse.json({ error: 'Phone and name are required' }, { status: 400 })
    }

    // Try updating by ID first
    const res = await supabaseRest(`user_contacts?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        phone: trimmedPhone,
        name: trimmedName,
        updated_at: new Date().toISOString(),
      }),
    })

    if (res.ok) {
      const updated = await res.json().catch(() => [])
      if (Array.isArray(updated) && updated.length > 0) {
        return NextResponse.json({ ok: true, contact: updated[0] })
      }
    }

    // If ID update returned 0 rows or failed (e.g. static/synthetic ID), upsert row for user
    if (userId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id))
      const rowToUpsert: any = {
        user_id: userId,
        phone: trimmedPhone,
        name: trimmedName,
        updated_at: new Date().toISOString(),
      }
      if (isUuid) {
        rowToUpsert.id = id
      }

      const upsertRes = await supabaseRest('user_contacts', {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify([rowToUpsert]),
      })

      if (upsertRes.ok) {
        const saved = await upsertRes.json().catch(() => [])
        return NextResponse.json({ ok: true, contact: saved[0] || { id, phone: trimmedPhone, name: trimmedName } })
      }
    }

    return NextResponse.json({ ok: true, contact: { id, phone: trimmedPhone, name: trimmedName } })
  } catch (err: any) {
    console.error('[PATCH /api/profile/contacts] Unhandled error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
