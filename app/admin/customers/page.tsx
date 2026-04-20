'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TransactionDetailDialog, type TransactionDetailModel } from '@/components/transaction-detail-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  MoreHorizontal,
  Eye,
  Mail,
  Ban,
  Users,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Filter,
  Smartphone,
  Download,
} from 'lucide-react'
import { mockUsers, mockRechargeOrders } from '@/lib/mock-data'
import { useAuthStore } from '@/lib/stores'
import { toast } from 'sonner'

const CUSTOMER_TXNS_PER_PAGE = 5
const GLOBAL_TXNS_PER_PAGE = 10
type QuickDate = 'all' | 'today' | 'last7' | 'thisMonth'
type TransactionStatusFilter = 'all' | 'success' | 'failed' | 'pending'

type AdminOrder = (typeof mockRechargeOrders)[number]

function toTimestamp(value: string) {
  return new Date(value).getTime()
}

function statusGroup(status: string): TransactionStatusFilter {
  if (status === 'completed') return 'success'
  if (status === 'failed' || status === 'refunded') return 'failed'
  return 'pending'
}

function formatTransactionStatus(status: string) {
  const normalized = statusGroup(status)
  if (normalized === 'success') return 'Success'
  if (normalized === 'failed') return 'Failed'
  return 'Pending'
}

function statusBadgeClass(status: string) {
  const normalized = statusGroup(status)
  if (normalized === 'success') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  if (normalized === 'failed') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
}

