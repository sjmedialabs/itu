'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BadgePercent, CreditCard, Gift, ShieldCheck } from 'lucide-react'

const perks = [
  {
    icon: Gift,
    title: 'Gift vouchers',
    body: 'Send vouchers to friends & family and let them redeem anytime.',
  },
  {
    icon: BadgePercent,
    title: 'Best value',
    body: 'Get great rates on popular operators with instant delivery.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure checkout',
    body: 'Encrypted payments with trusted gateways.',
  },
] as const

const sampleVouchers = [
  { id: 'v-10', title: 'ITU Voucher', subtitle: 'Mobile Top-up Voucher', amount: '₹ 10', tag: 'Popular' },
  { id: 'v-25', title: 'ITU Voucher', subtitle: 'Mobile Top-up Voucher', amount: '₹ 25', tag: 'Best seller' },
  { id: 'v-50', title: 'ITU Voucher', subtitle: 'Mobile Top-up Voucher', amount: '₹ 50', tag: 'New' },
  { id: 'v-100', title: 'ITU Voucher', subtitle: 'Mobile Top-up Voucher', amount: '₹ 100', tag: 'Value' },
] as const

export default function VouchersPage() {
  return (
    <div className="min-h-[calc(100vh-6rem)] bg-[#f3f9ff]">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">Vouchers</h1>
          <p className="mt-2 text-sm text-neutral-400 md:text-base">
            Buy a voucher and redeem instantly. Perfect for gifts and quick recharges.
          </p>
        </div>

        <div className="mx-auto mt-8 grid gap-4 md:grid-cols-3">
          {perks.map((p) => (
            <Card key={p.title} className="rounded-2xl border-neutral-200/80 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.35)]">
              <CardHeader className="space-y-2">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                  <p.icon className="size-5 text-[var(--hero-cta-orange)]" />
                </div>
                <CardTitle className="text-base">{p.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-neutral-600">{p.body}</CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-[#eef8ff] p-5 shadow-sm ring-1 ring-black/5 md:p-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">Featured vouchers</h2>
              <p className="mt-1 text-sm text-neutral-500">Sample listing aligned with the existing style.</p>
            </div>
            <Button asChild className="h-11 rounded-xl bg-[var(--hero-cta-orange)] px-7 font-semibold text-white hover:brightness-105">
              <Link href="/topup">Redeem via Top-up</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sampleVouchers.map((v) => (
              <Card key={v.id} className="rounded-2xl border-neutral-200/80 bg-white shadow-[0_14px_40px_-28px_rgba(15,23,42,0.35)]">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-[#fff4ec] ring-1 ring-black/5">
                      <CreditCard className="size-5 text-[var(--hero-cta-orange)]" />
                    </div>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 ring-1 ring-black/5">
                      {v.tag}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{v.title}</p>
                    <p className="text-xs text-neutral-500">{v.subtitle}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-2xl font-bold tracking-tight text-neutral-900">{v.amount}</p>
                  <Button
                    className="h-10 w-full rounded-xl bg-[var(--hero-cta-orange)] text-sm font-semibold text-white hover:brightness-105"
                    asChild
                  >
                    <Link href="/topup">Buy now</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.35)] md:p-7">
          <h3 className="text-base font-bold text-neutral-900">How vouchers work</h3>
          <ol className="mt-3 space-y-2 text-sm text-neutral-600">
            <li>1) Choose a voucher amount and checkout securely.</li>
            <li>2) You’ll receive a voucher code instantly.</li>
            <li>3) Redeem it during top-up to apply the balance.</li>
          </ol>
          <div className="mt-5">
            <Button variant="outline" className="h-11 rounded-xl" asChild>
              <Link href="/help">Need help? Visit Help</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

