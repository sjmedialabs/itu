'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RefreshCcw, ChevronDown, ChevronRight } from 'lucide-react'
import { RoutingSubnav } from '@/app/admin/routing/_components/routing-subnav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Fragment } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney } from '@/lib/routing/log-pricing'

type LogRow = {
  id: string
  transactionId: string | null
  countryId: string | null
  operatorId: string | null
  productId: string | null
  providerCode?: string
  providerName?: string
  routingType: 'RULE' | 'LCR'
  providerCost: number | null
  providerCurrency?: string | null
  userAmount?: number | null
  userCurrency?: string | null
  fallbackUsed: boolean
  status: string
  createdAt: string
  metadata?: {
    routingStrategy: string
    ruleMatched: string
    ruleId: string | null
    ruleProvider: string | null
    totalAttempts: number
  }
}

const GRID_TEMPLATE_COLUMNS =
  'minmax(140px, 1.4fr) minmax(110px, 1.1fr) minmax(60px, 0.6fr) minmax(90px, 0.9fr) minmax(80px, 0.8fr) minmax(60px, 0.6fr) minmax(110px, 1.1fr) minmax(100px, 1fr) minmax(110px, 1.1fr) minmax(70px, 0.7fr) minmax(120px, 1.2fr) minmax(95px, 0.95fr) minmax(95px, 0.95fr) minmax(70px, 0.7fr)'


type Provider = { id: string; code: string; name: string }

const PAGE_SIZE = 10

