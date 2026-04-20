'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Loader2,
  FileSpreadsheet,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { mockCountries, mockRechargeOrders, mockUsers } from '@/lib/mock-data'
import { useAuthStore } from '@/lib/stores'

type ReportType =
  | 'transactions'
  | 'country'
  | 'network'
  | 'api'
  | 'failed'
  | 'drilldown'

type QuickRange = 'today' | '7d' | 'thisMonth' | 'lastMonth' | 'custom'

type DrillSelection = {
  dimension: 'destination' | 'network' | 'status' | 'reason' | null
  value: string
}

type OrderView = {
  id: string
  createdAt: string
  destinationCountry: string
  originCountry: string
  network: string
  operator: string
  status: string
  amount: number
  responseMs: number
  failureReason: string
}

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10)
}

function applyQuickRange(range: QuickRange) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(today)
  let start = new Date(today)

  if (range === '7d') {
    start.setDate(start.getDate() - 6)
  } else if (range === 'thisMonth') {
    start = new Date(today.getFullYear(), today.getMonth(), 1)
  } else if (range === 'lastMonth') {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    end.setTime(new Date(today.getFullYear(), today.getMonth(), 0).getTime())
  }

  return { startDate: toDateInputValue(start), endDate: toDateInputValue(end) }
}

function statusTone(status: string) {
  if (status === 'completed') return 'border-green-200 bg-green-50 text-green-700'
  if (status === 'failed' || status === 'refunded') return 'border-red-200 bg-red-50 text-red-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatReportDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(value))
}

function failureReasonFor(status: string, errorMessage?: string) {
  if (status === 'failed') return errorMessage || 'Provider unavailable'
  if (status === 'refunded') return 'Refunded after failure'
  return '—'
}

const PIE_COLORS = ['#16a34a', '#dc2626', '#f59e0b', '#2563eb', '#7c3aed', '#0d9488']

