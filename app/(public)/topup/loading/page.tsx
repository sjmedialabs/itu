'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useTopupStore } from '@/store/topupStore'

export default function TopupLoadingPage() {
  const router = useRouter()
  const { orderId, pricing, totalAmount } = useTopupStore()
  const [seconds, setSeconds] = useState(15)
  const [redirected, setRedirected] = useState(false)

  useEffect(() => {
    if (!orderId) {
      router.push('/topup')
      return
    }
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [orderId, router])

  useEffect(() => {
    if (!orderId || redirected) return
    if (seconds !== 0) return
    setRedirected(true)
    router.push('/topup/payment')
  }, [seconds, orderId, redirected, router])

  const amountLabel = useMemo(() => {
    if (!pricing) return ''
    return `${totalAmount.toFixed(2)} ${pricing.localCurrency}`
  }, [pricing, totalAmount])

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-[#f3f9ff]">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
        <div className="relative mb-6">
          <div className="size-20 rounded-full border-[10px] border-[var(--hero-cta-orange)]/20" />
          <div className="absolute inset-0 m-auto size-20 animate-spin rounded-full border-[10px] border-transparent border-t-[var(--hero-cta-orange)]" />
        </div>
        <p className="text-2xl font-medium text-neutral-900">{seconds} sec</p>
        <p className="mt-2 text-xl font-semibold text-neutral-900">Please wait………</p>
        <p className={cn('mt-6 max-w-md text-base text-neutral-700')}>We are now processing your payment .</p>
        <p className="text-base text-neutral-700">Almost done.</p>
        {amountLabel ? <p className="mt-6 text-sm text-neutral-500">Amount: {amountLabel}</p> : null}
      </div>
    </div>
  )
}


