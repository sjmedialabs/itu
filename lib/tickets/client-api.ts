'use client'

import type { Ticket, TicketAdminDetail, TicketMessage, TicketNote, TicketStatus, TicketWithThread } from './types'

export type TicketUserHeaders = {
  id: string
  email: string
  name: string
  role: string
}

function headers(user: TicketUserHeaders) {
  return {
    'Content-Type': 'application/json',
    'x-user-id': user.id,
    'x-user-email': user.email,
    'x-user-name': user.name,
    'x-user-role': user.role,
  }
}

export async function apiCreateTicket(
  user: TicketUserHeaders,
  body: { subject: string; description: string; transactionId?: string; transactionCreatedAt?: string },
) {
  const res = await fetch('/api/tickets', {
    method: 'POST',
    headers: headers(user),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Failed to create ticket')
  return data.ticket as Ticket
}

export async function apiListTickets(user: TicketUserHeaders) {
  const res = await fetch('/api/tickets', { headers: headers(user) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Failed to load tickets')
  return data.tickets as Ticket[]
}

export async function apiGetTicket(user: TicketUserHeaders, ticketId: string) {
  const res = await fetch(`/api/tickets/${ticketId}`, { headers: headers(user) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Failed to load ticket')
  return data as TicketWithThread
}

export async function apiPostTicketMessage(user: TicketUserHeaders, ticketId: string, message: string) {
  const res = await fetch(`/api/tickets/${ticketId}/message`, {
    method: 'POST',
    headers: headers(user),
    body: JSON.stringify({ message }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Failed to send message')
  return data.message as TicketMessage
}

export async function apiAdminListTickets(admin: TicketUserHeaders, params: { status?: TicketStatus | 'all'; q?: string }) {
  const sp = new URLSearchParams()
  if (params.status && params.status !== 'all') sp.set('status', params.status)
  if (params.q?.trim()) sp.set('q', params.q.trim())
  const res = await fetch(`/api/admin/tickets?${sp}`, { headers: headers(admin) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Failed to load tickets')
  return data.tickets as Ticket[]
}

export async function apiAdminGetTicket(admin: TicketUserHeaders, ticketId: string) {
  const res = await fetch(`/api/admin/tickets/${ticketId}`, { headers: headers(admin) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Failed to load ticket')
  return data as TicketAdminDetail
}

export async function apiAdminRespond(admin: TicketUserHeaders, ticketId: string, message: string) {
  const res = await fetch(`/api/admin/tickets/${ticketId}/respond`, {
    method: 'POST',
    headers: headers(admin),
    body: JSON.stringify({ message }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Failed to respond')
  return data as { message: TicketMessage; ticket: Ticket }
}

export async function apiAdminSetStatus(admin: TicketUserHeaders, ticketId: string, status: TicketStatus) {
  const res = await fetch(`/api/admin/tickets/${ticketId}/status`, {
    method: 'PATCH',
    headers: headers(admin),
    body: JSON.stringify({ status }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Failed to update status')
  return data.ticket as Ticket
}

export async function apiAdminAddNote(admin: TicketUserHeaders, ticketId: string, note: string) {
  const res = await fetch(`/api/admin/tickets/${ticketId}/notes`, {
    method: 'POST',
    headers: headers(admin),
    body: JSON.stringify({ note }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Failed to add note')
  return data.note as TicketNote
}
