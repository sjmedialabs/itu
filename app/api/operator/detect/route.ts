import { NextResponse } from 'next/server'
import { isCatalogDemoFallbackEnabled } from '@/lib/catalog/demo-plans'
import { getDemoOperatorRows } from '@/lib/catalog/demo-operators'
import { dbFetchOperators, pickOperatorForPhone } from '@/lib/db/catalog'
import { guardCatalog } from '@/lib/db/require-catalog'

export async function POST(request: Request) {
  const denied = guardCatalog()
  if (denied) return denied

  try {
    const body = await request.json().catch(() => ({}))
    const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : ''
    const countryCode = typeof body.countryCode === 'string' ? body.countryCode.trim().toUpperCase() : ''

    if (!phoneNumber || !countryCode) {
      return NextResponse.json({ error: 'phoneNumber and countryCode are required' }, { status: 400 })
    }

    let operators = await dbFetchOperators(countryCode)
    if (!operators.length && isCatalogDemoFallbackEnabled()) {
      operators = getDemoOperatorRows(countryCode)
    }
    const picked = pickOperatorForPhone(operators, phoneNumber)

    if (!picked) {
      return NextResponse.json({
        operator: 'Unknown',
        providerCode: undefined as string | undefined,
        country: countryCode,
      })
    }

    return NextResponse.json({
      operator: (picked.short_name ?? picked.name).trim(),
      providerCode: picked.code,
      country: countryCode,
    })
  } catch (error) {
    console.error('operator/detect:', error)
    return NextResponse.json({ error: 'Failed to detect operator' }, { status: 500 })
  }
}
