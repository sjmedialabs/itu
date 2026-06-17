import * as countries from 'i18n-iso-countries'
import { COUNTRY_NAMES, ISO2_TO_ISO3 } from '@/lib/lcr/countries'

export type ResolvePlanCountryInput = {
  planName?: string | null
  planDescription?: string | null
  rawPlan?: unknown
  operatorCountryIso3?: string | null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Normalize any ISO2/ISO3/country token to canonical ISO3 or UNK. */
export function toCanonicalPlanCountryCode(code: string | null | undefined): string {
  const t = String(code ?? '').trim().toUpperCase()
  if (!t) return 'UNK'
  if (t === 'UNK') return 'UNK'
  if (t.length === 3 && countries.isValid(t)) return t
  if (t.length === 2) {
    const fromLib = countries.alpha2ToAlpha3(t)
    if (fromLib) return fromLib.toUpperCase()
    const fromMap = ISO2_TO_ISO3[t]
    if (fromMap) return fromMap
  }
  return 'UNK'
}

function extractCountryFromRawJson(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const countryObj = row.country
  const operatorObj = row.operator

  const candidates: unknown[] = [
    row.countryIso3,
    row.CountryIso3,
    row.country_iso3,
    row.countryCode,
    row.country_code,
  ]

  if (countryObj && typeof countryObj === 'object') {
    const c = countryObj as Record<string, unknown>
    candidates.push(c.iso_code3, c.iso_code, c.iso3, c.iso2, c.code)
  }

  if (operatorObj && typeof operatorObj === 'object') {
    const op = operatorObj as Record<string, unknown>
    const opCountry = op.country
    if (opCountry && typeof opCountry === 'object') {
      const c = opCountry as Record<string, unknown>
      candidates.push(c.iso_code3, c.iso_code, c.iso3, c.iso2, c.code)
    }
  }

  for (const candidate of candidates) {
    if (candidate == null || candidate === '') continue
    const iso3 = toCanonicalPlanCountryCode(String(candidate))
    if (iso3 !== 'UNK') return iso3
  }

  return null
}

const DATA_VOLUME_UNITS = new Set(['GB', 'MB', 'KB', 'TB', 'GIB', 'MIB'])

function extractCountryNamesFromText(combined: string): string | null {
  const nameMatches: Array<{ iso3: string; name: string }> = []
  for (const [iso3, name] of Object.entries(COUNTRY_NAMES)) {
    if (name.length >= 3) nameMatches.push({ iso3, name })
  }
  for (const [iso2, name] of Object.entries(countries.getNames('en'))) {
    const iso3 = countries.alpha2ToAlpha3(iso2)
    if (iso3 && name.length >= 3) {
      nameMatches.push({ iso3: iso3.toUpperCase(), name })
    }
  }

  nameMatches.sort((a, b) => b.name.length - a.name.length)
  for (const { iso3, name } of nameMatches) {
    const pattern = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i')
    if (pattern.test(combined)) return iso3
  }

  return null
}

function extractIsoTokensFromText(combined: string): string | null {
  const tokens = combined.split(/[\s_\-|/,]+/).filter(Boolean)

  for (let i = 0; i < tokens.length; i++) {
    const upper = tokens[i].toUpperCase()
    const prevToken = i > 0 ? tokens[i - 1] : null

    if (DATA_VOLUME_UNITS.has(upper) && prevToken && /^\d+(\.\d+)?$/.test(prevToken)) {
      continue
    }

    if (upper.length === 3) {
      const iso3 = toCanonicalPlanCountryCode(upper)
      if (iso3 !== 'UNK') return iso3
    }

    if (upper.length === 2) {
      const isLeadingCountryPrefix = i === 0 || (i === 1 && tokens.length >= 2)
      if (!isLeadingCountryPrefix) continue
      const iso3 = toCanonicalPlanCountryCode(upper)
      if (iso3 !== 'UNK') return iso3
    }
  }

  return null
}

function extractCountryFromPlanText(...parts: Array<string | null | undefined>): string | null {
  const combined = parts.filter((p) => p && String(p).trim()).join(' ')
  if (!combined.trim()) return null

  const fromNames = extractCountryNamesFromText(combined)
  if (fromNames) return fromNames

  return extractIsoTokensFromText(combined)
}

/**
 * Single source of truth for plan country ownership.
 * Priority: plan fields → operator country → UNK
 */
export function resolvePlanCountryCode(input: ResolvePlanCountryInput): string {
  const fromRaw = extractCountryFromRawJson(input.rawPlan)
  if (fromRaw) return fromRaw

  const fromText = extractCountryFromPlanText(input.planName, input.planDescription)
  if (fromText) return fromText

  const fromOperator = toCanonicalPlanCountryCode(input.operatorCountryIso3)
  if (fromOperator !== 'UNK') return fromOperator

  return 'UNK'
}

/** True when plan and operator countries are compatible for assignment/merge. */
export function planCountryMatchesOperator(
  planCountry: string | null | undefined,
  operatorCountry: string | null | undefined,
): boolean {
  const planIso3 = toCanonicalPlanCountryCode(planCountry)
  const operatorIso3 = toCanonicalPlanCountryCode(operatorCountry)

  if (planIso3 === 'UNK' || operatorIso3 === 'UNK') return true
  return planIso3 === operatorIso3
}

export function logCrossCountrySkip(
  step: string,
  context: {
    planId?: string
    planName?: string
    planCountry: string
    operatorName?: string
    operatorCountry: string
    action: string
  },
): void {
  console.warn(
    `[${step}] Skipped cross-country ${context.action}: ` +
      `plan=${context.planId ?? context.planName ?? 'unknown'} ` +
      `plan_country=${context.planCountry} ` +
      `operator=${context.operatorName ?? 'unknown'} ` +
      `operator_country=${context.operatorCountry}`,
  )
}
