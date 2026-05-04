import { NextResponse } from 'next/server'
import { dbFetchCountries } from '@/lib/db/catalog'
import { guardCatalog } from '@/lib/db/require-catalog'

export async function GET() {
  const denied = guardCatalog()
  if (denied) return denied

  try {
    const rows = await dbFetchCountries()

    const countries = rows.map((c) => ({
      code: c.country_iso,
      name: c.name,
      flag: flagEmoji(c.country_iso),
      dialCode: c.dial_prefix ?? '',
      dialingInfo: [
        {
          prefix: c.dial_prefix ?? '',
          minLength: c.min_length ?? 10,
          maxLength: c.max_length ?? 15,
        },
      ],
    }))

    return NextResponse.json({ countries })
  } catch (error) {
    console.error('countries:', error)
    return NextResponse.json({ error: 'Failed to fetch countries' }, { status: 500 })
  }
}

function flagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}
