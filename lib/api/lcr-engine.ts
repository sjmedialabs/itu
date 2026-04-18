/**
 * Least Cost Routing (LCR) Engine
 * 
 * This module implements the LCR algorithm for selecting the best provider
 * for a recharge request based on cost, priority, and availability.
 * 
 * Algorithm:
 * 1. Fetch all active providers for the country/operator
 * 2. Get pricing from cache (Redis) or fetch fresh
 * 3. Sort providers by cost ASC
 * 4. Apply routing rules (LCR / PRIORITY / FIXED)
 * 5. Select best provider
 * 6. Handle failover if primary fails
 */

import type { 
  DingProduct,
  RechargeOrder 
} from '@/lib/types'

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
}

// Provider Pricing
export interface ProviderPricing {
  providerId: string
  countryCode: string
  operatorCode: string
  skuCode: string
  costPrice: number
  currency: string
  margin: number
  lastUpdated: string
}

// Routing Rule
export interface RoutingRule {
  id: string
  countryCode: string
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
]

// Cache simulation (in production, use Redis)
const pricingCache: Map<string, { data: ProviderPricing[]; expiresAt: number }> = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

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
    (p) => p.isActive && p.status !== 'offline' && p.supportedCountries.includes(countryCode)
  )
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
  
  return countryRule || null
}

/**
 * Get pricing for providers
 */
export function getProviderPricing(
  countryCode: string,
  operatorCode: string,
  skuCode?: string
): ProviderPricing[] {
  // Check cache first
  const cached = getPricingFromCache(countryCode, operatorCode)
  if (cached) {
    if (skuCode) {
      return cached.filter((p) => p.skuCode === skuCode)
    }
    return cached
  }
  
  // Fetch from database (mock)
  let pricing = mockProviderPricing.filter(
    (p) => p.countryCode === countryCode && p.operatorCode === operatorCode
  )
  
  // Cache the result
  setPricingInCache(countryCode, operatorCode, pricing)
  
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
  const providers = getProvidersForCountry(countryCode)
  if (providers.length === 0) {
    console.error(`No active providers for country: ${countryCode}`)
    return null
  }
  
  // 2. Get routing rule
  const rule = getRoutingRule(countryCode, operatorCode)
  
  // 3. Get pricing for all providers
  const pricing = getProviderPricing(countryCode, operatorCode, skuCode)
  
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
        return {
          success: true,
          providerRef: result.transactionId,
          usedProvider: provider.code,
        }
      }
    } catch (error) {
      console.error(`Provider ${provider.code} failed:`, error)
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
  return mockProviders
}

/**
 * Get all routing rules (for admin)
 */
export function getAllRoutingRules(): RoutingRule[] {
  return mockRoutingRules
}

/**
 * Get all provider pricing (for admin)
 */
export function getAllPricing(): ProviderPricing[] {
  return mockProviderPricing
}

/**
 * Get provider statistics
 */
export function getProviderStats(): {
  totalProviders: number
  activeProviders: number
  onlineProviders: number
  avgSuccessRate: number
} {
  const active = mockProviders.filter((p) => p.isActive)
  const online = active.filter((p) => p.status === 'online')
  const avgRate = active.length > 0
    ? active.reduce((sum, p) => sum + (p.successRate || 0), 0) / active.length
    : 0
  
  return {
    totalProviders: mockProviders.length,
    activeProviders: active.length,
    onlineProviders: online.length,
    avgSuccessRate: Math.round(avgRate * 10) / 10,
  }
}
