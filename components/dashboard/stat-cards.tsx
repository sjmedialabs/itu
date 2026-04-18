'use client'

import { ArrowUp, ArrowDown, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string
  change: number
  trend: 'up' | 'down'
  sparklineData?: number[]
}

function MiniSparkline({ data, trend }: { data: number[]; trend: 'up' | 'down' }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 80
  const height = 32
  const padding = 2

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * (width - padding * 2) + padding
      const y = height - padding - ((value - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      className={cn(
        'overflow-visible',
        trend === 'up' ? 'text-success' : 'text-destructive',
      )}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function StatCard({ title, value, change, trend, sparklineData }: StatCardProps) {
  const isPositive = trend === 'up'

  return (
    <Card className="relative overflow-hidden rounded-2xl border-border/70">
      <CardContent className="p-6 sm:p-7">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <Button variant="ghost" size="icon" className="size-6 -mr-2 -mt-2">
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
                  isPositive
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                )}
              >
                {isPositive ? (
                  <ArrowUp className="size-3" />
                ) : (
                  <ArrowDown className="size-3" />
                )}
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-muted-foreground">Vs last month</span>
            </div>
          </div>
          {sparklineData && (
            <div className="ml-4">
              <MiniSparkline data={sparklineData} trend={trend} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface StatCardsGridProps {
  stats: {
    totalRevenue: number
    totalOrders: number
    revenueChange: number
    ordersChange: number
  }
}

export function StatCardsGrid({ stats }: StatCardsGridProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <StatCard
        title="Total Revenue"
        value={formatCurrency(stats.totalRevenue)}
        change={stats.revenueChange}
        trend={stats.revenueChange >= 0 ? 'up' : 'down'}
        sparklineData={[2800, 3200, 3800, 4200, 5800, 9427]}
      />
      <StatCard
        title="Total Order"
        value={formatNumber(stats.totalOrders)}
        change={Math.abs(stats.ordersChange)}
        trend={stats.ordersChange >= 0 ? 'up' : 'down'}
        sparklineData={[120, 145, 168, 190, 175, 160]}
      />
    </div>
  )
}

// Standalone StatCards component with built-in data
export function StatCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <StatCard
        title="Total Revenue"
        value="$9,427.64"
        change={10}
        trend="up"
        sparklineData={[2800, 3200, 3800, 4200, 5800, 9427]}
      />
      <StatCard
        title="Total Order"
        value="57,922"
        change={15}
        trend="down"
        sparklineData={[120, 145, 168, 190, 175, 160]}
      />
    </div>
  )
}
