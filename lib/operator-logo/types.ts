export type LogoStatus = 'PENDING' | 'FOUND' | 'NOT_FOUND' | 'FAILED'

export interface OperatorLogoRow {
  id: string
  system_operator_id: string
  logo_url?: string | null
  brandfetch_domain?: string | null
  logo_status: LogoStatus
  last_synced_at?: string | null
  created_at: string
  updated_at: string
}

export interface SystemOperatorWithLogo {
  id: string
  system_operator_name: string
  slug?: string | null
  country_id: string
  service_domain?: string | null
  status?: string | null
  logo_url?: string | null
  brandfetch_domain?: string | null
  logo_status?: LogoStatus
  last_synced_at?: string | null
}

export interface SyncOptions {
  forceResync?: boolean
  batchSize?: number
  concurrency?: number
  delayMs?: number
  retryAttempts?: number
  timeoutMs?: number
}

export interface SyncProgressState {
  isRunning: boolean
  forceResync: boolean
  totalToProcess: number
  processedCount: number
  completedCount: number
  failedCount: number
  notFoundCount: number
  skippedCount: number
  currentOperator?: string | null
  startedAt?: string | null
  completedAt?: string | null
  lastError?: string | null
}

export interface OperatorLogoStatistics {
  totalOperators: number
  logosSynced: number
  logosPending: number
  logosFailed: number
  logosNotFound: number
  lastSyncTime?: string | null
}

export interface BrandfetchSearchResult {
  name?: string
  domain?: string
  icon?: string
  brandId?: string
  claimed?: boolean
  logo?: string
}

export interface BrandfetchFormat {
  src: string
  format: string
  background?: string
  height?: number
  width?: number
}

export interface BrandfetchLogoItem {
  type?: string
  theme?: string
  formats?: BrandfetchFormat[]
}

export interface BrandfetchBrandDetails {
  name?: string
  domain?: string
  logos?: BrandfetchLogoItem[]
}
