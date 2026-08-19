import { supabaseRest } from '@/lib/db/supabase-rest'
import {
  rechargeValueFromRawPlan,
  type PlanRechargeValue,
} from '@/lib/catalog/raw-plan-recharge'

function enc(v: string): string {
  return encodeURIComponent(v)
}

const RAW_PLAN_SELECT =
  'id,provider_id,provider_plan_id,amount,currency,destination_amount,destination_currency,raw_json,provider_plan_name,validity,description,data_volume,plan_type'

type PlanMappingRow = {
  system_plan_id: string
  service_provider_id: string
  provider_plan_raw_id?: string | null
  provider_plan_id?: string | null
  matching_score?: number | null
  is_verified?: boolean | null
}

type RawPlanRow = {
  id: string
  provider_id: string
  provider_plan_id: string
  amount?: number | null
  currency?: string | null
  destination_amount?: number | null
  destination_currency?: string | null
  raw_json?: unknown
  provider_plan_name?: string | null
  validity?: string | null
  description?: string | null
  data_volume?: string | null
  plan_type?: string | null
}

type SystemPlanFallback = {
  id: string
  system_plan_name?: string | null
  description?: string | null
  validity?: string | null
  data_volume?: string | null
  amount?: number | null
  currency?: string | null
  plan_type?: string | null
}

export type SystemPlanMappedDetails = {
  recharge: PlanRechargeValue
  validity: string
  description: string
  planName: string
  dataVolume?: string
  planType?: string
  rechargeSource: 'mapping_raw' | 'system_plan'
  isRange?: boolean
  minAmount?: number
  maxAmount?: number
}

export function extractRangeInfo(rawJson: unknown): { isRange: boolean; minAmount?: number; maxAmount?: number } {
  if (!rawJson || typeof rawJson !== 'object') return { isRange: false }
  const r = rawJson as Record<string, unknown>

  // DTOne style: is_range, min_amount, max_amount
  if (r.is_range === true || r.is_range === 'true') {
    const min = Number(r.min_amount) || 0
    const max = Number(r.max_amount) || 0
    return { isRange: true, minAmount: min || undefined, maxAmount: max || undefined }
  }

  // Ding style: Minimum.SendValue / Maximum.SendValue (or ReceiveValue)
  const minSend = (r.Minimum as any)?.SendValue ?? (r.Minimum as any)?.ReceiveValue
  const maxSend = (r.Maximum as any)?.SendValue ?? (r.Maximum as any)?.ReceiveValue
  if (typeof minSend === 'number' && typeof maxSend === 'number' && minSend !== maxSend) {
    return { isRange: true, minAmount: minSend, maxAmount: maxSend }
  }

  // ValueTopup style: min.faceValue / max.faceValue
  const minFace = (r.min as any)?.faceValue
  const maxFace = (r.max as any)?.faceValue
  if (typeof minFace === 'number' && typeof maxFace === 'number' && minFace !== maxFace) {
    return { isRange: true, minAmount: minFace, maxAmount: maxFace }
  }

  return { isRange: false }
}

/** Verified mappings first, then highest matching_score (same intent as admin provider popup). */
export function rankPlanMappings<T extends {
  is_verified?: boolean | null
  matching_score?: number | null
}>(mappings: T[]): T[] {
  return [...mappings].sort((a, b) => {
    const verifiedA = a.is_verified === true ? 1 : 0
    const verifiedB = b.is_verified === true ? 1 : 0
    if (verifiedB !== verifiedA) return verifiedB - verifiedA
    return Number(b.matching_score ?? 0) - Number(a.matching_score ?? 0)
  })
}

export function catalogFieldsFromRawPlan(
  raw: RawPlanRow | null | undefined,
): {
  validity?: string
  description?: string
  planName?: string
  dataVolume?: string
  planType?: string
} {
  if (!raw) return {}
  return {
    validity: raw.validity?.trim() || undefined,
    description: raw.description?.trim() || undefined,
    planName: raw.provider_plan_name?.trim() || undefined,
    dataVolume: raw.data_volume?.trim() || undefined,
    planType: raw.plan_type?.trim() || undefined,
  }
}

export function mergeMappedDetailsWithSystemPlan(
  raw: RawPlanRow | null,
  systemPlan: SystemPlanFallback | null | undefined,
): SystemPlanMappedDetails | null {
  const fromRaw = raw ? rechargeValueFromRawPlan(raw) : { amount: null, currency: null }
  let recharge: PlanRechargeValue | null = null
  let rechargeSource: SystemPlanMappedDetails['rechargeSource'] = 'mapping_raw'

  if (fromRaw.amount != null && fromRaw.amount > 0 && fromRaw.currency) {
    recharge = { amount: fromRaw.amount, currency: fromRaw.currency.toUpperCase() }
  } else if (
    systemPlan?.amount != null &&
    systemPlan.amount > 0 &&
    systemPlan.currency?.trim()
  ) {
    recharge = {
      amount: systemPlan.amount,
      currency: systemPlan.currency.trim().toUpperCase(),
    }
    rechargeSource = 'system_plan'
  }

  if (!recharge) return null

  const rawFields = catalogFieldsFromRawPlan(raw)
  const systemName = systemPlan?.system_plan_name?.trim() || ''
  const systemDescription = systemPlan?.description?.trim() || ''
  const systemValidity = systemPlan?.validity?.trim() || ''
  const rangeInfo = extractRangeInfo(raw?.raw_json)

  return {
    recharge,
    rechargeSource,
    validity: rawFields.validity || systemValidity,
    description: rawFields.description || systemDescription || systemName,
    planName: systemName || rawFields.planName || 'Plan',
    dataVolume: rawFields.dataVolume || systemPlan?.data_volume?.trim() || undefined,
    planType: rawFields.planType || systemPlan?.plan_type?.trim() || undefined,
    isRange: rangeInfo.isRange,
    minAmount: rangeInfo.minAmount,
    maxAmount: rangeInfo.maxAmount,
  }
}

