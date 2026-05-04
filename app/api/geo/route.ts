import { NextResponse } from 'next/server'
import { inferLocaleFromCountry, normalizeCountryCode, pickLanguageTag } from '@/lib/locale/country-config'
import {
  LOCALE_COOKIE_COUNTRY,
  LOCALE_COOKIE_CURRENCY,
  LOCALE_COOKIE_LANGUAGE,
  LOCALE_COOKIE_MANUAL,
} from '@/lib/locale/locale-cookies'

export async function GET(request: Request) {
  const h = new Headers(request.headers)
  const cookie = h.get('cookie') ?? ''
  const manual = cookie.includes(`${LOCALE_COOKIE_MANUAL}=1`)
  const fromCookie = (name: string) => {
    const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
    return m?.[1] ? decodeURIComponent(m[1]) : null
  }

  const cookieCountry = fromCookie(LOCALE_COOKIE_COUNTRY)
  const cookieLanguage = fromCookie(LOCALE_COOKIE_LANGUAGE)
  const cookieCurrency = fromCookie(LOCALE_COOKIE_CURRENCY)

  const headerCountry =
    normalizeCountryCode(h.get('x-vercel-ip-country')) ||
    normalizeCountryCode(h.get('cf-ipcountry')) ||
    normalizeCountryCode(h.get('x-country-code')) ||
    null

  const base = inferLocaleFromCountry(cookieCountry || headerCountry)
  const languageTag = cookieLanguage || pickLanguageTag(h.get('accept-language'), base.country) || base.language
  const currency = cookieCurrency || base.currency
  const country = normalizeCountryCode(cookieCountry) || base.country

  return NextResponse.json({
    countryCode: country,
    languageCode: languageTag,
    currencyCode: currency,
    manualOverride: manual,
  })
}

