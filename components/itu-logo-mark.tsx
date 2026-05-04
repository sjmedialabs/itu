import { cn } from '@/lib/utils'
import Image from 'next/image'

type ItuLogoMarkProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ItuLogoMark({ className, size = 'md' }: ItuLogoMarkProps) {
  const dim = size === 'sm' ? 'size-8' : 'size-[65px]'
  const sizes = size === 'sm' ? '42px' : '65px'
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-neutral-200/90',
        dim,
        className,
      )}
      aria-hidden
    >
      <Image src="/itu-logo.png" alt="ITU logo" fill className="object-cover" sizes={sizes} />
    </span>
  )
}
