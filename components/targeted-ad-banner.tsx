'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { useAdminToolsStore, isAdLive } from '@/lib/admin-tools-store'
import { useAuthStore, useLocalePreferencesStore, useWalletStore } from '@/lib/stores'

function getFrequentTopupCountry(
  userId: string | undefined,
  transactions: ReturnType<typeof useWalletStore.getState>['transactions'],
) {
  if (!userId) return null
  const counts = new Map<string, number>()
  for (const txn of transactions) {
    if (txn.userId !== userId || txn.type !== 'recharge') continue
    const country = txn.metadata?.country
    if (!country) continue
    counts.set(country, (counts.get(country) ?? 0) + 1)
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] ?? null
}

export function TargetedAdBanner() {
  const ads = useAdminToolsStore((s) => s.ads)
  const user = useAuthStore((s) => s.user)
  const regionCode = useLocalePreferencesStore((s) => s.regionCode)
  const transactions = useWalletStore((s) => s.transactions)

  const ad = useMemo(() => {
    const liveAds = ads.filter((x) => isAdLive(x))
    if (liveAds.length === 0) return null

    const frequentCountry = getFrequentTopupCountry(user?.id, transactions)
    const destination = frequentCountry ?? regionCode

    const targeted = liveAds.find((x) => x.targetCountries.includes(destination))
    if (targeted) return { ad: targeted, destination }

    const global = liveAds.find((x) => x.targetCountries.length === 0)
    if (global) return { ad: global, destination }

    return null
  }, [ads, user?.id, transactions, regionCode])

  if (!ad) return null

  return (
    <aside className="mx-auto mb-4 w-full max-w-6xl px-4 sm:px-6 lg:max-w-7xl">
      <Link
        href={ad.ad.ctaUrl || '/recharge'}
        className="group block overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-elevated-sm transition-transform hover:-translate-y-0.5"
      >
        <div className="flex flex-col gap-0 md:flex-row md:items-stretch">
          <img
            src={ad.ad.imageUrl}
            alt={ad.ad.title}
            className="h-36 w-full object-cover md:h-auto md:w-72"
          />
          <div className="flex flex-1 items-center justify-between gap-3 p-4">
            <div className="space-y-1">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Destination country offer
              </Badge>
              <p className="text-base font-semibold tracking-tight group-hover:text-primary">{ad.ad.title}</p>
              <p className="text-xs text-muted-foreground">
                Matched to your frequent top-up destination: {ad.destination}
              </p>
            </div>
            <span className="text-sm font-semibold text-primary">View offer</span>
          </div>
        </div>
      </Link>
    </aside>
  )
}
