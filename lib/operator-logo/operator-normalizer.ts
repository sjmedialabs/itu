/**
 * Operator Name & Slug Normalization Layer
 * Converts system operator names/slugs into optimized Brandfetch search queries and domain hints.
 * Fully isolated helper service so rules can be safely expanded without changing business logic.
 */

export interface NormalizedOperatorResult {
  searchName: string
  cleanSlug: string
  domainHint?: string
}

// Map of common global telecom operator names/slug keywords to authoritative brand domains
const KNOWN_TELECOM_DOMAINS: Record<string, string> = {
  'att': 'att.com',
  'at&t': 'att.com',
  'jio': 'jio.com',
  'vodafone': 'vodafone.com',
  'orange': 'orange.com',
  'claro': 'claro.com',
  'airtel': 'airtel.in',
  't-mobile': 't-mobile.com',
  'tmobile': 't-mobile.com',
  'mtn': 'mtn.com',
  'movistar': 'movistar.es',
  'telcel': 'telcel.com',
  'etisalat': 'eand.com',
  'e&': 'eand.com',
  'vi': 'myvi.in',
  'vodafone idea': 'myvi.in',
  'stc': 'stc.com.sa',
  'digicel': 'digicelgroup.com',
  'verizon': 'verizon.com',
  'sprint': 'sprint.com',
  'o2': 'o2.co.uk',
  'ee': 'ee.co.uk',
  'three': 'three.co.uk',
  '3': 'three.co.uk',
  'telstra': 'telstra.com.au',
  'optus': 'optus.com.au',
  'singtel': 'singtel.com',
  'globe': 'globe.com.ph',
  'smart': 'smart.com.ph',
  'telekom': 'telekom.de',
  'tim': 'tim.it',
  'oi': 'oi.com.br',
  'vivo': 'vivo.com.br',
  'entel': 'entel.cl',
  'wom': 'wom.cl',
  'kyivstar': 'kyivstar.ua',
  'turkcell': 'turkcell.com.tr',
  'vodacom': 'vodacom.co.za',
  'airtel africa': 'airtel.africa',
  'zain': 'zain.com',
  'ooredoo': 'ooredoo.com',
}

// Regex matching trailing country names or country ISO codes (e.g. "AT T USA", "Jio IND", "Vodafone UK", "Orange France", "Claro Brazil")
const COUNTRY_SUFFIX_REGEX = /\s+(?:usa|us|ind|india|uk|gb|france|fr|brazil|br|mexico|mex|mx|germany|de|spain|es|nigeria|ng|canada|ca|australia|au|italy|it|philippines|ph|turkey|tr|egypt|eg|uae|saudi arabia|sa)$/i

export function normalizeOperator(
  rawName: string,
  rawSlug?: string | null
): NormalizedOperatorResult {
  let name = (rawName ?? '').trim()
  let slug = (rawSlug ?? '').trim().toLowerCase()

  if (!slug && name) {
    slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  }

  // 1. Specific syntax cleanups (e.g. "AT T" -> "AT&T")
  name = name.replace(/\bAT\s+T\b/gi, 'AT&T')
  name = name.replace(/\bAT-T\b/gi, 'AT&T')
  name = name.replace(/\bT\s+Mobile\b/gi, 'T-Mobile')

  // 2. Strip trailing country suffixes from name
  let cleanName = name.replace(COUNTRY_SUFFIX_REGEX, '').trim()
  if (!cleanName) cleanName = name

  // 3. Clean slug suffix (e.g. "at-t-usa" -> "at-t", "jio-ind" -> "jio", "vodafone-uk" -> "vodafone")
  let cleanSlug = slug.replace(/-(?:usa|us|ind|india|uk|gb|france|fr|brazil|br|mexico|mex|mx|germany|de|spain|es|nigeria|ng|canada|ca|australia|au)$/i, '').trim()
  if (!cleanSlug) cleanSlug = slug

  // 4. Look up domain hint in domain dictionary
  const lookupKey = cleanName.toLowerCase().replace(/[^a-z0-9&]+/g, ' ').trim()
  const lookupSlug = cleanSlug.replace(/[^a-z0-9]+/g, '')
  
  const domainHint = KNOWN_TELECOM_DOMAINS[lookupKey] ?? KNOWN_TELECOM_DOMAINS[lookupSlug]

  return {
    searchName: cleanName,
    cleanSlug,
    domainHint,
  }
}
