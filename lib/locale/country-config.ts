export type LocaleDetectResult = {
  country: string
  language: string
  currency: string
}

/**
 * Minimal mapping used for IP-based defaults.
 * Extend as you add more currencies/languages to your navbar.
 */
export const countryConfig: Record<string, { currency: string; language: string }> = {
  IN: { currency: 'INR', language: 'en-IN' },
  US: { currency: 'USD', language: 'en-US' },
  AE: { currency: 'AED', language: 'en-AE' },
  GB: { currency: 'GBP', language: 'en-GB' },
  EU: { currency: 'EUR', language: 'en-EU' },
} as const

export const FALLBACK_LOCALE: LocaleDetectResult = {
  country: 'IN',
  language: 'en-IN',
  currency: 'INR',
}

export function normalizeCountryCode(code: string | null | undefined): string | null {
  const cc = (code ?? '').trim().toUpperCase()
  return cc && /^[A-Z]{2}$/.test(cc) ? cc : null
}

export function normalizeCurrencyCode(code: string | null | undefined): string | null {
  const cur = (code ?? '').trim().toUpperCase()
  return cur && /^[A-Z]{3}$/.test(cur) ? cur : null
}

export function pickLanguageTag(acceptLanguage: string | null, country: string | null): string | null {
  const raw = (acceptLanguage ?? '').trim()
  const cc = normalizeCountryCode(country)
  if (!raw) return cc ? `en-${cc}` : null

  // Example: "en-US,en;q=0.9,hi;q=0.8"
  const first = raw.split(',')[0]?.trim()
  const base = first?.split(';')[0]?.trim()
  if (!base) return cc ? `en-${cc}` : null

  // if browser already provides region, keep it (e.g. en-IN)
  if (base.includes('-')) return base
  // else add region based on detected country
  return cc ? `${base}-${cc}` : base
}

export function inferLocaleFromCountry(country: string | null): LocaleDetectResult {
  const cc = normalizeCountryCode(country)
  if (cc && countryConfig[cc]) {
    const cfg = countryConfig[cc]!
    return { country: cc, language: cfg.language, currency: cfg.currency }
  }
  return FALLBACK_LOCALE
}

