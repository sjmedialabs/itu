import { NextResponse } from 'next/server'
import { getAuthenticatedRequestUser } from '@/lib/tickets/auth-headers'
import { supabaseRest } from '@/lib/db/supabase-rest'

export async function POST(request: Request) {
  const user = await getAuthenticatedRequestUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const fcmToken = typeof body.fcmToken === 'string' ? body.fcmToken.trim() : ''
    const deviceType = typeof body.deviceType === 'string' ? body.deviceType.trim().toLowerCase() : 'android'

    if (!fcmToken) {
      return NextResponse.json({ error: 'FCM token is required' }, { status: 400 })
    }

    // Upsert user FCM token
    const res = await supabaseRest('user_fcm_tokens?on_conflict=fcm_token', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify([
        {
          user_id: user.id,
          fcm_token: fcmToken,
          device_type: deviceType || 'android',
          updated_at: new Date().toISOString(),
        },
      ]),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[FCM] Error saving token:', res.status, errText)
      return NextResponse.json({ error: 'Failed to save FCM token' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'FCM token registered' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedRequestUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const fcmToken = typeof body.fcmToken === 'string' ? body.fcmToken.trim() : ''

    if (!fcmToken) {
      return NextResponse.json({ error: 'FCM token is required' }, { status: 400 })
    }

    const res = await supabaseRest(
      `user_fcm_tokens?user_id=eq.${encodeURIComponent(user.id)}&fcm_token=eq.${encodeURIComponent(fcmToken)}`,
      { method: 'DELETE' }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to remove FCM token' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'FCM token unregistered' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
