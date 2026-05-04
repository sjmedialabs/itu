import { NextResponse } from 'next/server'
import { dbFetchOperatorsForCountries } from '@/lib/db/catalog'
import { guardCatalog } from '@/lib/db/require-catalog'

const MAX_CODES = 40

/**
 * GET ?codes=JM,NG,IN — counts operators per ISO from Supabase `operators`.
 */
export async function GET(request: Request) {
  const denied = guardCatalog()
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const raw = searchParams.get('codes') ?? ''
    const parsed = raw
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter((c) => /^[A-Z]{2}$/.test(c))
    const unique = [...new Set(parsed)].slice(0, MAX_CODES)

    if (!unique.length) {
      return NextResponse.json({ counts: {} })
    }

    const rows = await dbFetchOperatorsForCountries(unique)
    const counts: Record<string, number> = Object.fromEntries(unique.map((iso) => [iso, 0]))
    for (const r of rows) {
      const iso = r.country_iso?.toUpperCase()
      if (iso && iso in counts) counts[iso]++
    }

    return NextResponse.json({ counts })
  } catch (error) {
    console.error('operator-counts:', error)
    return NextResponse.json({ error: 'Failed to load operator counts' }, { status: 500 })
  }
}
