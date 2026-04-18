import { cn } from '@/lib/utils'

export function HeroPaymentLogos({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-7 md:gap-10', className)}>
      <svg viewBox="0 0 52 18" className="h-5 w-[3.25rem] shrink-0" aria-label="American Express">
        <rect width="52" height="18" rx="2" fill="#006FCF" />
        <path
          fill="white"
          d="M6 6h6v6H6V6zm14 0h-4l-2 2.5L12 6H8v6h4v-4l2 2.5 2-2.5v4h4V6zm8 0h-6v6h6v-1.5h-4v-1h4v-1h-4V7.5h4V6zm6 0h-6v1.5h2v4.5h4V6z"
        />
      </svg>
      <span className="flex h-6 items-center text-lg font-semibold tracking-tight text-[#635BFF]" aria-label="Stripe">
        stripe
      </span>
      <svg viewBox="0 0 48 16" className="h-5 w-12 shrink-0" aria-label="Visa">
        <path
          fill="#1A1F71"
          d="M20.2 15.5h3.1L22 0h-3.1l1.3 15.5zm8.5-15.1c-1 0-1.7.5-2.1 1.4L22.8 15.5h3.5l.5-3.2h3l.3 3.2h3.1L31.5.4h-2.8zm.4 5l1 5.5h-2.7l1.7-5.5zM9.5 10.2L8.1 5.1 7.2 9.9c-.2 1-.2 1.8-.2 2.5H3.9L2 0h3.6l1 8.2L8.2 0h3.7l2.6 15.5H11l-.5-5.3zM44 9.8c0-1.2-.5-2-1.8-2.7-1-.5-1.3-.8-1.3-1.3 0-.5.5-.8 1.4-.8.8 0 1.5.2 2 .4l.4-2.5c-.7-.3-1.7-.5-2.8-.5-2.6 0-4.4 1.3-4.4 3.2 0 1.4.8 2.2 2.3 2.9 1 .5 1.3.9 1.3 1.4 0 .6-.6.9-1.7.9-.9 0-2-.3-2.7-.7l-.4 2.6c.8.4 2.2.7 3.7.7 2.8 0 4.6-1.3 4.6-3.4z"
        />
      </svg>
      <svg viewBox="0 0 40 24" className="h-7 w-11 shrink-0" aria-label="Mastercard">
        <circle cx="15" cy="12" r="10" fill="#EB001B" />
        <circle cx="25" cy="12" r="10" fill="#F79E1B" fillOpacity="0.98" />
        <path fill="#FF5F00" d="M20 5.5a10 10 0 000 13 10 10 0 000-13z" />
      </svg>
      <svg viewBox="0 0 56 14" className="h-4 w-14 shrink-0" aria-label="PayPal">
        <path
          fill="#003087"
          d="M4 2h6c2 0 3.2 1 3.2 2.8 0 2.2-1.6 3.5-4.2 3.5H7.8L7.4 12H4L4 2zm6 4.8c1 0 1.6-.5 1.6-1.3 0-.8-.6-1.2-1.6-1.2H7.5L7.2 6.8H10z"
        />
        <path
          fill="#009CDE"
          d="M16 2h3.2l-.4 2.5h2.8c2.2 0 3.5 1.1 3.5 3 0 2-1.4 3.3-4 3.3h-2.5L17.6 12h-3.2L16 2zm3.8 6h1.6c1.1 0 1.8-.5 1.8-1.4 0-.8-.7-1.3-1.8-1.3h-1.8l-.6 2.7z"
        />
      </svg>
    </div>
  )
}
