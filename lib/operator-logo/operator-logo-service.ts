import { uploadObject, STORAGE_BUCKETS, sanitizeStorageFileName } from '@/lib/storage/object-storage'
import { normalizeOperator } from './operator-normalizer'
import { getOperatorsNeedingSync, upsertOperatorLogo } from './operator-logo-repository'
import type {
  SyncOptions,
  SyncProgressState,
  BrandfetchSearchResult,
  BrandfetchBrandDetails,
  SystemOperatorWithLogo,
  LogoStatus,
} from './types'

// Global in-memory status tracking for active background sync job
let currentSyncProgress: SyncProgressState = {
  isRunning: false,
  forceResync: false,
  totalToProcess: 0,
  processedCount: 0,
  completedCount: 0,
  failedCount: 0,
  notFoundCount: 0,
  skippedCount: 0,
  currentOperator: null,
  startedAt: null,
  completedAt: null,
  lastError: null,
}

export function getSyncProgress(): SyncProgressState {
  return { ...currentSyncProgress }
}

function getBrandfetchApiKey(): string | null {
  const key = (process.env.BRANDFETCH_CLIENT_ID || process.env.BRANDFETCH_API_KEY || '').trim()
  return key || null
}

/**
 * Perform Brandfetch search for normalized operator query or domain hint
 */
async function searchBrandfetch(
  query: string,
  domainHint?: string
): Promise<{ logoUrl?: string; domain?: string } | null> {
  const apiKey = getBrandfetchApiKey()
  if (!apiKey) {
    console.warn('[Brandfetch] BRANDFETCH_CLIENT_ID is not configured in environment.')
    return null
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'x-api-key': apiKey,
    Accept: 'application/json',
  }

  // 1. Direct domain lookup if domain hint is known
  if (domainHint) {
    try {
      const brandRes = await fetch(`https://api.brandfetch.io/v2/brands/${encodeURIComponent(domainHint)}`, {
        headers,
        cache: 'no-store',
      })

      if (brandRes.ok) {
        const brandData = (await brandRes.json()) as BrandfetchBrandDetails
        const logoUrl = extractPngLogoFromBrand(brandData)
        if (logoUrl) {
          return { logoUrl, domain: brandData.domain || domainHint }
        }
      }
    } catch (e) {
      console.warn(`[Brandfetch] Domain lookup failed for ${domainHint}:`, e)
    }
  }

  // 2. Search API lookup
  try {
    const searchRes = await fetch(`https://api.brandfetch.io/v2/search/${encodeURIComponent(query)}`, {
      headers,
      cache: 'no-store',
    })

    if (!searchRes.ok) {
      console.warn(`[Brandfetch] Search API HTTP ${searchRes.status} for query: ${query}`)
      return null
    }

    const searchResults = (await searchRes.json()) as BrandfetchSearchResult[]
    if (!Array.isArray(searchResults) || !searchResults.length) {
      return null
    }

    // Pick top matching result
    const bestMatch = searchResults[0]
    const domain = bestMatch.domain

    if (domain) {
      // Fetch full brand assets for domain to get high quality PNG
      try {
        const brandRes = await fetch(`https://api.brandfetch.io/v2/brands/${encodeURIComponent(domain)}`, {
          headers,
          cache: 'no-store',
        })
        if (brandRes.ok) {
          const brandData = (await brandRes.json()) as BrandfetchBrandDetails
          const logoUrl = extractPngLogoFromBrand(brandData)
          if (logoUrl) return { logoUrl, domain }
        }
      } catch {
        // Fall back to search result icon/logo
      }
    }

    const fallbackUrl = bestMatch.logo || bestMatch.icon
    if (fallbackUrl) {
      return { logoUrl: fallbackUrl, domain: domain || undefined }
    }
  } catch (err) {
    console.error(`[Brandfetch] Search failed for ${query}:`, err)
  }

  return null
}

/**
 * Extract PNG logo URL (transparent preferred) from Brandfetch brand details response
 */
function extractPngLogoFromBrand(brand: BrandfetchBrandDetails): string | null {
  if (!brand || !Array.isArray(brand.logos) || !brand.logos.length) return null

  // Collect all PNG formats across all logos
  const pngCandidates: Array<{ src: string; transparent: boolean; height: number }> = []

  for (const logo of brand.logos) {
    if (!Array.isArray(logo.formats)) continue
    for (const format of logo.formats) {
      if (format.src && format.format === 'png') {
        const transparent = format.background === 'transparent' || !format.background
        pngCandidates.push({
          src: format.src,
          transparent,
          height: format.height ?? 0,
        })
      }
    }
  }

  if (!pngCandidates.length) {
    // If no explicit PNG format specified, check for any format URL ending in png
    for (const logo of brand.logos) {
      if (!Array.isArray(logo.formats)) continue
      for (const format of logo.formats) {
        if (format.src && format.src.toLowerCase().includes('.png')) {
          return format.src
        }
      }
    }
    return null
  }

  // Sort candidates: transparent background first, then highest resolution
  pngCandidates.sort((a, b) => {
    if (a.transparent && !b.transparent) return -1
    if (!a.transparent && b.transparent) return 1
    return b.height - a.height
  })

  return pngCandidates[0].src
}

/**
 * Download PNG image from Brandfetch logo URL, validate, and upload to project Supabase storage
 */
