/**
 * Short-TTL Redis caches for LCR routing hot paths (replica-safe).
 * Does not change routing decisions — only caches config/catalog reads.
 */
import type { LcrEngineSettings, ProviderPriorityRow, RoutingRuleRow } from '@/lib/routing/types'
import type { AuthoritativeCandidateBundle } from '@/lib/recharge-orchestration/authoritative-candidate-loader'
import type { AuthoritativeProviderPricingRow } from '@/lib/catalog/resolve-provider-pricing-for-system-plan'
import { getLcrEngineSettings, listRoutingRules, listProviderPriorities } from '@/lib/routing/repository'
import { loadAuthoritativeCandidateBundle } from '@/lib/recharge-orchestration/authoritative-candidate-loader'
import { cacheDelByPrefix, cacheGetJson, cacheSetJson } from '@/lib/cache/redis'

const DEFAULT_TTL_SEC = 30
const PREFIX = 'lcr:routing:v1:'

type Box<T> = { v: T }

async function getBox<T>(key: string): Promise<T | undefined> {
  const hit = await cacheGetJson<Box<T>>(key)
  if (!hit || !('v' in hit)) return undefined
  return hit.v
}

async function setBox<T>(key: string, value: T): Promise<void> {
  await cacheSetJson(key, { v: value } satisfies Box<T>, DEFAULT_TTL_SEC)
}

export async function clearLcrRoutingCaches(): Promise<void> {
  await cacheDelByPrefix(PREFIX)
}

export async function getCachedLcrEngineSettings(): Promise<LcrEngineSettings | null> {
  const key = `${PREFIX}settings`
  const hit = await getBox<LcrEngineSettings | null>(key)
  if (hit !== undefined) return hit
  const value = await getLcrEngineSettings()
  await setBox(key, value)
  return value
}

export async function getCachedRoutingRules(): Promise<RoutingRuleRow[]> {
  const key = `${PREFIX}rules`
  const hit = await getBox<RoutingRuleRow[]>(key)
  if (hit !== undefined) return hit
  const value = await listRoutingRules()
  await setBox(key, value)
  return value
}

export async function getCachedProviderPriorities(): Promise<ProviderPriorityRow[]> {
  const key = `${PREFIX}priorities`
  const hit = await getBox<ProviderPriorityRow[]>(key)
  if (hit !== undefined) return hit
  const value = await listProviderPriorities()
  await setBox(key, value)
  return value
}

function hydrateMap<K, V>(raw: unknown): Map<K, V> {
  if (!raw) return new Map<K, V>()
  if (raw instanceof Map) return raw
  if (Array.isArray(raw)) {
    const valid = (raw as [K, V][]).filter(
      (entry) => Array.isArray(entry) && entry.length === 2 && entry[0] != null,
    )
    return new Map<K, V>(valid)
  }
  if (typeof raw === 'object' && raw !== null) {
    const entries = Object.entries(raw).filter(
      ([k]) => k !== '__proto__' && k !== 'constructor' && k !== 'prototype',
    )
    return new Map<K, V>(entries as unknown as [K, V][])
  }
  return new Map<K, V>()
}

function serializeAuthoritativeCandidateBundle(bundle: AuthoritativeCandidateBundle): unknown {
  return {
    ...bundle,
    providers: Array.from(hydrateMap(bundle.providers).entries()),
    authoritativeByKey: Array.from(hydrateMap(bundle.authoritativeByKey).entries()),
  }
}

export function hydrateAuthoritativeCandidateBundle(
  raw: unknown,
): AuthoritativeCandidateBundle | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  return {
    ...b,
    source: (b.source as 'plan_mappings' | 'legacy_internal_cache') || 'plan_mappings',
    internalPlanId: String(b.internalPlanId || ''),
    systemPlanId: (b.systemPlanId as string | null) ?? null,
    mappings: Array.isArray(b.mappings) ? (b.mappings as any[]) : [],
    providers: hydrateMap<string, Record<string, unknown>>(b.providers),
    providersToEvaluate: Array.isArray(b.providersToEvaluate) ? (b.providersToEvaluate as any[]) : [],
    authoritativeByKey: hydrateMap<string, AuthoritativeProviderPricingRow>(b.authoritativeByKey),
    authoritativeProviders: Array.isArray(b.authoritativeProviders) ? (b.authoritativeProviders as any[]) : [],
    parity: (b.parity as any) ?? null,
  }
}

function sanitizeCachePart(val: string | null | undefined): string {
  if (!val) return ''
  return encodeURIComponent(String(val).trim().slice(0, 100))
}

export async function getCachedAuthoritativeBundle(
  internalPlanId: string,
  systemPlanId?: string | null,
): Promise<AuthoritativeCandidateBundle | null> {
  const safeInternalId = sanitizeCachePart(internalPlanId)
  const safeSystemId = sanitizeCachePart(systemPlanId)
  const key = `${PREFIX}bundle:${safeInternalId}:${safeSystemId}`
  const hit = await getBox<unknown>(key)
  if (hit !== undefined) {
    return hit ? hydrateAuthoritativeCandidateBundle(hit) : null
  }
  const value = await loadAuthoritativeCandidateBundle(internalPlanId, {
    systemPlanId: systemPlanId ?? undefined,
  })
  if (value) {
    await setBox(key, serializeAuthoritativeCandidateBundle(value))
  } else {
    await setBox(key, null)
  }
  return value
}

export async function getCachedActiveRoutingRules(): Promise<RoutingRuleRow[]> {
  const rules = await getCachedRoutingRules()
  const now = Date.now()
  return rules.filter((r) => {
    if (r.status !== 'ACTIVE') return false
    if (r.effectiveFrom && new Date(r.effectiveFrom).getTime() > now) return false
    if (r.effectiveTo && new Date(r.effectiveTo).getTime() < now) return false
    return true
  })
}

export async function getCachedCountryIso3(countryId: string): Promise<string | undefined> {
  const key = `${PREFIX}iso3:${sanitizeCachePart(countryId).toUpperCase()}`
  return getBox<string>(key)
}

export async function setCachedCountryIso3(countryId: string, iso3: string): Promise<void> {
  const key = `${PREFIX}iso3:${sanitizeCachePart(countryId).toUpperCase()}`
  await setBox(key, iso3)
}

export async function getCachedOperator(
  countryIso3: string,
  operatorKey: string,
): Promise<{ id: string; name: string } | undefined> {
  const key = `${PREFIX}op:${sanitizeCachePart(countryIso3).toUpperCase()}:${sanitizeCachePart(operatorKey).toLowerCase()}`
  return getBox<{ id: string; name: string }>(key)
}

export async function setCachedOperator(
  countryIso3: string,
  operatorKey: string,
  value: { id: string; name: string },
): Promise<void> {
  const key = `${PREFIX}op:${sanitizeCachePart(countryIso3).toUpperCase()}:${sanitizeCachePart(operatorKey).toLowerCase()}`
  await setBox(key, value)
}