export default function RoutingLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [countryId, setCountryId] = useState('')
  const [operatorId, setOperatorId] = useState('')
  const [providerId, setProviderId] = useState('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, any>>({})
  const [detailsLoading, setDetailsLoading] = useState<Record<string, boolean>>({})

  const toggleExpand = async (transactionId: string | null) => {
    if (!transactionId) return
    if (expandedRow === transactionId) {
      setExpandedRow(null)
      return
    }
    setExpandedRow(transactionId)
    if (!details[transactionId]) {
      setDetailsLoading((prev) => ({ ...prev, [transactionId]: true }))
      try {
        const res = await fetch(`/api/admin/routing-logs/detail?transactionId=${transactionId}`, { credentials: 'include' })
        const data = (await res.json().catch(() => ({}))) as { attempt?: unknown; error?: string }
        if (res.ok && data.attempt) {
          setDetails((prev) => ({ ...prev, [transactionId]: data.attempt }))
        } else {
          toast.error(data.error ?? 'Failed to load audit details')
        }
      } catch (err) {
        console.error(err)
      } finally {
        setDetailsLoading((prev) => ({ ...prev, [transactionId]: false }))
      }
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) })
      if (countryId.trim()) params.set('countryId', countryId.trim().toUpperCase())
      if (operatorId.trim()) params.set('operatorId', operatorId.trim())
      if (providerId !== 'ALL') params.set('providerId', providerId)
      if (from) params.set('from', new Date(from).toISOString())
      if (to) params.set('to', new Date(to).toISOString())

      const [logsRes, providersRes] = await Promise.all([
        fetch(`/api/admin/routing-logs?${params}`, { credentials: 'include', cache: 'no-store' }),
        providers.length
          ? Promise.resolve(null)
          : fetch('/api/admin/lcr/providers', { credentials: 'include', cache: 'no-store' }),
      ])

      const logsData = await logsRes.json().catch(() => ({}))
      if (!logsRes.ok) throw new Error(logsData.error ?? 'Failed to load logs')
      setLogs(Array.isArray(logsData.logs) ? logsData.logs : [])
      setTotalLogs(logsData.total || 0)

      if (providersRes) {
        const providersData = await providersRes.json().catch(() => ({}))
        setProviders(
          Array.isArray(providersData.providers)
            ? providersData.providers.map((p: Provider) => ({ id: p.id, code: p.code, name: p.name }))
            : [],
        )
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Load failed')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [countryId, operatorId, providerId, from, to, offset, providers.length])

  useEffect(() => {
    void load()
  }, [load])

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE))
  const hasMore = offset + PAGE_SIZE < totalLogs

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Routing Logs</h1>
          <p className="text-muted-foreground">Audit trail of every routing decision.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCcw className="mr-2 size-4" />
          Refresh
        </Button>
      </div>

      <RoutingSubnav />

      <Card>
        <CardHeader>
          <CardTitle>Decision log</CardTitle>
          <CardDescription>Click a row to expand routing audit details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:flex-nowrap">
            <Input placeholder="Country ISO3" value={countryId} onChange={(e) => setCountryId(e.target.value)} className="flex-1 min-w-[110px]" />
            <Input placeholder="Operator ID" value={operatorId} onChange={(e) => setOperatorId(e.target.value)} className="flex-1 min-w-[110px]" />
            <div className="flex-1 min-w-[130px]">
              <Select value={providerId} onValueChange={setProviderId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All providers</SelectItem>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="flex-1 min-w-[130px]" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 min-w-[130px]" />
            <Button
              variant="secondary"
              className="shrink-0"
              onClick={() => {
                setOffset(0)
                void load()
              }}
            >
              Apply filters
            </Button>
          </div>

          <Table className="w-full overflow-x-auto">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Time</TableHead>

                <TableHead className="w-[220px]">
                  Transaction
                </TableHead>

                <TableHead className="w-[90px]">
                  Country
                </TableHead>

                <TableHead className="w-[180px]">
                  Operator
                </TableHead>

                <TableHead className="w-[220px]">
                  Plan
                </TableHead>

                <TableHead className="w-[100px]">
                  Type
                </TableHead>

                <TableHead className="w-[120px]">
                  Strategy
                </TableHead>

                <TableHead className="w-[120px]">
                  Rule Matched
                </TableHead>

                <TableHead className="w-[180px]">
                  Rule Provider
                </TableHead>

                <TableHead className="w-[90px]">
                  Attempts
                </TableHead>

                <TableHead className="w-[160px]">
                  Provider
                </TableHead>

                <TableHead className="w-[120px]">
                  User Paid
                </TableHead>

                <TableHead className="w-[120px]">
                  Provider Cost
                </TableHead>

                <TableHead className="w-[120px]">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={14} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="py-8 text-center text-muted-foreground">
                    No routing logs yet.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const isExpanded =
                    expandedRow === log.transactionId
                
                  const detail = log.transactionId
                    ? details[log.transactionId]
                    : null
                
                  const isDetailLoading =
                    log.transactionId
                      ? detailsLoading[log.transactionId]
                      : false
                
                  const strategy =
                    log.metadata?.routingStrategy ?? '—'
                
                  const ruleMatched =
                    log.metadata?.ruleMatched ?? '—'
                
                  const ruleProvider =
                    log.metadata?.ruleProvider ?? '—'
                
                  const totalAttempts =
                    log.metadata?.totalAttempts ??
                    (log.fallbackUsed ? '>1' : '1')
                
                  return (
                    <Fragment key={log.id}>
                
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          toggleExpand(log.transactionId)
                        }
                      >
                        <TableCell>
                
                          <div className="flex items-center gap-2">
                
                            {isExpanded ? (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            )}
                
                            <span className="text-xs whitespace-nowrap">
                
                              {new Date(
                                log.createdAt
                              ).toLocaleString()}
                
                            </span>
                
                          </div>
                
                        </TableCell>
                
                        <TableCell
                          className="font-mono text-xs truncate max-w-[220px]"
                        >
                          {log.transactionId ?? '—'}
                        </TableCell>
                
                        <TableCell>
                          {log.countryId ?? '—'}
                        </TableCell>
                
                        <TableCell
                          className="truncate max-w-[180px]"
                        >
                          {log.operatorId ?? '—'}
                        </TableCell>
                
                        <TableCell
                          className="truncate max-w-[220px] font-mono text-xs"
                        >
                          {log.productId ?? '—'}
                        </TableCell>
                
                        <TableCell>
                
                          <Badge
                            variant={
                              log.routingType === 'RULE'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {log.routingType}
                          </Badge>
                
                        </TableCell>
                
                        <TableCell className="font-semibold text-primary">
                
                          {strategy}
                
                        </TableCell>
                
                        <TableCell>
                
                          <Badge
                            variant={
                              ruleMatched === 'Yes'
                                ? 'default'
                                : 'outline'
                            }
                          >
                            {ruleMatched}
                          </Badge>
                
                        </TableCell>
                
                        <TableCell
                          className="truncate max-w-[180px]"
                        >
                          {ruleProvider}
                        </TableCell>
                
                        <TableCell>
                
                          {totalAttempts}
                
                        </TableCell>
                
                        <TableCell>
                
                          {log.providerName ??
                            log.providerCode ??
                            '—'}
                
                        </TableCell>
                
                        <TableCell>
                
                          {formatMoney(
                            log.userAmount,
                            log.userCurrency
                          )}
                
                        </TableCell>
                
                        <TableCell>
                
                          {formatMoney(
                            log.providerCost,
                            log.providerCurrency
                          )}
                
                        </TableCell>
                
                        <TableCell>
                
                          <Badge
                            variant={
                              log.status === 'success' ||
                              log.status === 'completed'
                                ? 'success'
                                : log.status === 'failed'
                                  ? 'destructive'
                                  : 'outline'
                            }
                          >
                
                            {log.status}
                
                          </Badge>
                
                        </TableCell>
                
                      </TableRow>
                
                      {isExpanded && (
                
                        <TableRow>
                
                          <TableCell
                            colSpan={14}
                            className="bg-muted/20 p-6"
                          >
                
                            {/* expanded detail section */}
                
                          </TableCell>
                
                        </TableRow>
                
                      )}
                
                    </Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <Button variant="outline" disabled={offset === 0 || loading} onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button variant="outline" disabled={!hasMore || loading} onClick={() => setOffset((o) => o + PAGE_SIZE)}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
