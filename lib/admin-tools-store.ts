'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AdScheduleType = 'immediate' | 'scheduled'
export type AdStatus = 'draft' | 'published'

export interface AdminAd {
  id: string
  title: string
  imageUrl: string
  ctaUrl: string
  targetCountries: string[]
  scheduleType: AdScheduleType
  startAt?: string
  status: AdStatus
  createdAt: string
  updatedAt: string
}

export interface SupplierBillingRow {
  transactionId: string
  amount: number
  status: string
  date?: string
}

export interface ItuTransactionRow {
  transactionId: string
  amount: number
  status: string
  timestamp?: string
}

export type DiscrepancyType =
  | 'missing_in_platform'
  | 'missing_in_supplier_file'
  | 'amount_mismatch'
  | 'status_mismatch'
  | 'date_mismatch'

export interface ReconciliationDiscrepancy {
  id: string
  type: DiscrepancyType
  supplierTransactionId?: string
  platformTransactionId?: string
  supplierAmount?: number
  platformAmount?: number
  supplierStatus?: string
  platformStatus?: string
  reviewed: boolean
  reviewNote?: string
}

export interface ReconciliationReport {
  id: string
  uploadedAt: string
  month: string
  supplierFileName: string
  ituFileName: string
  totalSupplierRows: number
  totalItuRows: number
  totalProcessed: number
  matchedCount: number
  mismatchedCount: number
  missingInSupplierCount: number
  missingInItuCount: number
  duplicateSupplierCount: number
  duplicateItuCount: number
  comparedRows: {
    transactionId: string
    supplierAmount?: number
    ituAmount?: number
    supplierStatus?: string
    ituStatus?: string
    supplierDate?: string
    ituTimestamp?: string
    result: 'matched' | 'mismatched' | 'missing_in_supplier' | 'missing_in_itu'
    reason?: string
  }[]
  discrepancies: ReconciliationDiscrepancy[]
  // Backward compatibility for existing persisted reports
  fileName?: string
  totalRows?: number
  matchedRows?: number
  discrepancyCount?: number
}

interface AdminToolsState {
  ads: AdminAd[]
  reports: ReconciliationReport[]
  addAd: (ad: Omit<AdminAd, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateAd: (id: string, patch: Partial<Omit<AdminAd, 'id' | 'createdAt'>>) => void
  deleteAd: (id: string) => void
  setAdStatus: (id: string, status: AdStatus) => void
  addReport: (report: Omit<ReconciliationReport, 'id' | 'uploadedAt'>) => void
  reviewDiscrepancy: (reportId: string, discrepancyId: string, reviewNote: string) => void
}

export const useAdminToolsStore = create<AdminToolsState>()(
  persist(
    (set) => ({
      ads: [],
      reports: [],
      addAd: (ad) =>
        set((state) => {
          const now = new Date().toISOString()
          const next: AdminAd = {
            ...ad,
            id: `ad-${Date.now()}`,
            createdAt: now,
            updatedAt: now,
          }
          return { ads: [next, ...state.ads] }
        }),
      updateAd: (id, patch) =>
        set((state) => ({
          ads: state.ads.map((ad) =>
            ad.id === id ? { ...ad, ...patch, updatedAt: new Date().toISOString() } : ad,
          ),
        })),
      deleteAd: (id) =>
        set((state) => ({
          ads: state.ads.filter((ad) => ad.id !== id),
        })),
      setAdStatus: (id, status) =>
        set((state) => ({
          ads: state.ads.map((ad) =>
            ad.id === id ? { ...ad, status, updatedAt: new Date().toISOString() } : ad,
          ),
        })),
      addReport: (report) =>
        set((state) => ({
          reports: [
            {
              ...report,
              id: `recon-${Date.now()}`,
              uploadedAt: new Date().toISOString(),
            },
            ...state.reports,
          ],
        })),
      reviewDiscrepancy: (reportId, discrepancyId, reviewNote) =>
        set((state) => ({
          reports: state.reports.map((report) => {
            if (report.id !== reportId) return report
            return {
              ...report,
              discrepancies: report.discrepancies.map((d) =>
                d.id === discrepancyId ? { ...d, reviewed: true, reviewNote } : d,
              ),
            }
          }),
        })),
    }),
    { name: 'admin-tools-storage' },
  ),
)

export function isAdLive(ad: AdminAd, now = new Date()): boolean {
  if (ad.status !== 'published') return false
  if (ad.scheduleType === 'immediate') return true
  if (!ad.startAt) return false
  return new Date(ad.startAt).getTime() <= now.getTime()
}
