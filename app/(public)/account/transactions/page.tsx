'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useWalletStore } from '@/lib/stores'
import {
  Search,
  Filter,
  Download,
  MoreVertical,
  RotateCcw,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function TransactionsPage() {
  const { transactions } = useWalletStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Filter transactions
  const filteredTransactions = transactions.filter((txn) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        txn.description.toLowerCase().includes(query) ||
        txn.id.toLowerCase().includes(query) ||
        txn.metadata?.phoneNumber?.includes(query) ||
        txn.metadata?.carrierName?.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Type filter
    if (typeFilter !== 'all' && txn.type !== typeFilter) return false

    // Status filter
    if (statusFilter !== 'all' && txn.status !== statusFilter) return false

    return true
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        )
      case 'pending':
      case 'processing':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
            <Clock className="mr-1 h-3 w-3" />
            {status === 'pending' ? 'Pending' : 'Processing'}
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'topup':
      case 'refund':
        return <ArrowDownRight className="h-4 w-4 text-emerald-600" />
      case 'recharge':
        return <ArrowUpRight className="h-4 w-4 text-primary" />
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground">View all your past transactions</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone, carrier, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="recharge">Recharge</SelectItem>
                <SelectItem value="topup">Wallet Top-up</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="points_earned">Points Earned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                          {getTypeIcon(txn.type)}
                        </div>
                        <div>
                          <p className="font-medium">{txn.description}</p>
                          {txn.metadata?.phoneNumber && (
                            <p className="text-xs text-muted-foreground">
                              {txn.metadata.phoneNumber}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground font-mono">
                            {txn.id}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{formatDate(txn.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(txn.createdAt)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(txn.status)}</TableCell>
                    <TableCell className="text-right">
                      <p
                        className={cn(
                          'font-semibold',
                          txn.type === 'topup' || txn.type === 'refund'
                            ? 'text-emerald-600'
                            : ''
                        )}
                      >
                        {txn.type === 'topup' || txn.type === 'refund' ? '+' : '-'}
                        {txn.currency === 'PTS'
                          ? `${txn.amount} pts`
                          : `$${txn.amount.toFixed(2)}`}
                      </p>
                      {txn.rewardPoints && txn.rewardPoints > 0 && txn.type !== 'points_earned' && (
                        <p className="text-xs text-primary">
                          +{txn.rewardPoints} pts
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {txn.type === 'recharge' && txn.status === 'completed' && (
                            <DropdownMenuItem asChild>
                              <Link href="/">
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Send Again
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {txn.type === 'recharge' && txn.status === 'failed' && (
                            <DropdownMenuItem>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Raise Complaint
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download Receipt
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
