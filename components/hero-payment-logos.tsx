import { cn } from '@/lib/utils'

export function HeroPaymentLogos({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 sm:gap-2.5', className)}>
      <span className="inline-flex h-9 items-center rounded-xl border border-neutral-200/80 bg-white px-3.5 text-xs font-semibold tracking-[0.08em] text-[#006FCF] shadow-sm">
        AMEX
      </span>
      <span className="inline-flex h-9 items-center rounded-xl border border-neutral-200/80 bg-white px-3.5 text-xs font-bold tracking-tight text-[#635BFF] shadow-sm">
        stripe
      </span>
      <span className="inline-flex h-9 items-center rounded-xl border border-neutral-200/80 bg-white px-3.5 text-xs font-black tracking-[0.12em] text-[#1A1F71] shadow-sm">
        VISA
      </span>
      <span
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white px-3.5 text-xs font-semibold text-neutral-700 shadow-sm"
        aria-label="Mastercard"
      >
        <span className="relative inline-flex w-5 items-center justify-center">
          <span className="absolute left-[2px] size-3.5 rounded-full bg-[#EB001B]" />
          <span className="absolute left-[8px] size-3.5 rounded-full bg-[#F79E1B] opacity-95" />
        </span>
        Mastercard
      </span>
      <span
        className="inline-flex h-9 items-center rounded-xl border border-neutral-200/80 bg-white px-3.5 text-xs font-black tracking-tight text-[#003087] shadow-sm"
        aria-label="PayPal"
      >
        Pay<span className="text-[#009CDE]">Pal</span>
      </span>
    </div>
  )
}
