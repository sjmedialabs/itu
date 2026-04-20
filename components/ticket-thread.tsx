'use client'

import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { TicketMessage } from '@/lib/tickets/types'

export function TicketThread({
  description,
  messages,
  variant = 'user',
}: {
  description: string
  messages: TicketMessage[]
  variant?: 'user' | 'admin'
}) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          'rounded-2xl border px-4 py-3 text-sm shadow-elevated-sm',
          variant === 'user'
            ? 'ml-0 mr-8 border-border/70 bg-muted/40'
            : 'border-border/70 bg-muted/30',
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Original message</p>
        <p className="mt-2 whitespace-pre-wrap text-foreground">{description}</p>
      </div>

      {messages.map((m) => {
        const isUser = m.senderType === 'user'
        return (
          <div
            key={m.id}
            className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[min(100%,520px)] rounded-2xl border px-4 py-3 text-sm shadow-sm',
                isUser
                  ? 'border-primary/20 bg-primary/10 text-foreground'
                  : 'border-border/80 bg-card text-foreground',
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-4 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{isUser ? 'You' : 'Support'}</span>
                <time dateTime={m.createdAt}>{format(new Date(m.createdAt), 'MMM d, yyyy HH:mm')}</time>
              </div>
              <p className="whitespace-pre-wrap">{m.message}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
