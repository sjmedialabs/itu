import { cn } from '@/lib/utils'

type ItuLogoMarkProps = {
  className?: string
  size?: 'sm' | 'md'
}

export function ItuLogoMark({ className, size = 'md' }: ItuLogoMarkProps) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full bg-white shadow-[0_2px_14px_rgba(15,23,42,0.1)] ring-1 ring-neutral-200/90',
        size === 'sm' ? 'size-8' : 'size-10',
        className,
      )}
      aria-hidden
    >
      <span
        className={cn(
          'select-none font-black leading-none tracking-tighter text-neutral-900',
          size === 'sm' ? 'text-[0.95rem]' : 'text-[1.05rem]',
        )}
      >
        U
      </span>
      <span
        className={cn(
          'absolute left-1/2 top-1/2 z-[1] -translate-x-[42%] -translate-y-1/2 rounded-full bg-[#E30613] shadow-sm',
          size === 'sm' ? 'h-[58%] w-[2.5px]' : 'h-[62%] w-[3px]',
        )}
      />
    </span>
  )
}
