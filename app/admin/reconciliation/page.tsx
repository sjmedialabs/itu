'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CheckCircle2, Download, FileSpreadsheet, Loader2, TriangleAlert, UploadCloud } from 'lucide-react'
import {
  useAdminToolsStore,
  type ItuTransactionRow,
  type ReconciliationDiscrepancy,
  type ReconciliationReport,
  type SupplierBillingRow,
} from '@/lib/admin-tools-store'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const MAX_RECOMMENDED_ROWS = 100000

function normalizeStatus(value: string) {
  return value.trim().toLowerCase()
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let cell = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    const next = text[i + 1]

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === ',' && !inQuotes) {
      row.push(cell.trim())
      cell = ''
      continue
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1
      row.push(cell.trim())
      if (row.some((x) => x.length > 0)) rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += ch
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim())
    if (row.some((x) => x.length > 0)) rows.push(row)
  }

  return rows
}

function requireColumn(headers: string[], aliases: string[], label: string) {
  const idx = headers.findIndex((h) => aliases.includes(h))
  if (idx < 0) throw new Error(`Missing required column: ${label}`)
  return idx
}

function parseAmount(value: string, label: string, line: number) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) throw new Error(`Invalid amount in ${label} CSV at line ${line}`)
  return amount
}

function parseSupplierCsv(text: string): SupplierBillingRow[] {
  const rows = parseCsv(text)
  if (rows.length < 2) throw new Error('Supplier CSV must include headers and at least one row')
  const headers = rows[0]!.map(normalizeHeader)

  const idxTxn = requireColumn(
    headers,
    ['transactionid', 'reference', 'suppliertransactionid', 'supplierref', 'supplierid', 'platformtransactionid'],
    'transaction/reference',
  )
  const idxAmount = requireColumn(headers, ['amount'], 'amount')
  const idxStatus = requireColumn(headers, ['status'], 'status')
  const idxDate = headers.findIndex((h) => ['date', 'transactiondate', 'billdate', 'createdat'].includes(h))

  return rows.slice(1).map((parts, i) => {
    const line = i + 2
    const transactionId = (parts[idxTxn] ?? '').trim()
    if (!transactionId) throw new Error(`Missing transaction id in supplier CSV at line ${line}`)
    return {
      transactionId,
      amount: parseAmount(parts[idxAmount] ?? '', 'supplier', line),
      status: (parts[idxStatus] ?? '').trim(),
      date: idxDate >= 0 ? (parts[idxDate] ?? '').trim() : undefined,
    }
  })
}

function parseItuCsv(text: string): ItuTransactionRow[] {
  const rows = parseCsv(text)
  if (rows.length < 2) throw new Error('ITU CSV must include headers and at least one row')
  const headers = rows[0]!.map(normalizeHeader)

  const idxTxn = requireColumn(headers, ['transactionid', 'reference', 'orderid', 'platformtransactionid'], 'transaction_id')
  const idxAmount = requireColumn(headers, ['amount'], 'amount')
  const idxStatus = requireColumn(headers, ['status'], 'status')
  const idxTimestamp = headers.findIndex((h) => ['timestamp', 'date', 'createdat', 'processedat'].includes(h))

  return rows.slice(1).map((parts, i) => {
    const line = i + 2
    const transactionId = (parts[idxTxn] ?? '').trim()
    if (!transactionId) throw new Error(`Missing transaction id in ITU CSV at line ${line}`)
    return {
      transactionId,
      amount: parseAmount(parts[idxAmount] ?? '', 'ITU', line),
      status: (parts[idxStatus] ?? '').trim(),
      timestamp: idxTimestamp >= 0 ? (parts[idxTimestamp] ?? '').trim() : undefined,
    }
  })
}

function parseDateValue(value?: string) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function isDateClose(a?: string, b?: string, toleranceMs = ONE_DAY_MS) {
  const left = parseDateValue(a)
  const right = parseDateValue(b)
  if (!left || !right) return true
  return Math.abs(left.getTime() - right.getTime()) <= toleranceMs
}