export default function AdminReportsPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  const [reportType, setReportType] = useState<ReportType>('transactions')
  const [quickRange, setQuickRange] = useState<QuickRange>('thisMonth')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [originFilter, setOriginFilter] = useState('all')
  const [destinationFilter, setDestinationFilter] = useState('all')
  const [networkFilter, setNetworkFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<keyof OrderView>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [drill, setDrill] = useState<DrillSelection>({ dimension: null, value: '' })
  const [expandedCountries, setExpandedCountries] = useState<string[]>([])
  const [expandedNetworks, setExpandedNetworks] = useState<string[]>([])

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Admins only')
      router.replace('/account')
    }
  }, [user, router])

  useEffect(() => {
    const range = applyQuickRange(quickRange)
    setStartDate(range.startDate)
    setEndDate(range.endDate)
  }, [quickRange])

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => setLoading(false), 260)
    return () => clearTimeout(timer)
  }, [reportType, startDate, endDate, originFilter, destinationFilter, networkFilter, statusFilter])

  const orderViews = useMemo<OrderView[]>(() => {
    const usersById = new Map(mockUsers.map((x) => [x.id, x]))
    const countriesByCode = new Map(mockCountries.map((x) => [x.code, x.name]))
    return mockRechargeOrders.map((order, idx) => {
      const userOriginCode = usersById.get(order.userId)?.countryCode || ''
      const originCountry = countriesByCode.get(userOriginCode) || 'Unknown'
      const responseMs = 220 + ((idx * 157 + order.id.length * 31) % 730)
      return {
        id: order.id,
        createdAt: order.createdAt,
        destinationCountry: order.countryName,
        originCountry,
        network: order.providerName,
        operator: order.providerName,
        status: order.status,
        amount: order.senderAmount,
        responseMs,
        failureReason: failureReasonFor(order.status, order.errorMessage),
      }
    })
  }, [])

  const filtered = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null

    return orderViews.filter((row) => {
      const d = new Date(row.createdAt)
      if (start && d < start) return false
      if (end && d > end) return false
      if (originFilter !== 'all' && row.originCountry !== originFilter) return false
      if (destinationFilter !== 'all' && row.destinationCountry !== destinationFilter) return false
      if (networkFilter !== 'all' && row.network !== networkFilter) return false
      if (statusFilter !== 'all' && row.status !== statusFilter) return false

      if (drill.dimension === 'destination' && row.destinationCountry !== drill.value) return false
      if (drill.dimension === 'network' && row.network !== drill.value) return false
      if (drill.dimension === 'status' && row.status !== drill.value) return false
      if (drill.dimension === 'reason' && row.failureReason !== drill.value) return false
      return true
    })
  }, [orderViews, startDate, endDate, originFilter, destinationFilter, networkFilter, statusFilter, drill])

  const stats = useMemo(() => {
    const total = filtered.length
    const success = filtered.filter((x) => x.status === 'completed').length
    const failed = filtered.filter((x) => x.status === 'failed' || x.status === 'refunded').length
    const revenue = filtered
      .filter((x) => x.status === 'completed')
      .reduce((sum, x) => sum + x.amount, 0)
    const successRate = total === 0 ? 0 : (success / total) * 100
    const failureRate = total === 0 ? 0 : (failed / total) * 100
    return { total, successRate, failureRate, revenue }
  }, [filtered])

  const trendData = useMemo(() => {
    const byDay = new Map<string, { day: string; total: number; success: number; failed: number; revenue: number }>()
    filtered.forEach((row) => {
      const day = row.createdAt.slice(0, 10)
      if (!byDay.has(day)) byDay.set(day, { day, total: 0, success: 0, failed: 0, revenue: 0 })
      const item = byDay.get(day)!
      item.total += 1
      if (row.status === 'completed') {
        item.success += 1
        item.revenue += row.amount
      }
      if (row.status === 'failed' || row.status === 'refunded') item.failed += 1
    })
    return [...byDay.values()].sort((a, b) => (a.day > b.day ? 1 : -1))
  }, [filtered])

  const comparisonData = useMemo(() => {
    if (reportType === 'transactions') {
      const byStatus = new Map<string, number>()
      filtered.forEach((row) => byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1))
      return [...byStatus.entries()].map(([name, value]) => ({ name, value }))
    }

    if (reportType === 'country' || reportType === 'drilldown') {
      const byCountry = new Map<string, { name: string; volume: number; success: number; failed: number }>()
      filtered.forEach((row) => {
        if (!byCountry.has(row.destinationCountry)) {
          byCountry.set(row.destinationCountry, {
            name: row.destinationCountry,
            volume: 0,
            success: 0,
            failed: 0,
          })
        }
        const c = byCountry.get(row.destinationCountry)!
        c.volume += row.amount
        if (row.status === 'completed') c.success += 1
        if (row.status === 'failed' || row.status === 'refunded') c.failed += 1
      })
      return [...byCountry.values()]
        .map((x) => ({
          name: x.name,
          value: x.volume,
          successRate: x.success + x.failed === 0 ? 0 : (x.success / (x.success + x.failed)) * 100,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    }

    if (reportType === 'network' || reportType === 'api') {
      const byNetwork = new Map<string, { name: string; count: number; success: number; failed: number; response: number }>()
      filtered.forEach((row) => {
        if (!byNetwork.has(row.network)) {
          byNetwork.set(row.network, {
            name: row.network,
            count: 0,
            success: 0,
            failed: 0,
            response: 0,
          })
        }
        const n = byNetwork.get(row.network)!
        n.count += 1
        n.response += row.responseMs
        if (row.status === 'completed') n.success += 1
        if (row.status === 'failed' || row.status === 'refunded') n.failed += 1
      })
      return [...byNetwork.values()].map((x) => ({
        name: x.name,
        value: reportType === 'api' ? Math.round(x.response / Math.max(x.count, 1)) : x.count,
        successRate: x.count === 0 ? 0 : (x.success / x.count) * 100,
      }))
    }

    const byReason = new Map<string, number>()
    filtered
      .filter((x) => x.failureReason !== '—')
      .forEach((x) => byReason.set(x.failureReason, (byReason.get(x.failureReason) ?? 0) + 1))
    return [...byReason.entries()].map(([name, value]) => ({ name, value }))
  }, [filtered, reportType])

  const pieData = useMemo(() => {
    if (reportType === 'failed') {
      return comparisonData
    }
    const statuses = ['completed', 'failed', 'processing', 'pending', 'refunded']
    return statuses
      .map((status) => ({
        name: status,
        value: filtered.filter((x) => x.status === status).length,
      }))
      .filter((x) => x.value > 0)
  }, [comparisonData, filtered, reportType])

  const reportRows = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal === bVal) return 0
      const dir = sortDir === 'asc' ? 1 : -1
      return aVal > bVal ? dir : -dir
    })
  }, [filtered, sortKey, sortDir])

  const pageSize = 10
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return reportRows.slice(start, start + pageSize)
  }, [reportRows, page])
  const pageCount = Math.max(1, Math.ceil(reportRows.length / pageSize))

  useEffect(() => {
    setPage(1)
  }, [reportType, startDate, endDate, originFilter, destinationFilter, networkFilter, statusFilter, drill])

  const drillTree = useMemo(() => {
    const countries = new Map<
      string,
      {
        rows: OrderView[]
        networks: Map<string, { rows: OrderView[]; operators: Map<string, OrderView[]> }>
      }
    >()
    filtered.forEach((row) => {
      if (!countries.has(row.destinationCountry)) {
        countries.set(row.destinationCountry, { rows: [], networks: new Map() })
      }
      const c = countries.get(row.destinationCountry)!
      c.rows.push(row)
      if (!c.networks.has(row.network)) {
        c.networks.set(row.network, { rows: [], operators: new Map() })
      }
      const n = c.networks.get(row.network)!
      n.rows.push(row)
      if (!n.operators.has(row.operator)) n.operators.set(row.operator, [])
      n.operators.get(row.operator)!.push(row)
    })
    return countries
  }, [filtered])

  function toggleSort(key: keyof OrderView) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function buildExportRows() {
    if (reportType === 'drilldown') {
      return filtered.map((x) => ({
        Date: x.createdAt,
        DestinationCountry: x.destinationCountry,
        Network: x.network,
        Operator: x.operator,
        TransactionId: x.id,
        Status: x.status,
        Amount: x.amount,
      }))
    }
    return reportRows.map((x) => ({
      Date: x.createdAt,
      OriginCountry: x.originCountry,
      DestinationCountry: x.destinationCountry,
      Network: x.network,
      Status: x.status,
      Amount: x.amount,
      ResponseMs: x.responseMs,
      FailureReason: x.failureReason,
      TransactionId: x.id,
    }))
  }

  async function handleExport(format: 'csv' | 'xlsx' | 'pdf') {
    try {
      const rows = buildExportRows()
      if (rows.length === 0) {
        toast.error('No data to export')
        return
      }
      setExporting(true)
      const fileBase = `reports_${reportType}_${startDate}_${endDate}`

      if (format === 'csv') {
        const headers = Object.keys(rows[0]!)
        const csv = [
          headers.join(','),
          ...rows.map((r) =>
            headers.map((h) => `"${String((r as Record<string, unknown>)[h] ?? '').replaceAll('"', '""')}"`).join(','),
          ),
        ].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${fileBase}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else if (format === 'xlsx') {
        const XLSX = await import('xlsx')
        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Report')
        XLSX.writeFile(wb, `${fileBase}.xlsx`)
      } else {
        const columns = Object.keys(rows[0]!)
        const tableHead = `<tr>${columns.map((c) => `<th>${c}</th>`).join('')}</tr>`
        const tableBody = rows
          .map(
            (r) =>
              `<tr>${columns
                .map((c) => `<td>${String((r as Record<string, unknown>)[c] ?? '')}</td>`)
                .join('')}</tr>`,
          )
          .join('')

        const html = `
          <html>
            <head>
              <title>${fileBase}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 16px; }
                h1 { font-size: 16px; margin-bottom: 4px; }
                p { font-size: 12px; color: #555; margin-top: 0; }
                table { border-collapse: collapse; width: 100%; font-size: 11px; }
                th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                th { background: #f5f5f5; }
              </style>
            </head>
            <body>
              <h1>Reports & Analytics - ${reportType}</h1>
              <p>Range: ${startDate} to ${endDate}</p>
              <table><thead>${tableHead}</thead><tbody>${tableBody}</tbody></table>
            </body>
          </html>`

        const printWindow = window.open('', '_blank')
        if (!printWindow) {
          throw new Error('Please allow popups to export PDF')
        }
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
      }

      toast.success(`Exported ${format.toUpperCase()} successfully`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const filterCountries = useMemo(
    () => [...new Set(orderViews.map((x) => x.destinationCountry))].sort(),
    [orderViews],
  )
  const filterOrigins = useMemo(
    () => [...new Set(orderViews.map((x) => x.originCountry))].sort(),
    [orderViews],
  )
  const filterNetworks = useMemo(
    () => [...new Set(orderViews.map((x) => x.network))].sort(),
    [orderViews],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive reporting with drill-down and exports.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2" disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void handleExport('csv')}>
              <FileText className="mr-2 h-4 w-4" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleExport('xlsx')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleExport('pdf')}>
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Filters</CardTitle>
          <CardDescription>Default is current month. Changing filters refreshes instantly.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2">
            <Label>Report Type</Label>
            <Tabs value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <TabsList className="grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-3">
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="country">Country</TabsTrigger>
                <TabsTrigger value="network">Network</TabsTrigger>
                <TabsTrigger value="api">API Perf</TabsTrigger>
                <TabsTrigger value="failed">Failed</TabsTrigger>
                <TabsTrigger value="drilldown">Drill-down</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid gap-2">
            <Label>Quick Range</Label>
            <Select value={quickRange} onValueChange={(v) => setQuickRange(v as QuickRange)}>
              <SelectTrigger>
                <CalendarDays className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setQuickRange('custom')
                setStartDate(e.target.value)
              }}
            />
          </div>

          <div className="grid gap-2">
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setQuickRange('custom')
                setEndDate(e.target.value)
              }}
            />
          </div>

          <div className="grid gap-2">
            <Label>Origin Country</Label>
            <Select value={originFilter} onValueChange={setOriginFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All origins</SelectItem>
                {filterOrigins.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Destination Country</Label>
            <Select value={destinationFilter} onValueChange={setDestinationFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All destinations</SelectItem>
                {filterCountries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Network / Operator</Label>
            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All networks</SelectItem>
                {filterNetworks.map((network) => (
                  <SelectItem key={network} value={network}>
                    {network}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Transaction Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="processing">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="mt-4 h-8 w-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Transactions</CardDescription>
              <CardTitle>{formatNumber(stats.total)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Success Rate</CardDescription>
              <CardTitle className="text-green-600">{stats.successRate.toFixed(1)}%</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Failure Rate</CardDescription>
              <CardTitle className="text-red-600">{stats.failureRate.toFixed(1)}%</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Revenue</CardDescription>
              <CardTitle>{formatMoney(stats.revenue)}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Trend Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {trendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#2563eb" name="Total" />
                  <Line type="monotone" dataKey="success" stroke="#16a34a" name="Success" />
                  <Line type="monotone" dataKey="failed" stroke="#dc2626" name="Failed" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribution</CardTitle>
            <CardDescription>Click a segment to drill into the table</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={105}
                    onClick={(entry) => {
                      if (reportType === 'failed') {
                        setDrill({ dimension: 'reason', value: entry.name })
                      } else {
                        setDrill({ dimension: 'status', value: entry.name })
                      }
                    }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparison</CardTitle>
          <CardDescription>Click bars to filter table instantly</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {comparisonData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill="#2563eb"
                  onClick={(entry) => {
                    if (reportType === 'country' || reportType === 'drilldown') {
                      setDrill({ dimension: 'destination', value: entry.name })
                    } else if (reportType === 'network' || reportType === 'api') {
                      setDrill({ dimension: 'network', value: entry.name })
                    } else if (reportType === 'transactions') {
                      setDrill({ dimension: 'status', value: entry.name })
                    } else {
                      setDrill({ dimension: 'reason', value: entry.name })
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Detailed Table</CardTitle>
            <CardDescription>
              {drill.dimension
                ? `Filtered by ${drill.dimension}: ${drill.value}`
                : 'Sortable, paginated and drill-down aware'}
            </CardDescription>
          </div>
          {drill.dimension && (
            <Button variant="outline" size="sm" onClick={() => setDrill({ dimension: null, value: '' })}>
              Clear Drill-down
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {reportType === 'drilldown' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hierarchy</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...drillTree.entries()].map(([country, countryNode]) => {
                  const cTotal = countryNode.rows.length
                  const cSuccess = countryNode.rows.filter((x) => x.status === 'completed').length
                  const cVolume = countryNode.rows.reduce((sum, x) => sum + x.amount, 0)
                  const cExpanded = expandedCountries.includes(country)
                  return (
                    <>
                      <TableRow key={`c-${country}`}>
                        <TableCell>
                          <button
                            className="inline-flex items-center gap-2 font-semibold"
                            onClick={() =>
                              setExpandedCountries((prev) =>
                                prev.includes(country) ? prev.filter((x) => x !== country) : [...prev, country],
                              )
                            }
                          >
                            {cExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            {country}
                          </button>
                        </TableCell>
                        <TableCell>{cTotal}</TableCell>
                        <TableCell>{cTotal === 0 ? '0%' : `${((cSuccess / cTotal) * 100).toFixed(1)}%`}</TableCell>
                        <TableCell>{formatMoney(cVolume)}</TableCell>
                      </TableRow>
                      {cExpanded &&
                        [...countryNode.networks.entries()].map(([network, networkNode]) => {
                          const nTotal = networkNode.rows.length
                          const nSuccess = networkNode.rows.filter((x) => x.status === 'completed').length
                          const nVolume = networkNode.rows.reduce((sum, x) => sum + x.amount, 0)
                          const networkKey = `${country}|${network}`
                          const nExpanded = expandedNetworks.includes(networkKey)
                          return (
                            <>
                              <TableRow key={`n-${networkKey}`}>
                                <TableCell className="pl-9">
                                  <button
                                    className="inline-flex items-center gap-2 font-medium"
                                    onClick={() =>
                                      setExpandedNetworks((prev) =>
                                        prev.includes(networkKey)
                                          ? prev.filter((x) => x !== networkKey)
                                          : [...prev, networkKey],
                                      )
                                    }
                                  >
                                    {nExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                    {network}
                                  </button>
                                </TableCell>
                                <TableCell>{nTotal}</TableCell>
                                <TableCell>{nTotal === 0 ? '0%' : `${((nSuccess / nTotal) * 100).toFixed(1)}%`}</TableCell>
                                <TableCell>{formatMoney(nVolume)}</TableCell>
                              </TableRow>
                              {nExpanded &&
                                [...networkNode.operators.entries()].map(([operator, txRows]) => {
                                  const oTotal = txRows.length
                                  const oSuccess = txRows.filter((x) => x.status === 'completed').length
                                  const oVolume = txRows.reduce((sum, x) => sum + x.amount, 0)
                                  return (
                                    <>
                                      <TableRow key={`o-${networkKey}-${operator}`}>
                                        <TableCell className="pl-16">{operator}</TableCell>
                                        <TableCell>{oTotal}</TableCell>
                                        <TableCell>
                                          {oTotal === 0 ? '0%' : `${((oSuccess / oTotal) * 100).toFixed(1)}%`}
                                        </TableCell>
                                        <TableCell>{formatMoney(oVolume)}</TableCell>
                                      </TableRow>
                                      {txRows.map((tx) => (
                                        <TableRow key={`t-${tx.id}`}>
                                          <TableCell className="pl-24 font-mono text-xs">{tx.id}</TableCell>
                                          <TableCell>1</TableCell>
                                          <TableCell>
                                            <Badge variant="outline" className={statusTone(tx.status)}>
                                              {tx.status}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>{formatMoney(tx.amount)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </>
                                  )
                                })}
                            </>
                          )
                        })}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          ) : reportRows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No data available for selected filters.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button className="inline-flex items-center gap-1" onClick={() => toggleSort('createdAt')}>
                        Date
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                      </button>
                    </TableHead>
                    <TableHead>Txn ID</TableHead>
                    <TableHead>
                      <button className="inline-flex items-center gap-1" onClick={() => toggleSort('destinationCountry')}>
                        Destination
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                      </button>
                    </TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      <button className="inline-flex items-center gap-1" onClick={() => toggleSort('amount')}>
                        Amount
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Response</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatReportDateTime(row.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{row.id}</TableCell>
                      <TableCell>{row.destinationCountry}</TableCell>
                      <TableCell>{row.network}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusTone(row.status)}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(row.amount)}</TableCell>
                      <TableCell className="text-right">{row.responseMs} ms</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, reportRows.length)} of{' '}
                  {reportRows.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Prev
                  </Button>
                  <span className="text-sm">
                    Page {page} / {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
