"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { mockDashboardStats } from "@/lib/mock-data"

const salesData = [
  { name: "Completed", value: 75, color: "hsl(var(--chart-1))" },
  { name: "Pending", value: 15, color: "hsl(var(--chart-2))" },
  { name: "Remaining", value: 10, color: "hsl(var(--muted))" },
]

export function SalesReport() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `+$${(amount / 1000).toFixed(0)}k`
    }
    return `+$${amount}`
  }

  return (
    <Card className="rounded-2xl border-border/70 shadow-elevated-sm">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="text-xl font-semibold tracking-tight">Sales Report</CardTitle>
        <p className="text-sm text-muted-foreground">
          Quarterly Sales Performance Analysis
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Donut Chart */}
        <div className="relative h-[200px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={salesData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {salesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">
              {formatCurrency(mockDashboardStats.totalRevenue * 0.225)}
            </span>
            <span className="text-sm text-muted-foreground">Summary</span>
          </div>
        </div>

        {/* Monthly / Yearly Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Monthly</p>
            <p className="text-xl font-bold">
              {formatCurrency(mockDashboardStats.monthlyRevenue)}
            </p>
            <p className="text-xs text-success">
              {formatCompactCurrency(187000)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Yearly</p>
            <p className="text-xl font-bold">
              {formatCurrency(mockDashboardStats.yearlyRevenue)}
            </p>
            <p className="text-xs text-success">
              {formatCompactCurrency(553000)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
