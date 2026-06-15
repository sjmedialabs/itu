import { supabaseRest } from '@/lib/db/supabase-rest'
import {
  loadCountryRegistry,
  lookupCountryInRegistry,
  logUnknownCountry,
} from '@/lib/aggregator/country-registry'
import { validateCountriesTable } from '@/lib/aggregator/country-startup-validation'

export async function runStep3Countries(
  providerId: string,
  config: any,
  syncRunId?: string | null
): Promise<{ success: boolean; message: string; data?: any }> {
  await validateCountriesTable()
  const registry = await loadCountryRegistry()

  const res = await supabaseRest(`provider_operator_raw?service_provider_id=eq.${providerId}&select=*`, { cache: 'no-store' })
  const rawOps = await res.json().catch(() => []) as any[]

  let matchedCount = 0
  let unknownCount = 0

  for (const rawOp of rawOps) {
    const rawCountry = rawOp.raw_response_json?.country || rawOp.raw_response_json || {}
    const countryInput = {
      countryName: rawCountry.name || undefined,
      iso2: rawOp.iso_code || rawOp.country_code || rawCountry.iso_code || undefined,
      iso3: rawCountry.iso_code3 || undefined,
    }

    const canonical = lookupCountryInRegistry(registry, countryInput)
    if (canonical) {
      matchedCount++
    } else {
      unknownCount++
      logUnknownCountry(config.code, countryInput)
    }
  }

  return {
    success: true,
    message: `Validated country mappings. Checked ${rawOps.length} operators: ${matchedCount} matched canonical registry, ${unknownCount} unknown.`,
    data: {
      checked: rawOps.length,
      matched: matchedCount,
      unknown: unknownCount,
      normalized: matchedCount,
    },
  }
}