async function fetchRawPlansByIds(ids: string[]): Promise<Map<string, RawPlanRow>> {
  const map = new Map<string, RawPlanRow>()
  if (!ids.length) return map

  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const res = await supabaseRest(
      `provider_plans_raw?id=in.(${chunk.map(enc).join(',')})&select=${RAW_PLAN_SELECT}`,
      { cache: 'no-store' },
    )
    if (!res.ok) continue
    const rows = (await res.json()) as RawPlanRow[]
    for (const row of rows) {
      if (row.id) map.set(row.id, row)
    }
  }
  return map
}

async function fetchLatestRawPlan(
  providerId: string,
  providerPlanId: string,
): Promise<RawPlanRow | null> {
  const res = await supabaseRest(
    `provider_plans_raw?provider_id=eq.${enc(providerId)}&provider_plan_id=eq.${enc(providerPlanId)}&select=${RAW_PLAN_SELECT}&order=fetched_at.desc&limit=1`,
    { cache: 'no-store' },
  )
  if (!res.ok) return null
  const rows = (await res.json()) as RawPlanRow[]
  return rows[0] ?? null
}

async function fetchSystemPlanFallbacks(ids: string[]): Promise<Map<string, SystemPlanFallback>> {
  const map = new Map<string, SystemPlanFallback>()
  if (!ids.length) return map

  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50)
    const res = await supabaseRest(
      `system_plans?id=in.(${chunk.map(enc).join(',')})&select=id,system_plan_name,description,validity,data_volume,amount,currency,plan_type`,
      { cache: 'no-store' },
    )
    if (!res.ok) continue
    const rows = (await res.json()) as SystemPlanFallback[]
    for (const row of rows) {
      if (row.id) map.set(row.id, row)
    }
  }
  return map
}

async function resolveRawForMapping(
  mapping: PlanMappingRow,
  rawById: Map<string, RawPlanRow>,
  stableFetchCache: Map<string, RawPlanRow | null>,
): Promise<RawPlanRow | null> {
  if (mapping.provider_plan_raw_id) {
    const cached = rawById.get(mapping.provider_plan_raw_id)
    if (cached) return cached
  }

  const providerPlanId = mapping.provider_plan_id?.trim()
  const providerId = mapping.service_provider_id
  if (!providerPlanId || !providerId) return null

  const key = `${providerId}:${providerPlanId}`
  if (!stableFetchCache.has(key)) {
    stableFetchCache.set(key, await fetchLatestRawPlan(providerId, providerPlanId))
  }
  return stableFetchCache.get(key) ?? null
}

/**
 * Canonical catalog resolution:
 * system_plans (identity) + plan_mappings (best row) + provider_plans_raw (values/details).
 */
export async function batchLoadSystemPlanMappedDetails(
  systemPlanIds: string[],
): Promise<Map<string, SystemPlanMappedDetails>> {
  const result = new Map<string, SystemPlanMappedDetails>()
  const uniqueIds = [...new Set(systemPlanIds.filter(Boolean))]
  if (!uniqueIds.length) return result

  const mappings: PlanMappingRow[] = []
  for (let i = 0; i < uniqueIds.length; i += 50) {
    const chunk = uniqueIds.slice(i, i + 50)
    const res = await supabaseRest(
      `plan_mappings?system_plan_id=in.(${chunk.map(enc).join(',')})&select=system_plan_id,service_provider_id,provider_plan_raw_id,provider_plan_id,matching_score,is_verified`,
      { cache: 'no-store' },
    )
    if (!res.ok) continue
    mappings.push(...((await res.json()) as PlanMappingRow[]))
  }

  const [rawById, systemPlans] = await Promise.all([
    fetchRawPlansByIds([
      ...new Set(mappings.map((m) => m.provider_plan_raw_id).filter((id): id is string => Boolean(id))),
    ]),
    fetchSystemPlanFallbacks(uniqueIds),
  ])

  const mappingsByPlan = new Map<string, PlanMappingRow[]>()
  for (const mapping of mappings) {
    if (!mapping.system_plan_id) continue
    const list = mappingsByPlan.get(mapping.system_plan_id) ?? []
    list.push(mapping)
    mappingsByPlan.set(mapping.system_plan_id, list)
  }

  const stableFetchCache = new Map<string, RawPlanRow | null>()

  for (const systemPlanId of uniqueIds) {
    const ranked = rankPlanMappings(mappingsByPlan.get(systemPlanId) ?? [])
    const systemPlan = systemPlans.get(systemPlanId) ?? null

    for (const mapping of ranked) {
      const raw = await resolveRawForMapping(mapping, rawById, stableFetchCache)
      const merged = mergeMappedDetailsWithSystemPlan(raw, systemPlan)
      if (merged) {
        result.set(systemPlanId, merged)
        break
      }
    }

    if (!result.has(systemPlanId) && systemPlan) {
      const merged = mergeMappedDetailsWithSystemPlan(null, systemPlan)
      if (merged) result.set(systemPlanId, merged)
    }
  }

  return result
}