export default function AdminCustomersPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [txnSearchQuery, setTxnSearchQuery] = useState('')
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null)
  const [blockedCustomerIds, setBlockedCustomerIds] = useState<Record<string, boolean>>({})
  const [pageByCustomer, setPageByCustomer] = useState<Record<string, number>>({})
  const [globalTxPage, setGlobalTxPage] = useState(1)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailModel, setDetailModel] = useState<TransactionDetailModel | null>(null)

  const [statusFilter, setStatusFilter] = useState<TransactionStatusFilter>('all')
  const [quickDate, setQuickDate] = useState<QuickDate>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [originFilter, setOriginFilter] = useState<string>('all')
  const [networkFilter, setNetworkFilter] = useState<string>('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Admins only')
      router.replace('/account')
    }
  }, [user, router])

  const customers = mockUsers.filter(u => u.role === 'user')
  const customerById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers],
  )

  const filteredCustomers = customers.filter((customer) => {
    return (
      customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      customer.phone?.includes(customerSearchQuery)
    )
  })

  const countryOptions = useMemo(
    () => Array.from(new Set(mockRechargeOrders.map((o) => o.countryName))).sort(),
    [],
  )
  const networkOptions = useMemo(
    () => Array.from(new Set(mockRechargeOrders.map((o) => o.providerName))).sort(),
    [],
  )

  const getCustomerSpend = (userId: string) => {
    return mockRechargeOrders
      .filter(o => o.userId === userId)
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.senderAmount, 0)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  // Stats
  const totalCustomers = customers.length
  const activeCustomers = customers.filter(c => {
    const orders = mockRechargeOrders.filter(o => o.userId === c.id)
    return orders.length > 0
  }).length
  const totalSpend = customers.reduce((sum, c) => sum + getCustomerSpend(c.id), 0)

  const applyQuickDateFilter = (orders: AdminOrder[]) => {
    if (quickDate === 'all') return orders
    const now = new Date()
    const nowTs = now.getTime()
    if (quickDate === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      return orders.filter((o) => toTimestamp(o.createdAt) >= start)
    }
    if (quickDate === 'last7') {
      const from = nowTs - 7 * 24 * 60 * 60 * 1000
      return orders.filter((o) => toTimestamp(o.createdAt) >= from)
    }
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    return orders.filter((o) => toTimestamp(o.createdAt) >= monthStart)
  }

  const applyGlobalFilters = (orders: AdminOrder[]) => {
    let next = [...orders]
    next = applyQuickDateFilter(next)

    if (startDate) {
      const from = new Date(startDate).getTime()
      next = next.filter((o) => toTimestamp(o.createdAt) >= from)
    }
    if (endDate) {
      const to = new Date(endDate).getTime() + (24 * 60 * 60 * 1000 - 1)
      next = next.filter((o) => toTimestamp(o.createdAt) <= to)
    }
    if (statusFilter !== 'all') {
      next = next.filter((o) => statusGroup(o.status) === statusFilter)
    }
    if (countryFilter !== 'all') {
      next = next.filter((o) => o.countryName === countryFilter)
    }
    if (networkFilter !== 'all') {
      next = next.filter((o) => o.providerName === networkFilter)
    }
    if (originFilter !== 'all') {
      next = next.filter((o) => {
        const customer = customers.find((c) => c.id === o.userId)
        const origin = customer?.countryCode || 'Unknown'
        return origin === originFilter
      })
    }
    if (minAmount.trim() !== '') {
      const min = Number(minAmount)
      if (!Number.isNaN(min)) next = next.filter((o) => o.senderAmount >= min)
    }
    if (maxAmount.trim() !== '') {
      const max = Number(maxAmount)
      if (!Number.isNaN(max)) next = next.filter((o) => o.senderAmount <= max)
    }
    return next
  }

  const onToggleExpand = (customerId: string) => {
    if (expandedCustomerId === customerId) {
      setExpandedCustomerId(null)
      return
    }
    setExpandedCustomerId(customerId)
    setPageByCustomer((prev) => ({ ...prev, [customerId]: 1 }))
  }

  const toggleBlockStatus = (customerId: string) => {
    setBlockedCustomerIds((prev) => ({ ...prev, [customerId]: !prev[customerId] }))
    toast.success(blockedCustomerIds[customerId] ? 'Customer unblocked' : 'Customer blocked')
  }

  const openTransactionDetail = (order: AdminOrder) => {
    const customer = customerById.get(order.userId)
    const paymentReferenceId = `${order.id}-payref`
    const routingVariant = order.id.charCodeAt(order.id.length - 1) % 3
    const routingType = routingVariant === 0 ? 'Dedicated' : routingVariant === 1 ? 'Cheapest' : 'Fallback'
    setDetailModel({
      id: order.id,
      createdAt: order.createdAt,
      status: formatTransactionStatus(order.status),
      amount: order.senderAmount,
      currency: order.senderCurrency,
      customerName: customer?.name || 'Unknown',
      customerEmail: customer?.email || '—',
      customerCountry: customer?.countryCode || '—',
      destinationCountry: order.countryName,
      networkOperator: order.providerName,
      mobileNumber: `${order.countryCode} ${order.phoneNumber}`,
      paymentMethod: order.paymentMethod || '—',
      paymentStatus: formatTransactionStatus(order.status),
      paymentReferenceId,
      gatewayResponse: order.errorMessage || (order.status === 'completed' ? 'Approved' : 'Pending'),
      providerUsed: order.providerName,
      routingType,
      apiResponseStatus: order.status === 'completed' ? 'SUCCESS' : order.status === 'failed' ? 'FAILED' : 'PENDING',
      errorMessage: order.errorMessage,
      failureReason: order.errorMessage || (order.status === 'failed' ? 'Provider unavailable' : ''),
      retryAttempts: order.status === 'failed' ? 1 : 0,
    })
    setDetailOpen(true)
  }

  const filteredGlobalTransactions = useMemo(() => {
    const base = applyGlobalFilters(mockRechargeOrders)
    if (!txnSearchQuery.trim()) return base
    const q = txnSearchQuery.toLowerCase()
    return base.filter((order) => {
      return (
        order.id.toLowerCase().includes(q) ||
        order.phoneNumber.includes(txnSearchQuery) ||
        order.providerName.toLowerCase().includes(q)
      )
    })
  }, [
    txnSearchQuery,
    quickDate,
    startDate,
    endDate,
    statusFilter,
    countryFilter,
    originFilter,
    networkFilter,
    minAmount,
    maxAmount,
  ])

  const globalTxPageCount = Math.max(1, Math.ceil(filteredGlobalTransactions.length / GLOBAL_TXNS_PER_PAGE))
  const safeGlobalTxPage = Math.min(globalTxPage, globalTxPageCount)
  const pagedGlobalTransactions = filteredGlobalTransactions.slice(
    (safeGlobalTxPage - 1) * GLOBAL_TXNS_PER_PAGE,
    safeGlobalTxPage * GLOBAL_TXNS_PER_PAGE,
  )

  useEffect(() => {
    setGlobalTxPage(1)
  }, [txnSearchQuery, quickDate, startDate, endDate, statusFilter, countryFilter, originFilter, networkFilter, minAmount, maxAmount])

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage customers and transactions in one module</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Mail className="h-4 w-4" />
          Send Broadcast
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Customers</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              {totalCustomers}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Customers</CardDescription>
            <CardTitle className="text-2xl text-green-600">{activeCustomers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalSpend)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Spend</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(totalCustomers > 0 ? totalSpend / totalCustomers : 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers" className="gap-2">
            <Users className="h-4 w-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2">
            <Smartphone className="h-4 w-4" />
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Total Spend</TableHead>
                      <TableHead>Reward Points</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No customers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer) => {
                        const allOrders = mockRechargeOrders.filter((o) => o.userId === customer.id)
                        const customerSpend = getCustomerSpend(customer.id)
                        const isExpanded = expandedCustomerId === customer.id
                        const isBlocked = Boolean(blockedCustomerIds[customer.id])
                        const currentPage = pageByCustomer[customer.id] ?? 1
                        const filteredRows = applyGlobalFilters(
                          allOrders.sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt)),
                        )
                        const totalPages = Math.max(1, Math.ceil(filteredRows.length / CUSTOMER_TXNS_PER_PAGE))
                        const safePage = Math.min(currentPage, totalPages)
                        const pageRows = filteredRows.slice(
                          (safePage - 1) * CUSTOMER_TXNS_PER_PAGE,
                          safePage * CUSTOMER_TXNS_PER_PAGE,
                        )

                        return (
                          <Fragment key={customer.id}>
                            <TableRow>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => onToggleExpand(customer.id)}
                                  >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </Button>
                                  <Avatar>
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                      {customer.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{customer.name}</p>
                                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {customer.phone ? (
                                  <span>{customer.countryCode} {customer.phone}</span>
                                ) : (
                                  <span className="text-muted-foreground">Not provided</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{allOrders.length} orders</Badge>
                              </TableCell>
                              <TableCell className="font-medium">{formatCurrency(customerSpend)}</TableCell>
                              <TableCell>
                                <span className="text-primary font-medium">{customer.rewardPoints || 0} pts</span>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{formatDate(customer.createdAt)}</TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Mail className="mr-2 h-4 w-4" />
                                      Send Email
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className={isBlocked ? '' : 'text-destructive'}
                                      onClick={() => toggleBlockStatus(customer.id)}
                                    >
                                      <Ban className="mr-2 h-4 w-4" />
                                      {isBlocked ? 'Unblock Account' : 'Suspend Account'}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                            <TableRow className="border-0">
                              <TableCell colSpan={7} className="p-0">
                                <div
                                  className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[900px]' : 'max-h-0'}`}
                                >
                                  <div className="border-t bg-muted/20 p-4 sm:p-5">
                                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Full Name</p>
                                        <p className="font-medium">{customer.name || '—'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Email</p>
                                        <p className="font-medium">{customer.email || '—'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Phone</p>
                                        <p className="font-medium">{customer.phone ? `${customer.countryCode || ''} ${customer.phone}` : '—'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Country</p>
                                        <p className="font-medium">{customer.countryCode || '—'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Registration Date</p>
                                        <p className="font-medium">{formatDate(customer.createdAt)}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Total Transactions</p>
                                        <p className="font-medium">{allOrders.length}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Total Spend</p>
                                        <p className="font-medium">{formatCurrency(customerSpend)}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Status</p>
                                        <Badge className={isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                                          {isBlocked ? 'Blocked' : 'Active'}
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="mt-4">
                                      <h3 className="mb-3 text-sm font-semibold">Recent Transactions</h3>
                                      {pageRows.length === 0 ? (
                                        <div className="rounded-md border bg-background p-6 text-center text-sm text-muted-foreground">
                                          No transactions found for this customer with current filters.
                                        </div>
                                      ) : (
                                        <>
                                          <div className="rounded-md border bg-background">
                                            <Table>
                                              <TableHeader>
                                                <TableRow>
                                                  <TableHead>Transaction ID</TableHead>
                                                  <TableHead>Date</TableHead>
                                                  <TableHead>Country</TableHead>
                                                  <TableHead>Network / Operator</TableHead>
                                                  <TableHead>Amount</TableHead>
                                                  <TableHead>Status</TableHead>
                                                  <TableHead className="w-[120px] text-right">Action</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {pageRows.map((order) => (
                                                  <TableRow key={order.id}>
                                                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                                                    <TableCell>{order.countryName || '—'}</TableCell>
                                                    <TableCell>{order.providerName || '—'}</TableCell>
                                                    <TableCell className="font-medium">{formatCurrency(order.senderAmount, order.senderCurrency)}</TableCell>
                                                    <TableCell>
                                                      <Badge variant="outline" className={statusBadgeClass(order.status)}>
                                                        {formatTransactionStatus(order.status)}
                                                      </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                      <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openTransactionDetail(order)}
                                                      >
                                                        View Details
                                                      </Button>
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </div>
                                          <div className="mt-3 flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">
                                              Showing {(safePage - 1) * CUSTOMER_TXNS_PER_PAGE + 1}
                                              -
                                              {Math.min(safePage * CUSTOMER_TXNS_PER_PAGE, filteredRows.length)}
                                              {' '}of {filteredRows.length}
                                            </span>
                                            <div className="flex gap-2">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={safePage <= 1}
                                                onClick={() =>
                                                  setPageByCustomer((prev) => ({
                                                    ...prev,
                                                    [customer.id]: Math.max(1, safePage - 1),
                                                  }))
                                                }
                                              >
                                                Previous
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={safePage >= totalPages}
                                                onClick={() =>
                                                  setPageByCustomer((prev) => ({
                                                    ...prev,
                                                    [customer.id]: Math.min(totalPages, safePage + 1),
                                                  }))
                                                }
                                              >
                                                Next
                                              </Button>
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          </Fragment>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Transaction Filters</CardTitle>
              <CardDescription>Filter all transactions from one place.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Quick Date</Label>
                  <Select value={quickDate} onValueChange={(v) => setQuickDate(v as QuickDate)}>
                    <SelectTrigger>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="last7">Last 7 Days</SelectItem>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TransactionStatusFilter)}>
                    <SelectTrigger>
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Destination Country</Label>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {countryOptions.map((country) => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Origin Country (Optional)</Label>
                  <Select value={originFilter} onValueChange={setOriginFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Origins</SelectItem>
                      {Array.from(new Set(customers.map((c) => c.countryCode || 'Unknown'))).map((origin) => (
                        <SelectItem key={origin} value={origin}>{origin}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Network / Operator</Label>
                  <Select value={networkFilter} onValueChange={setNetworkFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Networks</SelectItem>
                      {networkOptions.map((network) => (
                        <SelectItem key={network} value={network}>{network}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Min Amount (USD)</Label>
                  <Input type="number" min="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Max Amount (USD)</Label>
                  <Input type="number" min="0" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="1000" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={txnSearchQuery}
                    onChange={(e) => setTxnSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Network / Operator</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedGlobalTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedGlobalTransactions.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">{order.id}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                          <TableCell>{order.countryName}</TableCell>
                          <TableCell>{order.providerName}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(order.senderAmount, order.senderCurrency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusBadgeClass(order.status)}>
                              {formatTransactionStatus(order.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openTransactionDetail(order)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Showing {(safeGlobalTxPage - 1) * GLOBAL_TXNS_PER_PAGE + 1}
                  -
                  {Math.min(safeGlobalTxPage * GLOBAL_TXNS_PER_PAGE, filteredGlobalTransactions.length)}
                  {' '}of {filteredGlobalTransactions.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={safeGlobalTxPage <= 1}
                    onClick={() => setGlobalTxPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={safeGlobalTxPage >= globalTxPageCount}
                    onClick={() => setGlobalTxPage((p) => Math.min(globalTxPageCount, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TransactionDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        transaction={detailModel}
        viewer={user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null}
        isAdmin
      />
    </div>
  )
}
