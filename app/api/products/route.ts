import { NextResponse } from 'next/server'
import { dbFetchPlans, type PlanRow } from '@/lib/db/catalog'
import { guardCatalog } from '@/lib/db/require-catalog'

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function benefitsFromRow(p: PlanRow): Array<{ Type: string; Value?: number; Unit?: string; AdditionalInformation?: string }> {
  const raw = p.benefits_json
  if (!Array.isArray(raw)) return []
  return raw.map((b: Record<string, unknown>) => ({
    Type: String(b.Type ?? b.type ?? 'Data'),
    Value: typeof b.Value === 'number' ? b.Value : typeof b.value === 'number' ? (b.value as number) : undefined,
    Unit: b.Unit != null ? String(b.Unit) : b.unit != null ? String(b.unit) : undefined,
    AdditionalInformation:
      b.AdditionalInformation != null
        ? String(b.AdditionalInformation)
        : b.additionalInformation != null
          ? String(b.additionalInformation)
          : b.info != null
            ? String(b.info)
            : undefined,
  }))
}

function categorizeProduct(benefits: Array<{ Type: string }>): string {
  const types = benefits.map((b) => b.Type.toLowerCase())
  if (types.includes('data') && types.includes('voice')) return 'combo'
  if (types.includes('data')) return 'data'
  if (types.includes('voice') || types.includes('airtime')) return 'voice'
  return 'combo'
}

function rowToProduct(p: PlanRow) {
  const structured = benefitsFromRow(p)
  const minR = num(p.min_receive_amount, num(p.price_inr))
  const maxR = num(p.max_receive_amount, minR)
  const minS = num(p.min_send_amount, num(p.price_eur))
  const maxS = num(p.max_send_amount, minS)

  return {
    id: `prod-${p.sku_code.toLowerCase().replace(/_/g, '-')}`,
    skuCode: p.sku_code,
    carrierCode: p.operator_code,
    name: p.plan_name || p.sku_code,
    displayText: p.benefits || p.plan_name || p.sku_code,
    type: categorizeProduct(structured.length ? structured : [{ Type: 'Combo' }]),
    minSendAmount: minS,
    maxSendAmount: maxS || minS,
    sendCurrency: p.send_currency || 'EUR',
    minReceiveAmount: minR,
    maxReceiveAmount: maxR || minR,
    receiveCurrency: p.receive_currency || 'INR',
    commissionRate: num(p.commission_rate),
    processingMode: (p.processing_mode || 'Instant') as 'Instant' | 'Batch',
    benefits: structured.map((b) => ({
      type: b.Type,
      value: b.Value,
      unit: b.Unit,
      info: b.AdditionalInformation,
    })),
    validity: p.validity ?? undefined,
  }
}

export async function GET(request: Request) {
  const denied = guardCatalog()
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const countryCode = searchParams.get('countryCode')
    const providerCode = searchParams.get('providerCode')

    if (!countryCode) {
      return NextResponse.json({ error: 'Country code is required' }, { status: 400 })
    }

    const rows = await dbFetchPlans(countryCode, providerCode || undefined)
    const formattedProducts = rows.map(rowToProduct)

    return NextResponse.json({ products: formattedProducts })
  } catch (error) {
    console.error('products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
