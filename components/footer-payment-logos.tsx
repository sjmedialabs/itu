/**
 * Compact payment marks for the footer (decorative; not live card UI).
 */
export function FooterPaymentLogos({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <ul className="flex flex-wrap items-center gap-3 md:gap-4">
        <li>
          <span className="flex h-7 min-w-[2.75rem] items-center justify-center rounded border border-[#2E77BC] bg-white px-1.5 text-[8px] font-bold leading-none tracking-tight text-[#2E77BC]">
            AMEX
          </span>
        </li>
        <li>
          <span className="flex h-7 items-center rounded bg-[#635BFF] px-2 text-[10px] font-bold tracking-tight text-white">
            stripe
          </span>
        </li>
        <li>
          <span className="flex h-7 min-w-[2.5rem] items-center justify-center rounded bg-[#1A1F71] text-[11px] font-bold italic text-white">
            VISA
          </span>
        </li>
        <li className="flex h-7 w-10 items-center justify-center">
          <span className="relative flex h-5 w-8 items-center justify-center">
            <span className="absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-neutral-400 bg-[#EB001B]" />
            <span className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-neutral-400 bg-[#F79E1B] opacity-95" />
          </span>
        </li>
        <li>
          <span className="flex h-7 items-center rounded border border-[#003087] bg-white px-2 text-[9px] font-bold text-[#003087]">
            Pay<span className="text-[#009cde]">Pal</span>
          </span>
        </li>
      </ul>
    </div>
  )
}
