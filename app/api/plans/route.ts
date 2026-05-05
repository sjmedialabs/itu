import { NextResponse } from 'next/server'
import { getDemoPlanRows, isCatalogDemoFallbackEnabled } from '@/lib/catalog/demo-plans'
import { dbFetchOperators, dbFetchPlans, type PlanRow } from '@/lib/db/catalog'
import { guardCatalog } from '@/lib/db/require-catalog'

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function mapPlanType(raw: string | null | undefined): 'topup' | 'unlimited' | 'data' {
  const t = (raw ?? 'topup').toLowerCase()
  if (t === 'data') return 'data'
  if (t === 'voice' || t === 'unlimited' || t === 'combo') return 'unlimited'
  return 'topup'
}

function rowToPlan(p: PlanRow) {
  const tag = p.tag === 'popular' ? ('popular' as const) : ('none' as const)
  return {
    id: p.sku_code,
    price_inr: Math.round(num(p.price_inr)),
    price_eur: Number(num(p.price_eur).toFixed(2)),
    validity: p.validity ?? '',
    data: p.data_label ?? undefined,
    calls: p.calls_label ?? undefined,
    sms: p.sms_label ?? undefined,
    benefits: p.benefits ?? '',
    tag,
    type: mapPlanType(p.plan_type),
    planName: p.plan_name ?? undefined,
  }
}

export async function GET(request: Request) {
  const denied = guardCatalog()
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const operatorRaw = (searchParams.get('operator') ?? '').trim()
    const operatorLc = operatorRaw.toLowerCase()
    const providerCodeHint = (searchParams.get('providerCode') ?? '').trim()
    const country = (searchParams.get('country') ?? 'IN').trim().toUpperCase()

    if (!operatorLc && !providerCodeHint) {
      return NextResponse.json({ error: 'operator or providerCode is required' }, { status: 400 })
    }

    let code = providerCodeHint || null
    if (!code && operatorLc) {
      const operators = await dbFetchOperators(country)
      const matched =
        operators.find((p) => p.code.toLowerCase() === operatorLc) ||
        operators.find((p) => (p.short_name ?? '').toLowerCase().includes(operatorLc)) ||
        operators.find((p) => (p.name ?? '').toLowerCase().includes(operatorLc))
      code = matched?.code ?? null
    }

    // When the UI shows "Unknown" or names don't match DB codes, still return plans for the country.
    let rows = await dbFetchPlans(country, code)
    if (!rows.length && isCatalogDemoFallbackEnabled()) {
      rows = getDemoPlanRows(country)
    }
    return NextResponse.json({ plans: rows.map(rowToPlan) })
  } catch (error) {
    console.error('plans:', error)
    return NextResponse.json({ error: 'Failed to load plans' }, { status: 500 })
  }
}
