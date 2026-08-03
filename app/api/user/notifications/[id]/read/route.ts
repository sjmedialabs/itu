import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/get-user-id-from-request'
import { markNotificationAsRead } from '@/lib/notifications/user-notifications'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Ctx) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: notificationId } = await context.params

  try {
    await markNotificationAsRead(userId, notificationId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
