import { NextResponse } from 'next/server'
import { getProvidersWithFallback } from '@/lib/api/ding-connect'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const countryCode = searchParams.get('countryCode')

    if (!countryCode) {
      return NextResponse.json(
        { error: 'Country code is required' },
        { status: 400 }
      )
    }

    const providers = await getProvidersWithFallback(countryCode)

    // Transform to app-friendly format
    const formattedProviders = providers.map(p => ({
      id: `carrier-${p.ProviderCode.toLowerCase().replace(/_/g, '-')}`,
      code: p.ProviderCode,
      name: p.Name,
      shortName: p.ShortName,
      logo: p.LogoUrl,
      countryCode: p.CountryIso,
      validationRegex: p.ValidationRegex,
      regionCode: p.RegionCode,
    }))

    return NextResponse.json({ providers: formattedProviders })
  } catch (error) {
    console.error('Error fetching providers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    )
  }
}
