import { supabaseRest } from '@/lib/db/supabase-rest'
import type { OperatorLogoRow, OperatorLogoStatistics, SystemOperatorWithLogo, LogoStatus } from './types'

function enc(val: string): string {
  return encodeURIComponent(val)
}

/**
 * Fetch all system operators alongside their current logo status from operator_logos
 */
export async function getSystemOperatorsWithLogos(params?: {
  search?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<{ operators: SystemOperatorWithLogo[]; total: number }> {
  const limit = params?.limit ?? 50
  const offset = params?.offset ?? 0

  // 1. Fetch system operators
  const filters: string[] = ['select=id,system_operator_name,slug,country_id,service_domain,status', 'order=system_operator_name.asc']
  if (params?.search) {
    filters.push(`system_operator_name=ilike.*${enc(params.search)}*`)
  }
  
  const sysRes = await supabaseRest(`system_operators?${filters.join('&')}&limit=${limit}&offset=${offset}`, { cache: 'no-store' })
  if (!sysRes.ok) return { operators: [], total: 0 }
  
  const sysRows = (await sysRes.json()) as Array<{
    id: string
    system_operator_name: string
    slug?: string | null
    country_id: string
    service_domain?: string | null
    status?: string | null
  }>

  if (!sysRows.length) return { operators: [], total: 0 }

  // 2. Fetch corresponding logo records for these IDs
  const sysIds = sysRows.map((r) => r.id)
  const logosRes = await supabaseRest(
    `operator_logos?system_operator_id=in.(${sysIds.map(enc).join(',')})&select=system_operator_id,logo_url,brandfetch_domain,logo_status,last_synced_at`,
    { cache: 'no-store' }
  ).catch(() => null)

  const logoMap = new Map<string, Partial<OperatorLogoRow>>()
  if (logosRes && logosRes.ok) {
    const logoRows = (await logosRes.json()) as Array<Partial<OperatorLogoRow> & { system_operator_id: string }>
    for (const lr of logoRows) {
      if (lr.system_operator_id) logoMap.set(lr.system_operator_id, lr)
    }
  }

  let merged: SystemOperatorWithLogo[] = sysRows.map((sys) => {
    const logo = logoMap.get(sys.id)
    return {
      ...sys,
      logo_url: logo?.logo_url ?? null,
      brandfetch_domain: logo?.brandfetch_domain ?? null,
      logo_status: (logo?.logo_status as LogoStatus) ?? 'PENDING',
      last_synced_at: logo?.last_synced_at ?? null,
    }
  })

  // Apply optional logo status filter if requested
  if (params?.status) {
    const targetStatus = params.status.toUpperCase()
    merged = merged.filter((op) => op.logo_status === targetStatus)
  }

  return { operators: merged, total: merged.length }
}

/**
 * Get all system operators needing logo synchronization
 */
export async function getOperatorsNeedingSync(forceResync = false): Promise<SystemOperatorWithLogo[]> {
  // Fetch all system operators
  let offset = 0
  const allSys: Array<{
    id: string
    system_operator_name: string
    slug?: string | null
    country_id: string
    service_domain?: string | null
    status?: string | null
  }> = []

  while (true) {
    const res = await supabaseRest(
      `system_operators?select=id,system_operator_name,slug,country_id,service_domain,status&limit=1000&offset=${offset}&order=system_operator_name.asc`,
      { cache: 'no-store' }
    )
    if (!res.ok) break
    const rows = await res.json().catch(() => [])
    if (!Array.isArray(rows) || !rows.length) break
    allSys.push(...rows)
    if (rows.length < 1000) break
    offset += rows.length
  }

  if (!allSys.length) return []

  // Fetch all existing logo records
  const logoMap = new Map<string, Partial<OperatorLogoRow>>()
  let logoOffset = 0
  while (true) {
    const res = await supabaseRest(
      `operator_logos?select=system_operator_id,logo_url,brandfetch_domain,logo_status,last_synced_at&limit=1000&offset=${logoOffset}`,
      { cache: 'no-store' }
    ).catch(() => null)
    if (!res || !res.ok) break
    const rows = await res.json().catch(() => [])
    if (!Array.isArray(rows) || !rows.length) break
    for (const r of rows) {
      if (r.system_operator_id) logoMap.set(r.system_operator_id, r)
    }
    if (rows.length < 1000) break
    logoOffset += rows.length
  }

  const result: SystemOperatorWithLogo[] = []

  for (const sys of allSys) {
    const logoRec = logoMap.get(sys.id)
    const currentStatus = (logoRec?.logo_status as LogoStatus) ?? 'PENDING'
    const hasLogo = Boolean(logoRec?.logo_url)

    if (forceResync) {
      result.push({
        ...sys,
        logo_url: logoRec?.logo_url ?? null,
        brandfetch_domain: logoRec?.brandfetch_domain ?? null,
        logo_status: currentStatus,
        last_synced_at: logoRec?.last_synced_at ?? null,
      })
    } else {
      // Process only operators without logos or in PENDING / FAILED status
      if (!hasLogo || currentStatus === 'PENDING' || currentStatus === 'FAILED') {
        result.push({
          ...sys,
          logo_url: logoRec?.logo_url ?? null,
          brandfetch_domain: logoRec?.brandfetch_domain ?? null,
          logo_status: currentStatus,
          last_synced_at: logoRec?.last_synced_at ?? null,
        })
      }
    }
  }

  return result
}

/**
 * Upsert record in operator_logos table
 */
export async function upsertOperatorLogo(data: {
  system_operator_id: string
  logo_url?: string | null
  brandfetch_domain?: string | null
  logo_status: LogoStatus
  last_synced_at?: string
}): Promise<boolean> {
  const payload = {
    system_operator_id: data.system_operator_id,
    logo_url: data.logo_url ?? null,
    brandfetch_domain: data.brandfetch_domain ?? null,
    logo_status: data.logo_status,
    last_synced_at: data.last_synced_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const res = await supabaseRest('operator_logos?on_conflict=system_operator_id', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(payload),
  })

  return res.ok
}

/**
 * Retrieve summary statistics for operator logo synchronization
 */
export async function getOperatorLogoStatistics(): Promise<OperatorLogoStatistics> {
  // Total operators count
  const countSysRes = await supabaseRest('system_operators?select=id', {
    headers: { Prefer: 'count=exact', Range: '0-0' },
    cache: 'no-store',
  }).catch(() => null)

  const contentRange = countSysRes?.headers?.get('content-range') ?? ''
  const totalOperators = Number(contentRange.split('/')[1] ?? 0) || 0

  // Fetch logo status metrics
  let synced = 0
  let pending = 0
  let failed = 0
  let notFound = 0
  let lastSyncTime: string | null = null

  let offset = 0
  while (true) {
    const res = await supabaseRest(`operator_logos?select=logo_status,last_synced_at&limit=1000&offset=${offset}`, {
      cache: 'no-store',
    }).catch(() => null)

    if (!res || !res.ok) break
    const rows = (await res.json().catch(() => [])) as Array<{ logo_status: LogoStatus; last_synced_at?: string }>
    if (!Array.isArray(rows) || !rows.length) break

    for (const row of rows) {
      if (row.logo_status === 'FOUND') synced++
      else if (row.logo_status === 'PENDING') pending++
      else if (row.logo_status === 'FAILED') failed++
      else if (row.logo_status === 'NOT_FOUND') notFound++

      if (row.last_synced_at) {
        if (!lastSyncTime || new Date(row.last_synced_at) > new Date(lastSyncTime)) {
          lastSyncTime = row.last_synced_at
        }
      }
    }

    if (rows.length < 1000) break
    offset += rows.length
  }

  // Operators without logo records are counted as PENDING
  const totalWithRecords = synced + pending + failed + notFound
  const unrecordedPending = Math.max(0, totalOperators - totalWithRecords)

  return {
    totalOperators,
    logosSynced: synced,
    logosPending: pending + unrecordedPending,
    logosFailed: failed,
    logosNotFound: notFound,
    lastSyncTime,
  }
}

/**
 * Get map of system_operator_id -> logo_url for active logos
 */
export async function getActiveLogosMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  let offset = 0
  while (true) {
    const res = await supabaseRest(
      `operator_logos?logo_status=eq.FOUND&select=system_operator_id,logo_url&limit=1000&offset=${offset}`,
      { cache: 'no-store' }
    ).catch(() => null)
    if (!res || !res.ok) break
    const rows = (await res.json().catch(() => [])) as Array<{ system_operator_id: string; logo_url?: string }>
    if (!Array.isArray(rows) || !rows.length) break
    for (const r of rows) {
      if (r.system_operator_id && r.logo_url) {
        map.set(r.system_operator_id, r.logo_url)
      }
    }
    if (rows.length < 1000) break
    offset += rows.length
  }
  return map
}
