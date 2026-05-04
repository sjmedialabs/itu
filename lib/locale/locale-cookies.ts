export const LOCALE_COOKIE_COUNTRY = 'itu_country'
export const LOCALE_COOKIE_LANGUAGE = 'itu_language'
export const LOCALE_COOKIE_CURRENCY = 'itu_currency'
export const LOCALE_COOKIE_MANUAL = 'itu_locale_manual'

export type LocaleCookieValues = {
  country?: string
  language?: string
  currency?: string
  manual?: boolean
}

export function parseDocumentCookies(cookieString: string): Record<string, string> {
  const out: Record<string, string> = {}
  cookieString.split(';').forEach((part) => {
    const idx = part.indexOf('=')
    if (idx === -1) return
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (!k) return
    out[k] = decodeURIComponent(v)
  })
  return out
}

export function readLocaleCookiesFromDocument(): LocaleCookieValues {
  if (typeof document === 'undefined') return {}
  const map = parseDocumentCookies(document.cookie ?? '')
  const manual = map[LOCALE_COOKIE_MANUAL] === '1'
  return {
    country: map[LOCALE_COOKIE_COUNTRY],
    language: map[LOCALE_COOKIE_LANGUAGE],
    currency: map[LOCALE_COOKIE_CURRENCY],
    manual,
  }
}

export function setLocaleCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return
  const maxAge = Math.floor(days * 24 * 60 * 60)
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
}

export function setLocaleCookiesClient(values: { country?: string; language?: string; currency?: string; manual?: boolean }) {
  if (values.country) setLocaleCookie(LOCALE_COOKIE_COUNTRY, values.country)
  if (values.language) setLocaleCookie(LOCALE_COOKIE_LANGUAGE, values.language)
  if (values.currency) setLocaleCookie(LOCALE_COOKIE_CURRENCY, values.currency)
  if (typeof values.manual === 'boolean') setLocaleCookie(LOCALE_COOKIE_MANUAL, values.manual ? '1' : '0')
}

