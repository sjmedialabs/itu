import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth/require-admin-feature'
import { getTicketAdmin, setTicketStatus } from '@/lib/tickets/db-persistence'
import type { TicketStatus } from '@/lib/tickets/types'
import { logAdminActivity } from '@/lib/auth/audit'
import { notifyStatusUpdate } from '@/lib/tickets/socket-notifier'
import { createUserNotification } from '@/lib/notifications/user-notifications'
import { sendFcmPushToUser } from '@/lib/notifications/fcm-service'

type Ctx = { params: Promise<{ id: string }> }

const ALLOWED: TicketStatus[] = ['open', 'in_progress', 'resolved']

export async function PATCH(request: Request, context: Ctx) {
  const denied = await requireAdminPermission(request, 'tickets.edit')
  if (denied) return denied

  const { id: ticketId } = await context.params

  try {
    const existing = await getTicketAdmin(ticketId)
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const status = body.status as TicketStatus
    if (!ALLOWED.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const ticket = await setTicketStatus(ticketId, status)

    if (ticket) {
      await notifyStatusUpdate(ticketId, ticket.status).catch(() => { })
      await createUserNotification({
        userId: existing.userId,
        title: status === 'resolved' ? 'Support Ticket Resolved' : 'Ticket Status Updated',
        message:
          status === 'resolved'
            ? `Your ticket "${existing.subject}" has been marked as resolved.`
            : `Your ticket "${existing.subject}" status changed to ${status.toUpperCase().replace('_', ' ')}.`,
        type: 'support_ticket_status',
        details: { ticketId, status, ticketSubject: existing.subject },
      }).catch((err) => console.warn('Failed to send user notification on status update:', err))
    }

    if (status === 'resolved') {
      sendFcmPushToUser({
        userId: existing.userId,
        title: 'Support Ticket Resolved',
        body: `Your ticket "${existing.subject}" has been marked as resolved.`,
        data: {
          type: 'support_ticket_resolved',
          ticketId: ticketId,
        },
      }).catch((err) => console.error('[FCM] Error sending ticket resolved push:', err))
    }

    await logAdminActivity({
      action: 'Change Ticket Status',
      pageName: 'Support Tickets',
      details: { ticketId, status },
    })

    return NextResponse.json({ ticket })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
