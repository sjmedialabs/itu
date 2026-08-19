import {
  clearLcrRoutingCaches,
  getCachedActiveRoutingRules,
  getCachedLcrEngineSettings,
  getCachedProviderPriorities,
  getCachedRoutingRules,
  setCachedCountryIso3,
  getCachedCountryIso3,
} from '@/lib/routing/lcr-routing-cache'

const mem = new Map<string, unknown>()

jest.mock('@/lib/cache/redis', () => ({
  cacheGetJson: jest.fn(async (key: string) => mem.get(key) ?? null),
  cacheSetJson: jest.fn(async (key: string, value: unknown) => {
    mem.set(key, value)
  }),
  cacheDelByPrefix: jest.fn(async (prefix: string) => {
    for (const k of [...mem.keys()]) {
      if (k.startsWith(prefix)) mem.delete(k)
    }
    return 0
  }),
}))

jest.mock('@/lib/routing/repository', () => ({
  getLcrEngineSettings: jest.fn().mockResolvedValue({
    id: 's1',
    enabled: true,
    routingStrategy: 'LEAST_COST',
    fallbackStrategy: 'NEXT_PROVIDER',
    autoFailover: true,
    retryEnabled: true,
    retryAttempts: 2,
  }),
  listRoutingRules: jest.fn().mockResolvedValue([
    {
      id: 'r1',
      ruleName: 'Test',
      status: 'ACTIVE',
      priority: 1,
      providerId: 'p1',
      countryId: null,
      operatorId: null,
      productType: null,
    },
  ]),
  listProviderPriorities: jest.fn().mockResolvedValue([{ providerId: 'p1', priority: 1, code: 'DING', name: 'Ding' }]),
}))

jest.mock('@/lib/recharge-orchestration/authoritative-candidate-loader', () => ({
  loadAuthoritativeCandidateBundle: jest.fn().mockImplementation(async (planId: string) => {
    const authoritativeByKey = new Map([
      ['p1:plan1', { providerId: 'p1', provider_wholesale_amount: 10, provider_wholesale_currency: 'USD' }],
    ])
    const providers = new Map([
      ['p1', { id: 'p1', name: 'Provider One' }],
    ])
    return {
      source: 'plan_mappings',
      internalPlanId: planId,
      systemPlanId: 'sys-1',
      mappings: [{ provider_id: 'p1', provider_plan_id: 'plan1' }],
      providers,
      providersToEvaluate: [{ id: 'p1', name: 'Provider One' }],
      authoritativeByKey,
      authoritativeProviders: [],
      parity: null,
    }
  }),
}))

import { getLcrEngineSettings, listRoutingRules, listProviderPriorities } from '@/lib/routing/repository'
import { getCachedAuthoritativeBundle } from '@/lib/routing/lcr-routing-cache'

describe('lcr-routing-cache', () => {
  beforeEach(async () => {
    mem.clear()
    await clearLcrRoutingCaches()
    jest.clearAllMocks()
  })

  it('deduplicates settings reads within TTL', async () => {
    await getCachedLcrEngineSettings()
    await getCachedLcrEngineSettings()
    expect(getLcrEngineSettings).toHaveBeenCalledTimes(1)
  })

  it('deduplicates routing rules reads within TTL', async () => {
    await getCachedRoutingRules()
    await getCachedActiveRoutingRules()
    expect(listRoutingRules).toHaveBeenCalledTimes(1)
  })

  it('deduplicates provider priority reads within TTL', async () => {
    await getCachedProviderPriorities()
    await getCachedProviderPriorities()
    expect(listProviderPriorities).toHaveBeenCalledTimes(1)
  })

  it('caches country ISO3 lookups in Redis', async () => {
    await setCachedCountryIso3('IN', 'IND')
    expect(await getCachedCountryIso3('IN')).toBe('IND')
    expect(await getCachedCountryIso3('in')).toBe('IND')
  })

  it('clears all caches', async () => {
    await getCachedLcrEngineSettings()
    await clearLcrRoutingCaches()
    await getCachedLcrEngineSettings()
    expect(getLcrEngineSettings).toHaveBeenCalledTimes(2)
  })

  it('serializes and hydrates authoritativeByKey and providers as Map instances when loaded from Redis cache', async () => {
    // 1st call populates Redis cache
    const bundle1 = await getCachedAuthoritativeBundle('plan-101')
    expect(bundle1).not.toBeNull()
    expect(typeof bundle1?.authoritativeByKey.get).toBe('function')
    expect(bundle1?.authoritativeByKey.get('p1:plan1')).toBeDefined()

    // 2nd call hits Redis cache and must re-hydrate Maps so .get() exists
    const bundle2 = await getCachedAuthoritativeBundle('plan-101')
    expect(bundle2).not.toBeNull()
    expect(typeof bundle2?.authoritativeByKey.get).toBe('function')
    expect(bundle2?.authoritativeByKey.get('p1:plan1')?.providerId).toBe('p1')
    expect(typeof bundle2?.providers.get).toBe('function')
    expect(bundle2?.providers.get('p1')?.name).toBe('Provider One')
  })
})
