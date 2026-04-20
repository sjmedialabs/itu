'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { MessageSquarePlus, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/stores'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TicketStatusBadge } from '@/components/ticket-status-badge'
import { apiCreateTicket, apiListTickets } from '@/lib/tickets/client-api'
import type { Ticket } from '@/lib/tickets/types'
import { toast } from 'sonner'

export default function AccountTicketsPage() {
  const user = useAuthStore((s) => s.user)
  const headers = useMemo(
    () =>
      user
        ? { id: user.id, email: user.email, name: user.name, role: user.role }
        : null,
    [user],
  )

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')

  const load = useCallback(async () => {
    if (!headers) return
    setLoading(true)
    try {
      const list = await apiListTickets(headers)
      setTickets(list)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [headers])

  useEffect(() => {
    void load()
  }, [load])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!headers) return
    setSubmitting(true)
    try {
      await apiCreateTicket(headers, { subject, description })
      toast.success('Ticket created')
      setOpen(false)
      setSubject('')
      setDescription('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  if (!headers) return null

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Support Tickets</h1>
          <p className="text-muted-foreground">Raise a complaint and track replies from our team.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 self-start sm:self-auto">
              <MessageSquarePlus className="size-4" />
              Create New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <form onSubmit={onCreate}>
              <DialogHeader>
                <DialogTitle>New support ticket</DialogTitle>
                <DialogDescription>
                  Describe your issue. Our team usually responds within one business day.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="ticket-subject">Subject</Label>
                  <Input
                    id="ticket-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Short summary"
                    required
                    maxLength={200}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ticket-desc">Description</Label>
                  <Textarea
                    id="ticket-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What happened? Include order or phone numbers if relevant."
                    required
                    rows={6}
                    className="resize-y min-h-[120px]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Attachment</Label>
                  <Input type="file" disabled className="cursor-not-allowed opacity-60" />
                  <p className="text-xs text-muted-foreground">File uploads are coming soon.</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Submit ticket'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-elevated-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">
            No tickets yet. Create one to get help from support.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Ticket ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[160px]">Last updated</TableHead>
                <TableHead className="w-[100px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{t.id.slice(0, 8)}…</TableCell>
                  <TableCell className="font-medium">{t.subject}</TableCell>
                  <TableCell>
                    <TicketStatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(t.updatedAt), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/account/tickets/${t.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
