import { NextResponse } from 'next/server'
import { getCountriesWithFallback } from '@/lib/api/ding-connect'

export async function GET() {
  try {
    const countries = await getCountriesWithFallback()
    
    // Transform to app-friendly format
    const formattedCountries = countries.map(c => ({
      code: c.CountryIso,
      name: c.CountryName,
      flag: getFlagEmoji(c.CountryIso),
      dialCode: c.InternationalDialingInformation?.[0]?.Prefix || '',
      dialingInfo: c.InternationalDialingInformation?.map(d => ({
        prefix: d.Prefix,
        minLength: d.MinimumLength,
        maxLength: d.MaximumLength,
      })) || [],
    }))

    return NextResponse.json({ countries: formattedCountries })
  } catch (error) {
    console.error('Error fetching countries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    )
  }
}

// Helper to get flag emoji from country code
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}
