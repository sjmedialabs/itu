/** Currencies shown in the public navbar (extend as needed). */
export const NAV_CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'KES', name: 'Kenyan Shilling' },
] as const

export type NavCurrencyCode = (typeof NAV_CURRENCIES)[number]['code']

const ALPHA2_TO_ALPHA3: Record<string, string> = {
  IN: 'IND',
  US: 'USA',
  GB: 'GBR',
  NG: 'NGA',
  PH: 'PHL',
  MX: 'MEX',
  BD: 'BGD',
  PK: 'PAK',
  GH: 'GHA',
  KE: 'KEN',
}

/** Navbar badge: prefer ISO 3166-1 alpha-3 where known, else alpha-2. */
export function navRegionShortLabel(alpha2: string): string {
  return ALPHA2_TO_ALPHA3[alpha2] ?? alpha2
}

export function isNavCurrency(code: string): code is NavCurrencyCode {
  return NAV_CURRENCIES.some((c) => c.code === code)
}
