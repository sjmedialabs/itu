/**
 * Least Cost Routing (LCR) Engine
 *
 * This module supports:
 * - Multi-aggregator coverage mapping (country/operator support)
 * - LCR + weighted LCR
 * - Timeout and fallback handling
 * - Temporary provider blacklisting after repeated failures
 * - Scheduled refresh metadata for pricing/operator/health datasets
 */

import type { 
  DingProduct,
  RechargeOrder 
} from '@/lib/types'
import { mockCarriers } from '@/lib/mock-data'

// Provider Configuration
export interface Provider {
  id: string
  name: string
  code: string
  apiBaseUrl: string
  isActive: boolean
  priority: number // Lower = higher priority
  supportedCountries: string[]
  credentials: {
    apiKey?: string
    clientId?: string
    clientSecret?: string
  }
  timeout: number // API timeout in ms
  maxRetries: number
  status: 'online' | 'offline' | 'degraded'
  lastHealthCheck?: string
  successRate?: number
  avgLatencyMs?: number
  feeFixedUsd?: number
  feePercent?: number
  supportedOperators?: Record<string, string[]>
  blacklistedUntil?: string
  failureStreak?: number
}

// Provider Pricing
export interface ProviderPricing {
  providerId: string
  countryCode: string
  operatorCode: string
  skuCode: string
  costPrice: number // normalized in USD after conversion/fees
  currency: string
  margin: number
  lastUpdated: string
  rawCostPrice?: number
  fxRateUsed?: number
  feeAmountUsd?: number
  sourceLatencyMs?: number
}

