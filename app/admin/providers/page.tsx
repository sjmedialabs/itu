'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  Edit, 
  RefreshCcw, 
  Zap, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Settings2,
  Globe,
} from 'lucide-react'
import { 
  getAllProviders, 
  getProviderStats,
  getCoverageRows,
  getLatestRefreshRun,
  refreshAggregatorData,
  setProviderActive,
  type Provider 
} from '@/lib/api/lcr-engine'

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>(getAllProviders())
  const [stats, setStats] = useState(getProviderStats())
  const [coverageRows, setCoverageRows] = useState(getCoverageRows())
  const [latestRefresh, setLatestRefresh] = useState(getLatestRefreshRun())
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefreshHealth = async () => {
    setIsRefreshing(true)
    await refreshAggregatorData({ source: 'manual', maxAttempts: 2 })
    setProviders(getAllProviders())
    setStats(getProviderStats())
    setCoverageRows(getCoverageRows())
    setLatestRefresh(getLatestRefreshRun())
    setIsRefreshing(false)
  }

  const handleToggleProvider = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId)
    if (!provider) return
    setProviderActive(providerId, !provider.isActive)
    setProviders(getAllProviders())
    setStats(getProviderStats())
    setCoverageRows(getCoverageRows())
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-1" />Online</Badge>
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100"><AlertTriangle className="h-3 w-3 mr-1" />Degraded</Badge>
      case 'offline':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><XCircle className="h-3 w-3 mr-1" />Offline</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 98) return 'text-green-600'
    if (rate >= 95) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Providers</h1>
          <p className="text-muted-foreground">Manage aggregator integrations and monitor performance</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefreshHealth}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Health Check
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Provider</DialogTitle>
                <DialogDescription>
                  Configure a new aggregator API integration
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Provider Name</Label>
                  <Input id="name" placeholder="e.g., DingConnect" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code">Provider Code</Label>
                  <Input id="code" placeholder="e.g., DING" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="apiUrl">API Base URL</Label>
                  <Input id="apiUrl" placeholder="https://api.provider.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="timeout">Timeout (ms)</Label>
                    <Input id="timeout" type="number" defaultValue={5000} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="retries">Max Retries</Label>
                    <Input id="retries" type="number" defaultValue={3} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input id="apiKey" type="password" placeholder="Enter API key" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select defaultValue="2">
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Highest</SelectItem>
                      <SelectItem value="2">2 - High</SelectItem>
                      <SelectItem value="3">3 - Medium</SelectItem>
                      <SelectItem value="4">4 - Low</SelectItem>
                      <SelectItem value="5">5 - Lowest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>
                  Add Provider
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Total Providers
            </CardDescription>
            <CardTitle className="text-2xl">{stats.totalProviders}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Active Providers
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.activeProviders}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Online Now
            </CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.onlineProviders}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Avg Success Rate
            </CardDescription>
            <CardTitle className="text-2xl">{stats.avgSuccessRate}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Refresh Status</CardTitle>
          <CardDescription>Daily refresh window: 01:00 - 03:00 server time.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {latestRefresh ? (
            <div className="grid gap-2 md:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Last run:</span>{' '}
                {new Date(latestRefresh.endedAt).toLocaleString('en-GB', { hour12: false })}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span>{' '}
                <Badge
                  variant="outline"
                  className={
                    latestRefresh.status === 'success'
                      ? 'bg-green-100 text-green-700'
                      : latestRefresh.status === 'partial'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                  }
                >
                  {latestRefresh.status}
                </Badge>
              </p>
              <p><span className="text-muted-foreground">Attempts:</span> {latestRefresh.attempts}/{latestRefresh.maxAttempts}</p>
              <p><span className="text-muted-foreground">Source:</span> {latestRefresh.source}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">No refresh has run yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Providers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Providers</CardTitle>
          <CardDescription>
            Aggregator APIs integrated for mobile top-up processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Countries</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Last Health Check</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{provider.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(provider.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">P{provider.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {provider.supportedCountries.slice(0, 3).join(', ')}
                        {provider.supportedCountries.length > 3 && (
                          <span className="text-muted-foreground">
                            {' '}+{provider.supportedCountries.length - 3} more
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${getSuccessRateColor(provider.successRate || 0)}`}>
                        {provider.successRate || 0}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {provider.lastHealthCheck 
                          ? new Date(provider.lastHealthCheck).toLocaleTimeString()
                          : 'Never'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch 
                        checked={provider.isActive} 
                        onCheckedChange={() => handleToggleProvider(provider.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => setEditingProvider(provider)}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coverage Matrix</CardTitle>
          <CardDescription>
            Country → Operator → Supported aggregators. Unsupported APIs are excluded automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Supported Aggregators</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coverageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      No coverage records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  coverageRows.map((row) => (
                    <TableRow key={`${row.countryCode}-${row.operatorCode}`}>
                      <TableCell>{row.countryCode}</TableCell>
                      <TableCell>{row.operatorCode}</TableCell>
                      <TableCell>
                        {row.providerCodes.length === 0 ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700">No support</Badge>
                        ) : (
                          row.providerCodes.map((code) => (
                            <Badge key={code} variant="outline" className="mr-1 mb-1">
                              {code}
                            </Badge>
                          ))
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Provider Dialog */}
      <Dialog open={!!editingProvider} onOpenChange={() => setEditingProvider(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Configure {editingProvider?.name}</DialogTitle>
            <DialogDescription>
              Update provider settings and credentials
            </DialogDescription>
          </DialogHeader>
          {editingProvider && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Provider Code</Label>
                  <Input value={editingProvider.code} readOnly className="bg-muted" />
                </div>
                <div className="grid gap-2">
                  <Label>API Base URL</Label>
                  <Input
                    value={editingProvider.apiBaseUrl}
                    onChange={(e) =>
                      setEditingProvider({ ...editingProvider, apiBaseUrl: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select defaultValue={String(editingProvider.priority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((p) => (
                        <SelectItem key={p} value={String(p)}>
                          {p} - {p === 1 ? 'Highest' : p === 5 ? 'Lowest' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={editingProvider.timeout}
                    onChange={(e) =>
                      setEditingProvider({
                        ...editingProvider,
                        timeout: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Max Retries</Label>
                  <Input
                    type="number"
                    value={editingProvider.maxRetries}
                    onChange={(e) =>
                      setEditingProvider({
                        ...editingProvider,
                        maxRetries: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Supported Countries</Label>
                <Input
                  value={editingProvider.supportedCountries.join(', ')}
                  placeholder="US, IN, NG, PH"
                  onChange={(e) =>
                    setEditingProvider({
                      ...editingProvider,
                      supportedCountries: e.target.value
                        .split(/[\s,]+/)
                        .map((s) => s.trim().toUpperCase())
                        .filter(Boolean),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated ISO country codes
                </p>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">API Credentials</h4>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>API Key</Label>
                    <Input type="password" placeholder="Enter new API key to update" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Client ID (OAuth)</Label>
                      <Input type="password" placeholder="Client ID" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Client Secret (OAuth)</Label>
                      <Input type="password" placeholder="Client Secret" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProvider(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingProvider) {
                  setProviders((prev) =>
                    prev.map((p) => (p.id === editingProvider.id ? editingProvider : p)),
                  )
                }
                setEditingProvider(null)
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
