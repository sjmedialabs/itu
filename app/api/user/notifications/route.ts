import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/get-user-id-from-request'
import {
  listNotificationsForUser,
  markAllNotificationsAsRead,
} from '@/lib/notifications/user-notifications'

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const notifications = await listNotificationsForUser(userId)
    const unreadCount = notifications.filter((n) => !n.isRead).length

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await markAllNotificationsAsRead(userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