// Routing Rule
export interface RoutingRule {
  id: string
  countryCode: string // Country ISO code, or "*" for global fallback
  operatorCode?: string // If null, applies to all operators in country
  routingType: 'LCR' | 'PRIORITY' | 'FIXED'
  defaultProviderId?: string // For FIXED routing
  providerPriorities?: { providerId: string; priority: number }[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// LCR Result
export interface LCRResult {
  providerId: string
  providerCode: string
  providerName: string
  costPrice: number
  margin: number
  estimatedProcessingTime: string
  fallbackProviders: string[]
}

export interface ProviderEvaluation {
  providerId: string
  providerCode: string
  providerName: string
  eligible: boolean
  reason?: string
  timeoutMs?: number
  latencyMs?: number
  normalizedCostUsd?: number
  weightedScore?: number
  successRate?: number
}

export interface LCRDecision {
  selected: LCRResult | null
  evaluated: ProviderEvaluation[]
  fallbackOrder: string[]
  ruleApplied: RoutingRule['routingType'] | 'NONE'
}

export type RefreshRunStatus = 'success' | 'failed' | 'partial'
export interface RefreshProviderResult {
  providerId: string
  providerName: string
  success: boolean
  message: string
}
export interface RefreshRun {
  startedAt: string
  endedAt: string
  status: RefreshRunStatus
  attempts: number
  maxAttempts: number
  source: 'manual' | 'scheduled'
  details: RefreshProviderResult[]
}

export interface CoverageRow {
  countryCode: string
  operatorCode: string
  providerCodes: string[]
}

const DEFAULT_TIMEOUT_MS = 4000
const BLACKLIST_MS = 10 * 60 * 1000

// Mock Providers Database
export const mockProviders: Provider[] = [
  {
    id: 'prov-1',
    name: 'DingConnect',
    code: 'DING',
    apiBaseUrl: 'https://api.dingconnect.com',
    isActive: true,
    priority: 1,
    supportedCountries: ['US', 'IN', 'NG', 'PH', 'MX', 'GB', 'DE', 'FR', 'ES', 'BD'],
    credentials: {},
    timeout: 5000,
    maxRetries: 3,
    status: 'online',
    successRate: 98.5,
    avgLatencyMs: 580,
    feeFixedUsd: 0.05,
    feePercent: 0.005,
    supportedOperators: {
      IN: ['JIO', 'AIRTEL'],
      NG: ['MTN'],
      US: ['ATT'],
    },
    lastHealthCheck: new Date().toISOString(),
  },
  {
    id: 'prov-2',
    name: 'Reloadly',
    code: 'RELOAD',
    apiBaseUrl: 'https://topups.reloadly.com',
    isActive: true,
    priority: 2,
    supportedCountries: ['US', 'IN', 'NG', 'PH', 'MX', 'GB', 'BD', 'PK', 'EG'],
    credentials: {},
    timeout: 5000,
    maxRetries: 3,
    status: 'online',
    successRate: 97.2,
    avgLatencyMs: 760,
    feeFixedUsd: 0.03,
    feePercent: 0.0075,
    supportedOperators: {
      IN: ['JIO', 'AIRTEL'],
      NG: ['MTN'],
      US: ['ATT'],
    },
    lastHealthCheck: new Date().toISOString(),
  },
  {
    id: 'prov-3',
    name: 'TransferTo',
    code: 'TFT',
    apiBaseUrl: 'https://api.transferto.com',
    isActive: true,
    priority: 3,
    supportedCountries: ['IN', 'NG', 'BD', 'PK', 'EG', 'KE', 'GH'],
    credentials: {},
    timeout: 5000,
    maxRetries: 3,
    status: 'online',
    successRate: 96.8,
    avgLatencyMs: 920,
    feeFixedUsd: 0.02,
    feePercent: 0.006,
    supportedOperators: {
      IN: ['JIO'],
      NG: ['MTN'],
    },
    lastHealthCheck: new Date().toISOString(),
  },
  {
    id: 'prov-4',
    name: 'Prepay Nation',
    code: 'PPN',
    apiBaseUrl: 'https://api.prepaynation.com',
    isActive: false,
    priority: 4,
    supportedCountries: ['US', 'MX', 'GT', 'SV', 'HN'],
    credentials: {},
    timeout: 5000,
    maxRetries: 2,
    status: 'offline',
    successRate: 94.1,
    avgLatencyMs: 1300,
    feeFixedUsd: 0.08,
    feePercent: 0.01,
    supportedOperators: {
      US: ['ATT'],
      MX: ['TELCEL'],
    },
    lastHealthCheck: new Date().toISOString(),
  },
]

// Mock Provider Pricing
export const mockProviderPricing: ProviderPricing[] = [
  // DingConnect Pricing
  { providerId: 'prov-1', countryCode: 'IN', operatorCode: 'JIO', skuCode: 'JIO_199', costPrice: 2.35, currency: 'USD', margin: 0.05, lastUpdated: new Date().toISOString() },
  { providerId: 'prov-1', countryCode: 'IN', operatorCode: 'JIO', skuCode: 'JIO_599', costPrice: 7.10, currency: 'USD', margin: 0.05, lastUpdated: new Date().toISOString() },
  { providerId: 'prov-1', countryCode: 'IN', operatorCode: 'AIRTEL', skuCode: 'AIRTEL_149', costPrice: 1.75, currency: 'USD', margin: 0.05, lastUpdated: new Date().toISOString() },
  { providerId: 'prov-1', countryCode: 'NG', operatorCode: 'MTN', skuCode: 'MTN_500', costPrice: 1.15, currency: 'USD', margin: 0.04, lastUpdated: new Date().toISOString() },
  { providerId: 'prov-1', countryCode: 'NG', operatorCode: 'MTN', skuCode: 'MTN_1000', costPrice: 2.25, currency: 'USD', margin: 0.04, lastUpdated: new Date().toISOString() },
  { providerId: 'prov-1', countryCode: 'US', operatorCode: 'ATT', skuCode: 'ATT_25', costPrice: 24.00, currency: 'USD', margin: 0.02, lastUpdated: new Date().toISOString() },
  
  // Reloadly Pricing (slightly different)
  { providerId: 'prov-2', countryCode: 'IN', operatorCode: 'JIO', skuCode: 'JIO_199', costPrice: 2.40, currency: 'USD', margin: 0.04, lastUpdated: new Date().toISOString() },
  { providerId: 'prov-2', countryCode: 'IN', operatorCode: 'JIO', skuCode: 'JIO_599', costPrice: 7.05, currency: 'USD', margin: 0.04, lastUpdated: new Date().toISOString() },
  { providerId: 'prov-2', countryCode: 'IN', operatorCode: 'AIRTEL', skuCode: 'AIRTEL_149', costPrice: 1.80, currency: 'USD', margin: 0.04, lastUpdated: new Date().toISOString() },
  { providerId: 'prov-2', countryCode: 'NG', operatorCode: 'MTN', skuCode: 'MTN_500', costPrice: 1.10, currency: 'USD', margin: 0.05, lastUpdated: new Date().toISOString() },
  { providerId: 'prov-2', countryCode: 'NG', operatorCode: 'MTN', skuCode: 'MTN_1000', costPrice: 2.20, currency: 'USD', margin: 0.05, lastUpdated: new Date().toISOString() },
  
  // TransferTo Pricing
  { providerId: 'prov-3', countryCode: 'IN', operatorCode: 'JIO', skuCode: 'JIO_199', costPrice: 2.38, currency: 'USD', margin: 0.045, lastUpdated: new Date().toISOString() },
  { providerId: 'prov-3', countryCode: 'IN', operatorCode: 'JIO', skuCode: 'JIO_599', costPrice: 7.08, currency: 'USD', margin: 0.045, lastUpdated: new Date().toISOString() },
  { providerId: 'prov-3', countryCode: 'NG', operatorCode: 'MTN', skuCode: 'MTN_500', costPrice: 1.12, currency: 'USD', margin: 0.045, lastUpdated: new Date().toISOString() },
]

// Mock Routing Rules
export const mockRoutingRules: RoutingRule[] = [
  {
    id: 'rule-1',
    countryCode: 'IN',
    operatorCode: undefined, // All Indian operators
    routingType: 'LCR',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-2',
    countryCode: 'NG',
    operatorCode: 'MTN',
    routingType: 'PRIORITY',
    providerPriorities: [
      { providerId: 'prov-2', priority: 1 }, // Reloadly first for MTN Nigeria
      { providerId: 'prov-1', priority: 2 },
      { providerId: 'prov-3', priority: 3 },
    ],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-3',
    countryCode: 'US',
    operatorCode: undefined,
    routingType: 'FIXED',
    defaultProviderId: 'prov-1', // Only DingConnect for US
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-global-fallback',
    countryCode: '*',
    operatorCode: undefined,
    routingType: 'FIXED',
    defaultProviderId: 'prov-1',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Cache simulation (in production, use Redis)
const pricingCache: Map<string, { data: ProviderPricing[]; expiresAt: number }> = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const refreshHistory: RefreshRun[] = []
const forexRates: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  INR: 0.012,
  NGN: 0.00068,
  PHP: 0.017,
  MXN: 0.058,
}

/**
 * Get pricing from cache or fetch fresh
 */
function getPricingFromCache(countryCode: string, operatorCode: string): ProviderPricing[] | null {
  const cacheKey = `pricing:${countryCode}:${operatorCode}`
  const cached = pricingCache.get(cacheKey)
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }
  
  return null
}

/**
 * Set pricing in cache
 */
function setPricingInCache(countryCode: string, operatorCode: string, data: ProviderPricing[]): void {
  const cacheKey = `pricing:${countryCode}:${operatorCode}`
  pricingCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

/**
 * Get active providers for a country
 */
export function getProvidersForCountry(countryCode: string): Provider[] {
  return mockProviders.filter(
    (p) =>
      p.isActive &&
      p.status !== 'offline' &&
      p.supportedCountries.includes(countryCode) &&
      !isBlacklisted(p),
  )
}

function isBlacklisted(provider: Provider) {
  if (!provider.blacklistedUntil) return false
  return new Date(provider.blacklistedUntil).getTime() > Date.now()
}

function supportsOperator(provider: Provider, countryCode: string, operatorCode: string) {
  const configured = provider.supportedOperators?.[countryCode]
  if (!configured || configured.length === 0) return true
  return configured.includes(operatorCode)
}

function normalizeOperatorCode(input: string) {
  if (input.includes('_')) return input.split('_')[0] ?? input
  return input
}

/**
 * Get routing rule for country/operator
 */
export function getRoutingRule(countryCode: string, operatorCode?: string): RoutingRule | null {
  // First try to find operator-specific rule
  if (operatorCode) {
    const operatorRule = mockRoutingRules.find(
      (r) => r.isActive && r.countryCode === countryCode && r.operatorCode === operatorCode
    )
    if (operatorRule) return operatorRule
  }
  
  // Fallback to country-level rule
  const countryRule = mockRoutingRules.find(
    (r) => r.isActive && r.countryCode === countryCode && !r.operatorCode
  )
  if (countryRule) return countryRule

  // Global fallback rule (for all countries/operators)
  const globalFallbackRule = mockRoutingRules.find(
    (r) => r.isActive && r.countryCode === '*' && !r.operatorCode
  )

  return globalFallbackRule || null
}

/**
 * Get pricing for providers
 */
export function getProviderPricing(
  countryCode: string,
  operatorCode: string,
  skuCode?: string,
  options?: { bypassCache?: boolean }
): ProviderPricing[] {
  // Check cache first
  if (!options?.bypassCache) {
    const cached = getPricingFromCache(countryCode, operatorCode)
    if (cached) {
      if (skuCode) {
        return cached.filter((p) => p.skuCode === skuCode)
      }
      return cached
    }
  }
  
  // Fetch from database (mock)
  const normalizedOperator = normalizeOperatorCode(operatorCode)
  let pricing = mockProviderPricing.filter(
    (p) => p.countryCode === countryCode && p.operatorCode === operatorCode
  )
  if (pricing.length === 0 && normalizedOperator !== operatorCode) {
    pricing = mockProviderPricing.filter(
      (p) => p.countryCode === countryCode && p.operatorCode === normalizedOperator,
    )
  }
  
  // Cache the result
  if (!options?.bypassCache) {
    setPricingInCache(countryCode, operatorCode, pricing)
  }
  
  if (skuCode) {
    pricing = pricing.filter((p) => p.skuCode === skuCode)
  }
  
  return pricing
}

/**
 * Main LCR Algorithm
 */
export function selectBestProvider(
  countryCode: string,
  operatorCode: string,
  skuCode: string
): LCRResult | null {
  // 1. Get active providers for country
  const normalizedOperator = normalizeOperatorCode(operatorCode)
  const providers = getProvidersForCountry(countryCode).filter((p) =>
    supportsOperator(p, countryCode, normalizedOperator),
  )
  if (providers.length === 0) {
    console.error(`No active providers for country: ${countryCode}`)
    return null
  }
  
  // 2. Get routing rule
  const rule = getRoutingRule(countryCode, operatorCode)
  
  // 3. Get pricing for all providers
  const pricing = getProviderPricing(countryCode, normalizedOperator, skuCode, { bypassCache: true })
  
  // 4. Apply routing logic based on rule type
  let selectedProvider: Provider | null = null
  let selectedPricing: ProviderPricing | null = null
  const fallbackProviders: string[] = []
  
  if (!rule || rule.routingType === 'LCR') {
    // LCR: Sort by cost and select cheapest
    const sortedPricing = pricing
      .filter((p) => {
        const provider = providers.find((prov) => prov.id === p.providerId)
        return provider && provider.isActive && provider.status !== 'offline'
      })
      .sort((a, b) => a.costPrice - b.costPrice)
    
    if (sortedPricing.length > 0) {
      selectedPricing = sortedPricing[0]
      selectedProvider = providers.find((p) => p.id === selectedPricing!.providerId) || null
      
      // Set fallback providers (remaining sorted by cost)
      for (let i = 1; i < sortedPricing.length; i++) {
        fallbackProviders.push(sortedPricing[i].providerId)
      }
    }
  } else if (rule.routingType === 'PRIORITY') {
    // PRIORITY: Use configured priority order
    if (rule.providerPriorities) {
      const sortedByPriority = [...rule.providerPriorities].sort((a, b) => a.priority - b.priority)
      
      for (const { providerId } of sortedByPriority) {
        const provider = providers.find((p) => p.id === providerId)
        const providerPrice = pricing.find((p) => p.providerId === providerId)
        
        if (provider && provider.isActive && provider.status !== 'offline' && providerPrice) {
          if (!selectedProvider) {
            selectedProvider = provider
            selectedPricing = providerPrice
          } else {
            fallbackProviders.push(providerId)
          }
        }
      }
    }
  } else if (rule.routingType === 'FIXED') {
    // FIXED: Use only the specified provider
    if (rule.defaultProviderId) {
      selectedProvider = providers.find((p) => p.id === rule.defaultProviderId) || null
      selectedPricing = pricing.find((p) => p.providerId === rule.defaultProviderId) || null
      
      // For FIXED routing, fallback to LCR if primary fails
      const otherPricing = pricing
        .filter((p) => p.providerId !== rule.defaultProviderId)
        .sort((a, b) => a.costPrice - b.costPrice)
      
      for (const p of otherPricing) {
        fallbackProviders.push(p.providerId)
      }
    }
  }
  
  if (!selectedProvider || !selectedPricing) {
    return null
  }
  
  return {
    providerId: selectedProvider.id,
    providerCode: selectedProvider.code,
    providerName: selectedProvider.name,
    costPrice: selectedPricing.costPrice,
    margin: selectedPricing.margin,
    estimatedProcessingTime: selectedProvider.status === 'degraded' ? '30-60s' : '5-15s',
    fallbackProviders,
  }
}

function addFeesAndFx(provider: Provider, base: ProviderPricing) {
  const fx = forexRates[base.currency] ?? 1
  const rawUsd = base.costPrice * fx
  const fee = (provider.feeFixedUsd ?? 0) + rawUsd * (provider.feePercent ?? 0)
  const normalized = rawUsd + fee
  return {
    ...base,
    rawCostPrice: base.costPrice,
    fxRateUsed: fx,
    feeAmountUsd: fee,
    costPrice: Number(normalized.toFixed(4)),
  }
}

function weightedScore(costUsd: number, provider: Provider, latencyMs: number) {
  const reliabilityPenalty = (100 - (provider.successRate ?? 95)) * 0.02
  const latencyPenalty = latencyMs * 0.00025
  return costUsd + reliabilityPenalty + latencyPenalty
}

async function evaluateProviderLive(
  provider: Provider,
  countryCode: string,
  operatorCode: string,
  skuCode: string,
  timeoutMs: number,
) {
  const basePricing = getProviderPricing(countryCode, operatorCode, skuCode, { bypassCache: true })
    .find((p) => p.providerId === provider.id)
  if (!basePricing) {
    return { error: 'NO_PRICE' as const }
  }
  const jitter = Math.round(Math.random() * 250)
  const simulatedLatency = Math.max(100, Math.min(timeoutMs + 1000, (provider.avgLatencyMs ?? 700) + jitter))

  const timed = await Promise.race([
    new Promise<'OK'>((resolve) => setTimeout(() => resolve('OK'), simulatedLatency)),
    new Promise<'TIMEOUT'>((resolve) => setTimeout(() => resolve('TIMEOUT'), timeoutMs)),
  ])
  if (timed === 'TIMEOUT') {
    return { error: 'TIMEOUT' as const, latencyMs: timeoutMs }
  }

  const normalizedPricing = addFeesAndFx(provider, basePricing)
  return {
    pricing: {
      ...normalizedPricing,
      sourceLatencyMs: simulatedLatency,
    },
  }
}

export async function selectBestProviderWithObservability(
  countryCode: string,
  operatorCode: string,
  skuCode: string,
  options?: { timeoutMs?: number; weighted?: boolean },
): Promise<LCRDecision> {
  const normalizedOperator = normalizeOperatorCode(operatorCode)
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const weighted = options?.weighted ?? true

  const providers = mockProviders.filter((p) => {
    if (!p.isActive || p.status === 'offline' || isBlacklisted(p)) return false
    if (!p.supportedCountries.includes(countryCode)) return false
    return supportsOperator(p, countryCode, normalizedOperator)
  })
  if (providers.length === 0) {
    return {
      selected: null,
      evaluated: [],
      fallbackOrder: [],
      ruleApplied: 'NONE',
    }
  }

  const evaluations = await Promise.all(
    providers.map(async (provider): Promise<ProviderEvaluation & { price?: ProviderPricing }> => {
      const outcome = await evaluateProviderLive(provider, countryCode, normalizedOperator, skuCode, timeoutMs)
      if ('error' in outcome) {
        return {
          providerId: provider.id,
          providerCode: provider.code,
          providerName: provider.name,
          eligible: false,
          reason: outcome.error,
          timeoutMs,
          latencyMs: outcome.latencyMs,
          successRate: provider.successRate,
        }
      }
      const score = weighted
        ? weightedScore(outcome.pricing.costPrice, provider, outcome.pricing.sourceLatencyMs ?? 0)
        : outcome.pricing.costPrice
      return {
        providerId: provider.id,
        providerCode: provider.code,
        providerName: provider.name,
        eligible: true,
        timeoutMs,
        latencyMs: outcome.pricing.sourceLatencyMs,
        normalizedCostUsd: outcome.pricing.costPrice,
        weightedScore: Number(score.toFixed(4)),
        successRate: provider.successRate,
        price: outcome.pricing,
      }
    }),
  )

  const valid = evaluations
    .filter((x) => x.eligible && typeof x.weightedScore === 'number' && x.price)
    .sort((a, b) => {
      if (a.weightedScore! !== b.weightedScore!) return a.weightedScore! - b.weightedScore!
      if ((a.normalizedCostUsd ?? 0) !== (b.normalizedCostUsd ?? 0)) return (a.normalizedCostUsd ?? 0) - (b.normalizedCostUsd ?? 0)
      return a.providerId.localeCompare(b.providerId)
    })

  const selectedEval = valid[0]
  const selected = selectedEval
    ? {
        providerId: selectedEval.providerId,
        providerCode: selectedEval.providerCode,
        providerName: selectedEval.providerName,
        costPrice: selectedEval.price!.costPrice,
        margin: selectedEval.price!.margin,
        estimatedProcessingTime: (selectedEval.latencyMs ?? 0) > 1000 ? '15-45s' : '5-15s',
        fallbackProviders: valid.slice(1).map((x) => x.providerId),
      }
    : null

  return {
    selected,
    evaluated: evaluations.map(({ price: _price, ...rest }) => rest),
    fallbackOrder: valid.slice(1).map((x) => x.providerId),
    ruleApplied: getRoutingRule(countryCode, normalizedOperator)?.routingType ?? 'NONE',
  }
}

/**
 * Execute recharge with failover
 */
export async function executeRechargeWithFailover(
  order: Partial<RechargeOrder>,
  lcrResult: LCRResult
): Promise<{ success: boolean; providerRef?: string; errorCode?: string; usedProvider: string }> {
  const allProviders = [lcrResult.providerId, ...lcrResult.fallbackProviders]
  
  for (const providerId of allProviders) {
    const provider = mockProviders.find((p) => p.id === providerId)
    if (!provider) continue
    
    try {
      // Simulate API call with random success/failure
      const result = await simulateProviderCall(provider, order)
      
      if (result.success) {
        provider.failureStreak = 0
        provider.blacklistedUntil = undefined
        return {
          success: true,
          providerRef: result.transactionId,
          usedProvider: provider.code,
        }
      }
    } catch (error) {
      console.error(`Provider ${provider.code} failed:`, error)
      provider.failureStreak = (provider.failureStreak ?? 0) + 1
      if ((provider.failureStreak ?? 0) >= 3) {
        provider.blacklistedUntil = new Date(Date.now() + BLACKLIST_MS).toISOString()
      }
      // Continue to next provider
    }
  }
  
  // All providers failed
  return {
    success: false,
    errorCode: 'ALL_PROVIDERS_FAILED',
    usedProvider: '',
  }
}

/**
 * Simulate provider API call
 */
async function simulateProviderCall(
  provider: Provider,
  _order: Partial<RechargeOrder>
): Promise<{ success: boolean; transactionId?: string; errorCode?: string }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000))
  
