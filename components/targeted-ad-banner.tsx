'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { useAdminToolsStore, isAdLive } from '@/lib/admin-tools-store'
import { useAuthStore, useLocalePreferencesStore, useWalletStore } from '@/lib/stores'
import { X } from 'lucide-react'

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
  const [open, setOpen] = useState(false)

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

  useEffect(() => {
    if (!ad) {
      setOpen(false)
      return
    }
    const key = `ad-modal-dismissed:${ad.ad.id}`
    const dismissed = window.sessionStorage.getItem(key) === '1'
    setOpen(!dismissed)
  }, [ad?.ad.id])

  const closeModal = () => {
    if (!ad) return
    window.sessionStorage.setItem(`ad-modal-dismissed:${ad.ad.id}`, '1')
    setOpen(false)
  }

  if (!ad || !open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close offer"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={closeModal}
      />
      <aside className="relative z-[1] w-full max-w-2xl overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-elevated">
        <button
          type="button"
          className="absolute right-3 top-3 z-[2] rounded-full bg-black/50 p-1.5 text-white transition hover:bg-black/70"
          onClick={closeModal}
          aria-label="Close ad"
        >
          <X className="h-4 w-4" />
        </button>
        <Link
          href={ad.ad.ctaUrl || '/recharge'}
          className="group block"
          onClick={closeModal}
        >
          <img
            src={ad.ad.imageUrl}
            alt={ad.ad.title}
            className="h-48 w-full object-cover sm:h-56"
          />
          <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
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
        </Link>
      </aside>
    </div>
  )
}
