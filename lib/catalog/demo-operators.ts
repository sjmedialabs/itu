import type { OperatorRow } from '@/lib/db/catalog'

export function getDemoOperatorRows(countryIso: string): OperatorRow[] {
  const c = countryIso.toUpperCase()

  if (c === 'IN') {
    return [
      {
        country_iso: 'IN',
        code: 'IN_AIRTEL',
        name: 'Bharti Airtel',
        short_name: 'Airtel',
        logo_url: null,
        validation_regex: null,
        region_code: null,
        is_default: true,
      },
      {
        country_iso: 'IN',
        code: 'IN_JIO',
        name: 'Reliance Jio',
        short_name: 'Jio',
        logo_url: null,
        validation_regex: '^[6-9][0-9]{9}$',
        region_code: null,
        is_default: false,
      },
    ]
  }

  if (c === 'NG') {
    return [
      {
        country_iso: 'NG',
        code: 'NG_MTN',
        name: 'MTN Nigeria',
        short_name: 'MTN',
        logo_url: null,
        validation_regex: null,
        region_code: null,
        is_default: true,
      },
    ]
  }

  return [
    {
      country_iso: c,
      code: `DEMO_${c}`,
      name: `Demo Operator (${c})`,
      short_name: `Demo (${c})`,
      logo_url: null,
      validation_regex: null,
      region_code: null,
      is_default: true,
    },
  ]
}