  // Simulate success rate based on provider
  const successRate = provider.successRate || 95
  const isSuccess = Math.random() * 100 < successRate
  
  if (isSuccess) {
    return {
      success: true,
      transactionId: `${provider.code}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
  }
  
  return {
    success: false,
    errorCode: 'PROVIDER_ERROR',
  }
}

/**
 * Get all providers (for admin)
 */
export function getAllProviders(): Provider[] {
  return [...mockProviders]
}

/**
 * Get all routing rules (for admin)
 */
export function getAllRoutingRules(): RoutingRule[] {
  return [...mockRoutingRules]
}

/**
 * Create or update routing rule and apply immediately.
 * If a matching country/operator rule exists, it gets replaced.
 */
export function upsertRoutingRule(
  input: Omit<RoutingRule, 'id' | 'createdAt' | 'updatedAt'>,
): RoutingRule {
  const existingIdx = mockRoutingRules.findIndex(
    (r) => r.countryCode === input.countryCode && (r.operatorCode || '') === (input.operatorCode || ''),
  )

  const now = new Date().toISOString()
  if (existingIdx >= 0) {
    const updated: RoutingRule = {
      ...mockRoutingRules[existingIdx],
      ...input,
      updatedAt: now,
    }
    mockRoutingRules[existingIdx] = updated
    return updated
  }

  const created: RoutingRule = {
    ...input,
    id: `rule-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  }
  mockRoutingRules.push(created)
  return created
}

export function deleteRoutingRule(ruleId: string): void {
  const idx = mockRoutingRules.findIndex((r) => r.id === ruleId)
  if (idx >= 0) {
    mockRoutingRules.splice(idx, 1)
  }
}

export function setRoutingRuleActive(ruleId: string, isActive: boolean): void {
  const rule = mockRoutingRules.find((r) => r.id === ruleId)
  if (!rule) return
  rule.isActive = isActive
  rule.updatedAt = new Date().toISOString()
}

/**
 * Get all provider pricing (for admin)
 */
export function getAllPricing(): ProviderPricing[] {
  return [...mockProviderPricing]
}

/**
 * Get provider statistics
 */
export function getProviderStats(): {
  totalProviders: number
  activeProviders: number
  onlineProviders: number
  avgSuccessRate: number
  degradedProviders: number
  blacklistedProviders: number
} {
  const active = mockProviders.filter((p) => p.isActive)
  const online = active.filter((p) => p.status === 'online')
  const degraded = active.filter((p) => p.status === 'degraded')
  const blacklisted = active.filter((p) => isBlacklisted(p))
  const avgRate = active.length > 0
    ? active.reduce((sum, p) => sum + (p.successRate || 0), 0) / active.length
    : 0
  
  return {
    totalProviders: mockProviders.length,
    activeProviders: active.length,
    onlineProviders: online.length,
    degradedProviders: degraded.length,
    blacklistedProviders: blacklisted.length,
    avgSuccessRate: Math.round(avgRate * 10) / 10,
  }
}

export function setProviderActive(providerId: string, isActive: boolean): void {
  const p = mockProviders.find((x) => x.id === providerId)
  if (!p) return
  p.isActive = isActive
}

export function getCoverageRows(): CoverageRow[] {
  const rows: CoverageRow[] = []
  const carrierToOperator = mockCarriers.map((c) => ({
    countryCode: c.countryCode,
    operatorCode: normalizeOperatorCode(c.code),
  }))
  for (const item of carrierToOperator) {
    const providerCodes = mockProviders
      .filter((p) => p.isActive && p.supportedCountries.includes(item.countryCode))
      .filter((p) => supportsOperator(p, item.countryCode, item.operatorCode))
      .map((p) => p.code)
    rows.push({
      countryCode: item.countryCode,
      operatorCode: item.operatorCode,
      providerCodes,
    })
  }
  rows.sort((a, b) =>
    a.countryCode === b.countryCode
      ? a.operatorCode.localeCompare(b.operatorCode)
      : a.countryCode.localeCompare(b.countryCode),
  )
  return rows
}

function randomShift(base: number, pct: number) {
  const delta = base * pct * (Math.random() * 2 - 1)
  return Math.max(0.0001, base + delta)
}

async function refreshProviderData(provider: Provider): Promise<RefreshProviderResult> {
  // simulate upstream sync call
  await new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 320))
  const failed = Math.random() < 0.12
  provider.lastHealthCheck = new Date().toISOString()
  if (failed) {
    provider.status = 'degraded'
    provider.successRate = Math.max(80, (provider.successRate ?? 95) - Math.random() * 1.5)
    return {
      providerId: provider.id,
      providerName: provider.name,
      success: false,
      message: 'API health refresh failed',
    }
  }

  provider.status = Math.random() < 0.1 ? 'degraded' : 'online'
  provider.successRate = Math.min(99.9, Math.max(90, (provider.successRate ?? 95) + (Math.random() - 0.5) * 1.2))
  provider.avgLatencyMs = Math.max(200, Math.min(2200, (provider.avgLatencyMs ?? 700) + (Math.random() - 0.5) * 180))
  provider.failureStreak = 0

  for (const pricing of mockProviderPricing.filter((p) => p.providerId === provider.id)) {
    pricing.costPrice = Number(randomShift(pricing.costPrice, 0.025).toFixed(4))
    pricing.lastUpdated = new Date().toISOString()
  }

  // simulate forex updates
  forexRates.EUR = Number(randomShift(forexRates.EUR, 0.01).toFixed(4))
  forexRates.INR = Number(randomShift(forexRates.INR, 0.01).toFixed(5))
  forexRates.NGN = Number(randomShift(forexRates.NGN, 0.015).toFixed(6))
  forexRates.PHP = Number(randomShift(forexRates.PHP, 0.01).toFixed(5))
  forexRates.MXN = Number(randomShift(forexRates.MXN, 0.01).toFixed(5))

  return {
    providerId: provider.id,
    providerName: provider.name,
    success: true,
    message: 'Operators, pricing, forex and health synced',
  }
}

