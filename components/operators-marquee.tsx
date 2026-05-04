'use client'

import { cn } from '@/lib/utils'

export type MarqueeLogo = { src: string; alt: string }

type Props = {
  logos: MarqueeLogo[]
  className?: string
  /** Animation duration for one full loop of the duplicated track */
  durationSec?: number
  /** `dark` — fades match navy hero; `light` — white section */
  variant?: 'light' | 'dark'
}

function isDataUrl(src: string) {
  return src.startsWith('data:')
}

export function OperatorsMarquee({ logos, className, durationSec = 42, variant = 'light' }: Props) {
  if (!logos.length) return null

  const track = [...logos, ...logos]
  const isDark = variant === 'dark'

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden py-6 md:py-8',
        isDark
          ? 'border-y border-white/10 bg-[var(--hero-navy)]/95'
          : 'border-y border-neutral-200/90 bg-neutral-50/80',
        className,
      )}
      aria-label="Operator logos"
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 z-[1] w-16 md:w-24',
          isDark ? 'bg-gradient-to-r from-[var(--hero-navy)] to-transparent' : 'bg-gradient-to-r from-white to-transparent',
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 z-[1] w-16 md:w-24',
          isDark ? 'bg-gradient-to-l from-[var(--hero-navy)] to-transparent' : 'bg-gradient-to-l from-white to-transparent',
        )}
      />
      <div
        className="operators-marquee-track flex w-max gap-10 md:gap-16 lg:gap-20"
        style={
          {
            ['--operators-marquee-duration' as string]: `${durationSec}s`,
          } as React.CSSProperties
        }
      >
        {track.map((logo, i) => (
          <div
            key={`${logo.alt}-${i}`}
            className="flex h-14 w-[7.5rem] shrink-0 items-center justify-center md:h-16 md:w-[9rem]"
          >
            <div
              className={cn(
                'flex max-h-[3.75rem] min-h-[3rem] w-full max-w-[9.5rem] items-center justify-center',
                isDark ? 'rounded-xl bg-white/95 px-2 py-1.5 shadow-sm ring-1 ring-white/25' : 'px-1',
              )}
            >
              {isDataUrl(logo.src) ? (
                // eslint-disable-next-line @next/next/no-img-element -- CMS data URLs
                <img src={logo.src} alt={logo.alt} className="max-h-11 w-auto max-w-full object-contain md:max-h-[3.25rem]" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic CMS paths
                <img src={logo.src} alt={logo.alt} className="max-h-11 w-auto max-w-full object-contain md:max-h-[3.25rem]" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
