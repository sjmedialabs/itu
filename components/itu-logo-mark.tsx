import { cn } from '@/lib/utils'
import Image from 'next/image'

type ItuLogoMarkProps = {
  className?: string
  size?: 'sm' | 'md'
}

export function ItuLogoMark({ className, size = 'md' }: ItuLogoMarkProps) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-neutral-200/90',
        size === 'sm' ? 'size-8' : 'size-10',
        className,
      )}
      aria-hidden
    >
      <Image src="/itu-logo.png" alt="ITU logo" fill className="object-cover" sizes={size === 'sm' ? '32px' : '40px'} />
    </span>
  )
}