export async function refreshAggregatorData(options?: {
  source?: 'manual' | 'scheduled'
  maxAttempts?: number
}): Promise<RefreshRun> {
  const startedAt = new Date().toISOString()
  const maxAttempts = options?.maxAttempts ?? 2
  const source = options?.source ?? 'manual'
  let attempts = 0
  let results: RefreshProviderResult[] = []

  while (attempts < maxAttempts) {
    attempts += 1
    results = []
    for (const provider of mockProviders) {
      // Continue refresh for other APIs even if some fail
      // eslint-disable-next-line no-await-in-loop
      results.push(await refreshProviderData(provider))
    }
    const allSuccess = results.every((r) => r.success)
    if (allSuccess) break
  }

  const successCount = results.filter((x) => x.success).length
  const failedCount = results.length - successCount
  const status: RefreshRunStatus =
    failedCount === 0 ? 'success' : successCount === 0 ? 'failed' : 'partial'

  const run: RefreshRun = {
    startedAt,
    endedAt: new Date().toISOString(),
    status,
    attempts,
    maxAttempts,
    source,
    details: results,
  }
  refreshHistory.unshift(run)
  if (refreshHistory.length > 40) refreshHistory.pop()
  return run
}

export function getLatestRefreshRun(): RefreshRun | null {
  return refreshHistory[0] ?? null
}

export function getRefreshHistory(): RefreshRun[] {
  return [...refreshHistory]
}

export function isInRefreshWindow(now = new Date()) {
  const hour = now.getHours()
  return hour >= 1 && hour < 3
}