async function downloadAndStoreLogo(
  logoUrl: string,
  slugOrId: string
): Promise<string | null> {
  try {
    const response = await fetch(logoUrl, { cache: 'no-store' })
    if (!response.ok) {
      console.warn(`[Brandfetch] Failed to download image from ${logoUrl}, HTTP ${response.status}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Image validation check (must be non-empty image Buffer)
    if (!buffer || buffer.length < 100) {
      console.warn(`[Brandfetch] Downloaded logo for ${slugOrId} is corrupted or empty (${buffer?.length ?? 0} bytes).`)
      return null
    }

    const fileName = `${sanitizeStorageFileName(slugOrId)}.png`
    const storagePath = `operator-logos/${fileName}`

    // Upload to project Supabase storage bucket 'operator-logos'
    const uploadResult = await uploadObject({
      bucket: STORAGE_BUCKETS.operator_logos,
      path: storagePath,
      body: buffer,
      contentType: 'image/png',
      upsert: true,
    })

    return uploadResult.publicUrl
  } catch (error) {
    console.error(`[Brandfetch] Storage upload failed for ${slugOrId}:`, error)
    return null
  }
}

/**
 * Synchronize a single operator record
 */
async function syncSingleOperator(operator: SystemOperatorWithLogo): Promise<LogoStatus> {
  const norm = normalizeOperator(operator.system_operator_name, operator.slug)
  const query = norm.searchName
  const domainHint = norm.domainHint

  const brandfetchResult = await searchBrandfetch(query, domainHint)

  if (!brandfetchResult || !brandfetchResult.logoUrl) {
    // Record NOT_FOUND
    await upsertOperatorLogo({
      system_operator_id: operator.id,
      logo_status: 'NOT_FOUND',
      brandfetch_domain: brandfetchResult?.domain ?? domainHint ?? null,
    })
    return 'NOT_FOUND'
  }

  // Download PNG and store in project storage
  const storageUrl = await downloadAndStoreLogo(
    brandfetchResult.logoUrl,
    operator.slug || operator.id
  )

  if (!storageUrl) {
    // Download or upload failed
    await upsertOperatorLogo({
      system_operator_id: operator.id,
      logo_status: 'FAILED',
      brandfetch_domain: brandfetchResult.domain ?? domainHint ?? null,
    })
    return 'FAILED'
  }

  // Save stored logo public URL in operator_logos
  await upsertOperatorLogo({
    system_operator_id: operator.id,
    logo_url: storageUrl,
    brandfetch_domain: brandfetchResult.domain ?? domainHint ?? null,
    logo_status: 'FOUND',
    last_synced_at: new Date().toISOString(),
  })

  return 'FOUND'
}

/**
 * Main Background Sync Engine Orchestrator
 */
export async function runOperatorLogoSyncJob(options?: SyncOptions): Promise<SyncProgressState> {
  if (currentSyncProgress.isRunning) {
    return getSyncProgress()
  }

  const forceResync = Boolean(options?.forceResync)
  const delayMs = options?.delayMs ?? 150
  const retryAttempts = options?.retryAttempts ?? 2

  const operatorsToProcess = await getOperatorsNeedingSync(forceResync)

  currentSyncProgress = {
    isRunning: true,
    forceResync,
    totalToProcess: operatorsToProcess.length,
    processedCount: 0,
    completedCount: 0,
    failedCount: 0,
    notFoundCount: 0,
    skippedCount: 0,
    currentOperator: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    lastError: null,
  }

  if (!operatorsToProcess.length) {
    currentSyncProgress.isRunning = false
    currentSyncProgress.completedAt = new Date().toISOString()
    return getSyncProgress()
  }

  // Asynchronous background job execution (non-blocking)
  const startTime = Date.now()

  ;(async () => {
    try {
      console.log(`[LogoSync] Starting Operator Logo Sync (total: ${operatorsToProcess.length}, force: ${forceResync})`)

      for (const op of operatorsToProcess) {
        currentSyncProgress.currentOperator = op.system_operator_name
        let status: LogoStatus = 'FAILED'
        let attempts = 0

        while (attempts <= retryAttempts) {
          attempts++
          try {
            status = await syncSingleOperator(op)
            if (status !== 'FAILED') break
          } catch (e) {
            console.error(`[LogoSync] Error syncing ${op.system_operator_name} (attempt ${attempts}):`, e)
            if (attempts > retryAttempts) status = 'FAILED'
          }
        }

        currentSyncProgress.processedCount++
        if (status === 'FOUND') currentSyncProgress.completedCount++
        else if (status === 'NOT_FOUND') currentSyncProgress.notFoundCount++
        else currentSyncProgress.failedCount++

        // Configurable delay between requests to avoid rate limits
        if (delayMs > 0) {
          await new Promise((res) => setTimeout(res, delayMs))
        }
      }

      const totalTimeMs = Date.now() - startTime
      console.log(
        `[LogoSync] Synchronization completed in ${totalTimeMs}ms. ` +
        `Total: ${operatorsToProcess.length}, Synced: ${currentSyncProgress.completedCount}, ` +
        `NotFound: ${currentSyncProgress.notFoundCount}, Failed: ${currentSyncProgress.failedCount}`
      )
    } catch (globalError: any) {
      console.error('[LogoSync] Fatal error in sync execution job:', globalError)
      currentSyncProgress.lastError = globalError?.message || String(globalError)
    } finally {
      currentSyncProgress.isRunning = false
      currentSyncProgress.currentOperator = null
      currentSyncProgress.completedAt = new Date().toISOString()
    }
  })()

  return getSyncProgress()
}
