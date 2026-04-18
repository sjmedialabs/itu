'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Search, 
  RefreshCcw, 
  Package, 
  Globe,
  Zap,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { mockCountries, mockCarriers, mockProducts } from '@/lib/mock-data'
import { getAllProviders, getAllPricing, type Provider, type ProviderPricing } from '@/lib/api/lcr-engine'

// Simulated aggregator products (as if fetched from DingConnect/Reloadly APIs)
interface AggregatorProduct {
  skuCode: string
  providerCode: string
  providerName: string
  countryCode: string
  countryName: string
  operatorCode: string
  operatorName: string
  productName: string
  type: 'data' | 'voice' | 'combo' | 'international'
  minSendAmount: number
  maxSendAmount: number
  sendCurrency: string
  minReceiveAmount: number
  maxReceiveAmount: number
  receiveCurrency: string
  commissionRate: number
  processingMode: 'Instant' | 'Batch'
  validity?: string
  isPromo: boolean
  lastSync: string
}

export default function AdminProductsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState('')
  const [providers] = useState<Provider[]>(getAllProviders())
  const [pricing] = useState<ProviderPricing[]>(getAllPricing())

  // Generate aggregator products from mock data
  const [aggregatorProducts, setAggregatorProducts] = useState<AggregatorProduct[]>([])

  useEffect(() => {
    setLastSyncTime(new Date().toISOString())
  }, [])

  useEffect(() => {
    if (!lastSyncTime) return
    // Simulate fetching products from aggregator APIs
    const products: AggregatorProduct[] = mockProducts.map(product => {
      const carrier = mockCarriers.find(c => c.id === product.carrierId)
      const country = mockCountries.find(c => c.code === carrier?.countryCode)
      const providerPrice = pricing.find(p => 
        p.countryCode === carrier?.countryCode && 
        p.operatorCode === carrier?.code
      )
      const provider = providers.find(p => p.id === providerPrice?.providerId)

      return {
        skuCode: product.skuCode,
        providerCode: provider?.code || 'DING',
        providerName: provider?.name || 'DingConnect',
        countryCode: carrier?.countryCode || '',
        countryName: country?.name || '',
        operatorCode: carrier?.code || '',
        operatorName: carrier?.name || '',
        productName: product.name,
        type: product.type as 'data' | 'voice' | 'combo' | 'international',
        minSendAmount: product.minSendAmount,
        maxSendAmount: product.maxSendAmount,
        sendCurrency: product.sendCurrency,
        minReceiveAmount: product.minReceiveAmount,
        maxReceiveAmount: product.maxReceiveAmount,
        receiveCurrency: product.receiveCurrency,
        commissionRate: product.commissionRate,
        processingMode: product.processingMode,
        validity: product.validity,
        isPromo: product.isPromo || false,
        lastSync: lastSyncTime,
      }
    })
    setAggregatorProducts(products)
  }, [lastSyncTime, pricing, providers])

  const handleRefreshProducts = async () => {
    setIsRefreshing(true)
    // Simulate API call to refresh products from aggregators
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setLastSyncTime(new Date().toISOString())
    setIsRefreshing(false)
  }

  const filteredProducts = aggregatorProducts.filter((product) => {
    const matchesSearch =
      product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.operatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.skuCode.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCountry = countryFilter === 'all' || product.countryCode === countryFilter
    const matchesProvider = providerFilter === 'all' || product.providerCode === providerFilter
    
    return matchesSearch && matchesCountry && matchesProvider
  })

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  // Get unique countries from carriers
  const uniqueCountries = [...new Set(mockCarriers.map(c => c.countryCode))]
    .map(code => mockCountries.find(country => country.code === code))
    .filter(Boolean)

  // Stats
  const totalProducts = aggregatorProducts.length
  const instantProducts = aggregatorProducts.filter(p => p.processingMode === 'Instant').length
  const promoProducts = aggregatorProducts.filter(p => p.isPromo).length
  const activeProviders = [...new Set(aggregatorProducts.map(p => p.providerCode))].length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products Catalog</h1>
          <p className="text-muted-foreground">Plans fetched from aggregator APIs via LCR routing</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefreshProducts}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Products
          </Button>
        </div>
      </div>

      {/* Last Sync Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Last Sync</p>
                <p className="text-sm text-blue-700">
                  {lastSyncTime
                    ? lastSyncTime.replace('T', ' ').slice(0, 19)
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              All providers synced successfully
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Products
            </CardDescription>
            <CardTitle className="text-2xl">{totalProducts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Instant Processing
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">{instantProducts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Promotional Plans
            </CardDescription>
            <CardTitle className="text-2xl text-purple-600">{promoProducts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Active Providers
            </CardDescription>
            <CardTitle className="text-2xl">{activeProviders}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Products</TabsTrigger>
          <TabsTrigger value="byCountry">By Country</TabsTrigger>
          <TabsTrigger value="byProvider">By Provider</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by product name, operator, or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {uniqueCountries.map((country) => country && (
                      <SelectItem key={country.code} value={country.code}>
                        {country.flag} {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={providerFilter} onValueChange={setProviderFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Providers</SelectItem>
                    {providers.filter(p => p.isActive).map((provider) => (
                      <SelectItem key={provider.code} value={provider.code}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>
                {filteredProducts.length} products from aggregator APIs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Country / Operator</TableHead>
                      <TableHead>Amount Range</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Processing</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          No products found matching your filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.slice(0, 20).map((product) => {
                        const country = mockCountries.find(c => c.code === product.countryCode)
                        
                        return (
                          <TableRow key={product.skuCode}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{product.productName}</p>
                                    {product.isPromo && (
                                      <Badge className="bg-purple-100 text-purple-700 text-xs">Promo</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground font-mono">{product.skuCode}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{product.providerCode}</Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="flex items-center gap-1">
                                  <span>{country?.flag}</span>
                                  <span>{product.countryCode}</span>
                                </span>
                                <p className="text-xs text-muted-foreground">{product.operatorName}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{formatCurrency(product.minSendAmount, product.sendCurrency)} - {formatCurrency(product.maxSendAmount, product.sendCurrency)}</p>
                                <p className="text-xs text-muted-foreground">
                                  → {formatCurrency(product.minReceiveAmount, product.receiveCurrency)} - {formatCurrency(product.maxReceiveAmount, product.receiveCurrency)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-green-600 font-medium">
                                {(product.commissionRate * 100).toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell>
                              {product.processingMode === 'Instant' ? (
                                <Badge className="bg-green-100 text-green-700">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Instant
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Batch
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredProducts.length > 20 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Showing 20 of {filteredProducts.length} products
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="byCountry">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {uniqueCountries.filter(Boolean).map((country) => {
              const countryProducts = aggregatorProducts.filter(p => p.countryCode === country!.code)
              const operators = [...new Set(countryProducts.map(p => p.operatorName))]
              
              return (
                <Card key={country!.code}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="text-2xl">{country!.flag}</span>
                      {country!.name}
                    </CardTitle>
                    <CardDescription>
                      {countryProducts.length} products from {operators.length} operators
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {operators.slice(0, 4).map(operator => (
                        <div key={operator} className="flex items-center justify-between text-sm">
                          <span>{operator}</span>
                          <Badge variant="outline">
                            {countryProducts.filter(p => p.operatorName === operator).length} plans
                          </Badge>
                        </div>
                      ))}
                      {operators.length > 4 && (
                        <p className="text-xs text-muted-foreground">
                          +{operators.length - 4} more operators
                        </p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4 gap-2">
                      <ExternalLink className="h-4 w-4" />
                      View All Plans
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="byProvider">
          <div className="grid gap-4 md:grid-cols-2">
            {providers.filter(p => p.isActive).map((provider) => {
              const providerProducts = aggregatorProducts.filter(p => p.providerCode === provider.code)
              const countries = [...new Set(providerProducts.map(p => p.countryCode))]
              
              return (
                <Card key={provider.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <Badge variant="outline">{provider.code}</Badge>
                    </div>
                    <CardDescription>
                      {providerProducts.length} products across {countries.length} countries
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{provider.successRate}%</p>
                        <p className="text-xs text-muted-foreground">Success Rate</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold">P{provider.priority}</p>
                        <p className="text-xs text-muted-foreground">Priority</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {countries.slice(0, 6).map(code => {
                        const country = mockCountries.find(c => c.code === code)
                        return (
                          <span key={code} className="text-lg" title={country?.name}>
                            {country?.flag}
                          </span>
                        )
                      })}
                      {countries.length > 6 && (
                        <span className="text-sm text-muted-foreground">+{countries.length - 6}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
