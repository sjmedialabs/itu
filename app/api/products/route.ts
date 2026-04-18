import { NextResponse } from 'next/server'
import { getProductsWithFallback } from '@/lib/api/ding-connect'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const countryCode = searchParams.get('countryCode')
    const providerCode = searchParams.get('providerCode')

    if (!countryCode) {
      return NextResponse.json(
        { error: 'Country code is required' },
        { status: 400 }
      )
    }

    const products = await getProductsWithFallback(
      countryCode,
      providerCode || undefined
    )

    // Transform to app-friendly format
    const formattedProducts = products.map(p => ({
      id: `prod-${p.SkuCode.toLowerCase().replace(/_/g, '-')}`,
      skuCode: p.SkuCode,
      carrierCode: p.ProviderCode,
      name: p.LocalizationKey,
      displayText: p.DefaultDisplayText,
      type: categorizeProduct(p.Benefits),
      minSendAmount: p.Minimum.SendValue,
      maxSendAmount: p.Maximum.SendValue,
      sendCurrency: p.Minimum.SendCurrencyIso,
      minReceiveAmount: p.Minimum.ReceiveValue,
      maxReceiveAmount: p.Maximum.ReceiveValue,
      receiveCurrency: p.Minimum.ReceiveCurrencyIso,
      commissionRate: p.CommissionRate,
      processingMode: p.ProcessingMode,
      benefits: p.Benefits.map(b => ({
        type: b.Type,
        value: b.Value,
        unit: b.Unit,
        info: b.AdditionalInformation,
      })),
      validity: p.ValidityPeriodIso,
    }))

    return NextResponse.json({ products: formattedProducts })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// Categorize product based on benefits
function categorizeProduct(benefits: Array<{ Type: string }>): string {
  const types = benefits.map(b => b.Type.toLowerCase())
  
  if (types.includes('data') && types.includes('voice')) return 'combo'
  if (types.includes('data')) return 'data'
  if (types.includes('voice') || types.includes('airtime')) return 'voice'
  return 'combo'
}