function discrepancyLabel(type: ReconciliationDiscrepancy['type']) {
  switch (type) {
    case 'missing_in_platform':
      return 'Missing in ITU'
    case 'missing_in_supplier_file':
      return 'Missing in Supplier'
    case 'amount_mismatch':
      return 'Amount mismatch'
    case 'status_mismatch':
      return 'Status mismatch'
    case 'date_mismatch':
      return 'Date mismatch'
    default:
      return type
  }
}

function resultBadgeClass(result: ReconciliationReport['comparedRows'][number]['result']) {
  switch (result) {
    case 'matched':
      return 'border-green-200 bg-green-50 text-green-700'
    case 'mismatched':
      return 'border-red-200 bg-red-50 text-red-700'
    case 'missing_in_supplier':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'missing_in_itu':
      return 'border-orange-200 bg-orange-50 text-orange-700'
    default:
      return ''
  }
}

function resultLabel(result: ReconciliationReport['comparedRows'][number]['result']) {
  switch (result) {
    case 'matched':
      return 'Match'
    case 'mismatched':
      return 'Mismatch'
    case 'missing_in_supplier':
      return 'Missing in Supplier'
    case 'missing_in_itu':
      return 'Missing in ITU'
    default:
      return result
  }
}

export default function AdminReconciliationPage() {
  const reports = useAdminToolsStore((s) => s.reports)
  const addReport = useAdminToolsStore((s) => s.addReport)
  const reviewDiscrepancy = useAdminToolsStore((s) => s.reviewDiscrepancy)

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [supplierFileName, setSupplierFileName] = useState('')
  const [supplierCsvText, setSupplierCsvText] = useState('')
  const [ituFileName, setItuFileName] = useState('')
  const [ituCsvText, setItuCsvText] = useState('')
  const [processing, setProcessing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<{ reportId: string; discrepancyId: string } | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  const latest = reports[0]
  const selectedReport = useMemo(() => {
    if (!selectedReportId) return latest
    return reports.find((r) => r.id === selectedReportId) ?? latest
  }, [selectedReportId, reports, latest])
  const unresolved = useMemo(
    () => selectedReport?.discrepancies.filter((d) => !d.reviewed) ?? [],
    [selectedReport],
  )
  const selectedComparedRows = selectedReport?.comparedRows ?? []
  const selectedDiscrepancies = selectedReport?.discrepancies ?? []

  async function readCsvFile(file: File | undefined, type: 'supplier' | 'itu') {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Only CSV files are supported')
      return
    }
    const text = await file.text()
    if (type === 'supplier') {
      setSupplierFileName(file.name)
      setSupplierCsvText(text)
    } else {
      setItuFileName(file.name)
      setItuCsvText(text)
    }
    toast.success(`${type === 'supplier' ? 'Supplier' : 'ITU'} CSV uploaded`)
  }

  function buildReportRows(report: ReconciliationReport) {
    return report.comparedRows.map((row) => ({
      TransactionId: row.transactionId,
      SupplierAmount: row.supplierAmount ?? '',
      ITUAmount: row.ituAmount ?? '',
      SupplierStatus: row.supplierStatus ?? '',
      ITUStatus: row.ituStatus ?? '',
      SupplierDate: row.supplierDate ?? '',
      ITUTimestamp: row.ituTimestamp ?? '',
      Result: resultLabel(row.result),
      Reason: row.reason ?? '',
    }))
  }

  async function downloadReport(format: 'csv' | 'xlsx') {
    if (!selectedReport) {
      toast.error('No reconciliation report found')
      return
    }

    try {
      setExporting(true)
      const safeMonth = selectedReport.month.replace('-', '_')
      const fileBase = `reconciliation_${safeMonth}_${selectedReport.id}`
      const summaryRows = [
        ['Month', selectedReport.month],
        ['Supplier File', selectedReport.supplierFileName],
        ['ITU File', selectedReport.ituFileName],
        ['Total Processed', String(selectedReport.totalProcessed)],
        ['Matched', String(selectedReport.matchedCount)],
        ['Mismatched', String(selectedReport.mismatchedCount)],
        ['Missing in Supplier', String(selectedReport.missingInSupplierCount)],
        ['Missing in ITU', String(selectedReport.missingInItuCount)],
      ]
      const detailRows = buildReportRows(selectedReport)

      if (format === 'csv') {
        const summaryCsv = summaryRows
          .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(','))
          .join('\n')

        const headers = Object.keys(detailRows[0] ?? {
          TransactionId: '',
          SupplierAmount: '',
          ITUAmount: '',
          SupplierStatus: '',
          ITUStatus: '',
          SupplierDate: '',
          ITUTimestamp: '',
          Result: '',
          Reason: '',
        })

        const detailCsv = [
          headers.join(','),
          ...detailRows.map((r) =>
            headers.map((h) => `"${String((r as Record<string, unknown>)[h] ?? '').replaceAll('"', '""')}"`).join(','),
          ),
        ].join('\n')

        const csv = [`"Reconciliation Summary"`, summaryCsv, '', `"Reconciliation Details"`, detailCsv].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${fileBase}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const XLSX = await import('xlsx')
        const wb = XLSX.utils.book_new()
        const summarySheet = XLSX.utils.aoa_to_sheet([['Metric', 'Value'], ...summaryRows])
        const detailSheet = XLSX.utils.json_to_sheet(detailRows)
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')
        XLSX.utils.book_append_sheet(wb, detailSheet, 'Details')
        XLSX.writeFile(wb, `${fileBase}.xlsx`)
      }

      toast.success(`Downloaded ${format.toUpperCase()} report`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  async function runReconciliation() {
    if (!month) {
      toast.error('Month selection is required')
      return
    }
    if (!supplierCsvText.trim() || !ituCsvText.trim()) {
      toast.error('Please upload both supplier and ITU CSV files')
      return
    }

    setProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 0))

    try {
      const supplierRows = parseSupplierCsv(supplierCsvText)
      const ituRows = parseItuCsv(ituCsvText)

      if (supplierRows.length === 0 || ituRows.length === 0) {
        toast.error('Both CSV files must contain at least one data row')
        return
      }

      if (supplierRows.length > MAX_RECOMMENDED_ROWS || ituRows.length > MAX_RECOMMENDED_ROWS) {
        toast.warning('Large file detected. Processing may take a few seconds.')
      }

      const supplierGrouped = new Map<string, SupplierBillingRow[]>()
      supplierRows.forEach((row) => {
        const list = supplierGrouped.get(row.transactionId) ?? []
        list.push(row)
        supplierGrouped.set(row.transactionId, list)
      })

      const ituGrouped = new Map<string, ItuTransactionRow[]>()
      ituRows.forEach((row) => {
        const list = ituGrouped.get(row.transactionId) ?? []
        list.push(row)
        ituGrouped.set(row.transactionId, list)
      })

      const supplierMap = new Map<string, SupplierBillingRow>()
      supplierGrouped.forEach((rows, id) => supplierMap.set(id, rows[0]!))
      const ituMap = new Map<string, ItuTransactionRow>()
      ituGrouped.forEach((rows, id) => ituMap.set(id, rows[0]!))

      const duplicateSupplierCount = Array.from(supplierGrouped.values()).reduce(
        (sum, items) => sum + Math.max(0, items.length - 1),
        0,
      )
      const duplicateItuCount = Array.from(ituGrouped.values()).reduce(
        (sum, items) => sum + Math.max(0, items.length - 1),
        0,
      )

      const allIds = new Set<string>([...supplierMap.keys(), ...ituMap.keys()])
      const comparedRows: ReconciliationReport['comparedRows'] = []
      const discrepancies: ReconciliationDiscrepancy[] = []

      let matchedCount = 0
      let mismatchedCount = 0
      let missingInSupplierCount = 0
      let missingInItuCount = 0

      Array.from(allIds)
        .sort()
        .forEach((transactionId, idx) => {
          const supplier = supplierMap.get(transactionId)
          const itu = ituMap.get(transactionId)

          if (supplier && itu) {
            const amountMismatch = Math.abs(supplier.amount - itu.amount) > 0.001
            const statusMismatch = normalizeStatus(supplier.status) !== normalizeStatus(itu.status)
            const dateMismatch = !isDateClose(supplier.date, itu.timestamp)
            const reasons: string[] = []
            if (amountMismatch) reasons.push('amount mismatch')
            if (statusMismatch) reasons.push('status mismatch')
            if (dateMismatch) reasons.push('date mismatch')

            if (reasons.length === 0) {
              matchedCount += 1
              comparedRows.push({
                transactionId,
                supplierAmount: supplier.amount,
                ituAmount: itu.amount,
                supplierStatus: supplier.status,
                ituStatus: itu.status,
                supplierDate: supplier.date,
                ituTimestamp: itu.timestamp,
                result: 'matched',
              })
              return
            }

            mismatchedCount += 1
            comparedRows.push({
              transactionId,
              supplierAmount: supplier.amount,
              ituAmount: itu.amount,
              supplierStatus: supplier.status,
              ituStatus: itu.status,
              supplierDate: supplier.date,
              ituTimestamp: itu.timestamp,
              result: 'mismatched',
              reason: reasons.join(', '),
            })

            if (amountMismatch) {
              discrepancies.push({
                id: `d-${Date.now()}-${idx}-amount`,
                type: 'amount_mismatch',
                supplierTransactionId: supplier.transactionId,
                platformTransactionId: itu.transactionId,
                supplierAmount: supplier.amount,
                platformAmount: itu.amount,
                supplierStatus: supplier.status,
                platformStatus: itu.status,
                reviewed: false,
              })
            }
            if (statusMismatch) {
              discrepancies.push({
                id: `d-${Date.now()}-${idx}-status`,
                type: 'status_mismatch',
                supplierTransactionId: supplier.transactionId,
                platformTransactionId: itu.transactionId,
                supplierAmount: supplier.amount,
                platformAmount: itu.amount,
                supplierStatus: supplier.status,
                platformStatus: itu.status,
                reviewed: false,
              })
            }
            if (dateMismatch) {
              discrepancies.push({
                id: `d-${Date.now()}-${idx}-date`,
                type: 'date_mismatch',
                supplierTransactionId: supplier.transactionId,
                platformTransactionId: itu.transactionId,
                supplierAmount: supplier.amount,
                platformAmount: itu.amount,
                supplierStatus: supplier.status,
                platformStatus: itu.status,
                reviewed: false,
              })
            }
            return
          }

          if (supplier && !itu) {
            missingInItuCount += 1
            comparedRows.push({
              transactionId,
              supplierAmount: supplier.amount,
              supplierStatus: supplier.status,
              supplierDate: supplier.date,
              result: 'missing_in_itu',
              reason: 'present in supplier file only',
            })
            discrepancies.push({
              id: `d-${Date.now()}-${idx}-miss-itu`,
              type: 'missing_in_platform',
              supplierTransactionId: supplier.transactionId,
              supplierAmount: supplier.amount,
              supplierStatus: supplier.status,
              reviewed: false,
            })
            return
          }

          if (!supplier && itu) {
            missingInSupplierCount += 1
            comparedRows.push({
              transactionId,
              ituAmount: itu.amount,
              ituStatus: itu.status,
              ituTimestamp: itu.timestamp,
              result: 'missing_in_supplier',
              reason: 'present in ITU file only',
            })
            discrepancies.push({
              id: `d-${Date.now()}-${idx}-miss-supplier`,
              type: 'missing_in_supplier_file',
              platformTransactionId: itu.transactionId,
              platformAmount: itu.amount,
              platformStatus: itu.status,
              reviewed: false,
            })
          }
        })

      addReport({
        month,
        supplierFileName: supplierFileName || 'supplier.csv',
        ituFileName: ituFileName || 'itu-transactions.csv',
        totalSupplierRows: supplierRows.length,
        totalItuRows: ituRows.length,
        totalProcessed: allIds.size,
        matchedCount,
        mismatchedCount,
        missingInSupplierCount,
        missingInItuCount,
        duplicateSupplierCount,
        duplicateItuCount,
        comparedRows,
        discrepancies,
        // Backward-compatible fields consumed by old reports (if needed)
        fileName: supplierFileName || 'supplier.csv',
        totalRows: supplierRows.length,
        matchedRows: matchedCount,
        discrepancyCount: discrepancies.length,
      })

      setSelectedReportId(null)
      toast.success('Reconciliation report generated')
      if (duplicateSupplierCount > 0 || duplicateItuCount > 0) {
        toast.warning(
          `Duplicates detected - Supplier: ${duplicateSupplierCount}, ITU: ${duplicateItuCount}. First occurrence used.`,
        )
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process reconciliation')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Supplier Reconciliation</h1>
        <p className="text-muted-foreground">
          Upload supplier and ITU CSVs, compare records by month, and download reconciliation reports.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Setup</CardTitle>
          <CardDescription>
            Select month, upload both required CSV files, then run reconciliation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="recon-month">Month</Label>
            <Input id="recon-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} required />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="supplier-file">Supplier Bill CSV</Label>
              <Input
                id="supplier-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => void readCsvFile(e.target.files?.[0], 'supplier')}
              />
              <p className="text-xs text-muted-foreground">
                Required columns: transaction_id/reference, amount, status, date (optional)
              </p>
              {supplierFileName ? (
                <Badge variant="outline" className="w-fit border-green-200 bg-green-50 text-green-700">
                  Uploaded: {supplierFileName}
                </Badge>
              ) : (
                <Badge variant="outline" className="w-fit">
                  Not uploaded
                </Badge>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="itu-file">ITU Transactions CSV</Label>
              <Input
                id="itu-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => void readCsvFile(e.target.files?.[0], 'itu')}
              />
              <p className="text-xs text-muted-foreground">
                Required columns: transaction_id, amount, status, timestamp (optional)
              </p>
              {ituFileName ? (
                <Badge variant="outline" className="w-fit border-green-200 bg-green-50 text-green-700">
                  Uploaded: {ituFileName}
                </Badge>
              ) : (
                <Badge variant="outline" className="w-fit">
                  Not uploaded
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button className="gap-2" onClick={() => void runReconciliation()} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Run Reconciliation
            </Button>
            <span className="text-xs text-muted-foreground">
              Both files are mandatory. Processing starts instantly after click.
            </span>
          </div>
        </CardContent>
      </Card>

      {reports.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Previous Reconciliation History</CardTitle>
            <CardDescription>Select a previous report to inspect details.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Supplier File</TableHead>
                    <TableHead>ITU File</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Mismatched</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{report.month || '—'}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{report.supplierFileName || report.fileName || '—'}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{report.ituFileName || '—'}</TableCell>
                      <TableCell>{report.totalProcessed ?? report.totalRows ?? 0}</TableCell>
                      <TableCell>{report.mismatchedCount ?? report.discrepancyCount ?? 0}</TableCell>
                      <TableCell>{format(new Date(report.uploadedAt), 'yyyy-MM-dd HH:mm')}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={selectedReport?.id === report.id ? 'default' : 'outline'}
                          onClick={() => setSelectedReportId(report.id)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No reconciliation history yet. Upload both CSV files and run reconciliation.
          </CardContent>
        </Card>
      )}

      {selectedReport ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Processed</CardDescription>
                <CardTitle>{selectedReport.totalProcessed ?? selectedReport.totalRows ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Matched</CardDescription>
                <CardTitle className="text-green-600">{selectedReport.matchedCount ?? selectedReport.matchedRows ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Mismatched</CardDescription>
                <CardTitle className="text-red-600">{selectedReport.mismatchedCount ?? selectedReport.discrepancyCount ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Missing in Supplier</CardDescription>
                <CardTitle className="text-amber-600">{selectedReport.missingInSupplierCount ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Missing in ITU</CardDescription>
                <CardTitle className="text-orange-600">{selectedReport.missingInItuCount ?? 0}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Reconciliation Details
              </CardTitle>
              <CardDescription>
                Compared by transaction ID with amount/status validation and optional date tolerance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => void downloadReport('csv')}
                  disabled={exporting}
                >
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download Report (CSV)
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => void downloadReport('xlsx')}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4" />
                  Download Report (Excel)
                </Button>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Supplier Amount</TableHead>
                      <TableHead>ITU Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedComparedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          No records available for this report.
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedComparedRows.map((row) => (
                        <TableRow key={`${selectedReport.id}-${row.transactionId}`}>
                          <TableCell className="font-mono text-xs">{row.transactionId}</TableCell>
                          <TableCell>{row.supplierAmount ?? '—'}</TableCell>
                          <TableCell>{row.ituAmount ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={resultBadgeClass(row.result)}>
                              {resultLabel(row.result)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.reason ?? '—'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Discrepancy Review</CardTitle>
              <CardDescription>Manually review mismatches and missing records when needed.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Supplier Txn</TableHead>
                    <TableHead>ITU Txn</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDiscrepancies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          No discrepancies found.
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedDiscrepancies.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              d.reviewed
                                ? 'border-green-200 bg-green-50 text-green-700'
                                : 'border-red-200 bg-red-50 text-red-700'
                            }
                          >
                            {d.reviewed ? 'Reviewed' : discrepancyLabel(d.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{d.supplierTransactionId ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{d.platformTransactionId ?? '—'}</TableCell>
                        <TableCell className="text-sm">
                          <p>S: {d.supplierAmount ?? '—'}</p>
                          <p>I: {d.platformAmount ?? '—'}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          <p>S: {d.supplierStatus ?? '—'}</p>
                          <p>I: {d.platformStatus ?? '—'}</p>
                        </TableCell>
                        <TableCell>
                          {d.reviewed ? (
                            <p className="text-xs text-muted-foreground">{d.reviewNote || 'Reviewed'}</p>
                          ) : (
                            <Dialog
                              open={
                                reviewing?.reportId === selectedReport.id &&
                                reviewing?.discrepancyId === d.id
                              }
                              onOpenChange={(isOpen) => {
                                if (!isOpen) {
                                  setReviewing(null)
                                  setReviewNote('')
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => setReviewing({ reportId: selectedReport.id, discrepancyId: d.id })}
                                >
                                  <TriangleAlert className="h-3.5 w-3.5" />
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Manual discrepancy review</DialogTitle>
                                  <DialogDescription>
                                    Add a note to mark this discrepancy as reviewed.
                                  </DialogDescription>
                                </DialogHeader>
                                <Textarea
                                  value={reviewNote}
                                  onChange={(e) => setReviewNote(e.target.value)}
                                  rows={4}
                                  placeholder="Explain why this discrepancy is acceptable or how it was resolved."
                                />
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setReviewing(null)
                                      setReviewNote('')
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      reviewDiscrepancy(selectedReport.id, d.id, reviewNote.trim())
                                      setReviewing(null)
                                      setReviewNote('')
                                      toast.success('Discrepancy marked as reviewed')
                                    }}
                                  >
                                    Save Review
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {(selectedReport.duplicateSupplierCount ?? 0) > 0 || (selectedReport.duplicateItuCount ?? 0) > 0 ? (
            <p className="text-sm text-muted-foreground">
              Duplicate IDs detected - Supplier: {selectedReport.duplicateSupplierCount ?? 0}, ITU: {selectedReport.duplicateItuCount ?? 0}
            </p>
          ) : null}

          {unresolved.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Pending review: <span className="font-semibold text-foreground">{unresolved.length}</span>
            </p>
          )}
        </>
      ) : null}
    </div>
  )
}
