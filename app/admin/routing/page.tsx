'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Edit, 
  Trash2,
  Route,
  DollarSign,
  ArrowDownUp,
  Pin,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { 
  getAllRoutingRules, 
  getAllProviders,
  selectBestProvider,
  type RoutingRule,
  type Provider 
} from '@/lib/api/lcr-engine'
import { mockCountries, mockCarriers } from '@/lib/mock-data'

export default function AdminRoutingPage() {
  const [rules, setRules] = useState<RoutingRule[]>(getAllRoutingRules())
  const [providers] = useState<Provider[]>(getAllProviders())
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [testResult, setTestResult] = useState<{
    countryCode: string
    operatorCode: string
    result: ReturnType<typeof selectBestProvider>
  } | null>(null)
  
  // Form state for new rule
  const [newRule, setNewRule] = useState({
    countryCode: '',
    operatorCode: '',
    routingType: 'LCR' as 'LCR' | 'PRIORITY' | 'FIXED',
    defaultProviderId: '',
  })

  const handleToggleRule = (ruleId: string) => {
    setRules(rules.map(r => 
      r.id === ruleId ? { ...r, isActive: !r.isActive } : r
    ))
  }

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId))
  }

  const handleTestLCR = (countryCode: string, operatorCode: string) => {
    const result = selectBestProvider(countryCode, operatorCode, 'TEST_SKU')
    setTestResult({ countryCode, operatorCode, result })
  }

  const getCountryName = (code: string) => {
    const country = mockCountries.find(c => c.code === code)
    return country ? `${country.flag} ${country.name}` : code
  }

  const getOperatorName = (code: string) => {
    const carrier = mockCarriers.find(c => c.code === code)
    return carrier?.name || code || 'All Operators'
  }

  const getProviderName = (id: string) => {
    const provider = providers.find(p => p.id === id)
    return provider?.name || id
  }

  const getRoutingTypeBadge = (type: string) => {
    switch (type) {
      case 'LCR':
        return <Badge className="bg-green-100 text-green-700"><DollarSign className="h-3 w-3 mr-1" />Least Cost</Badge>
      case 'PRIORITY':
        return <Badge className="bg-blue-100 text-blue-700"><ArrowDownUp className="h-3 w-3 mr-1" />Priority</Badge>
      case 'FIXED':
        return <Badge className="bg-purple-100 text-purple-700"><Pin className="h-3 w-3 mr-1" />Fixed</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  // Get unique countries with carriers
  const countriesWithCarriers = [...new Set(mockCarriers.map(c => c.countryCode))]
    .map(code => ({
      code,
      name: getCountryName(code),
      carriers: mockCarriers.filter(c => c.countryCode === code),
    }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Routing Configuration</h1>
          <p className="text-muted-foreground">Configure LCR, priority, and fixed routing rules</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Routing Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Routing Rule</DialogTitle>
              <DialogDescription>
                Define how recharge requests are routed to providers
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Country</Label>
                <Select 
                  value={newRule.countryCode} 
                  onValueChange={(v) => setNewRule({ ...newRule, countryCode: v, operatorCode: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countriesWithCarriers.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label>Operator (Optional)</Label>
                <Select 
                  value={newRule.operatorCode || '__all__'} 
                  onValueChange={(v) => setNewRule({ ...newRule, operatorCode: v === '__all__' ? '' : v })}
                  disabled={!newRule.countryCode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All operators in country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Operators</SelectItem>
                    {countriesWithCarriers
                      .find(c => c.code === newRule.countryCode)
                      ?.carriers.map((carrier) => (
                        <SelectItem key={carrier.code} value={carrier.code}>
                          {carrier.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Leave empty to apply rule to all operators in the country
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label>Routing Type</Label>
                <Select 
                  value={newRule.routingType} 
                  onValueChange={(v) => setNewRule({ ...newRule, routingType: v as typeof newRule.routingType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LCR">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <div>
                          <span className="font-medium">LCR (Least Cost Routing)</span>
                          <p className="text-xs text-muted-foreground">Automatically select cheapest provider</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="PRIORITY">
                      <div className="flex items-center gap-2">
                        <ArrowDownUp className="h-4 w-4 text-blue-600" />
                        <div>
                          <span className="font-medium">Priority Based</span>
                          <p className="text-xs text-muted-foreground">Use providers in configured order</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="FIXED">
                      <div className="flex items-center gap-2">
                        <Pin className="h-4 w-4 text-purple-600" />
                        <div>
                          <span className="font-medium">Fixed Provider</span>
                          <p className="text-xs text-muted-foreground">Always use a specific provider</p>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {newRule.routingType === 'FIXED' && (
                <div className="grid gap-2">
                  <Label>Default Provider</Label>
                  <Select 
                    value={newRule.defaultProviderId} 
                    onValueChange={(v) => setNewRule({ ...newRule, defaultProviderId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.filter(p => p.isActive).map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name} ({provider.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                // Add rule logic here
                setIsAddDialogOpen(false)
              }}>
                Create Rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Route className="h-6 w-6 text-blue-600 shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900">How Routing Works</h3>
              <p className="text-sm text-blue-700 mt-1">
                When a recharge request is received, the system checks routing rules in this order:
                <span className="block mt-2">
                  <strong>1.</strong> Operator-specific rule (e.g., MTN Nigeria) <br />
                  <strong>2.</strong> Country-level rule (e.g., all Nigerian operators) <br />
                  <strong>3.</strong> Default LCR (cheapest available provider)
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Routing Rules</TabsTrigger>
          <TabsTrigger value="test">Test LCR</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Active Routing Rules</CardTitle>
              <CardDescription>
                Rules are evaluated in order: operator-specific first, then country-level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Routing Type</TableHead>
                      <TableHead>Configuration</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No routing rules configured. Default LCR will be used.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">
                            {getCountryName(rule.countryCode)}
                          </TableCell>
                          <TableCell>
                            {rule.operatorCode ? (
                              <Badge variant="outline">{getOperatorName(rule.operatorCode)}</Badge>
                            ) : (
                              <span className="text-muted-foreground">All Operators</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getRoutingTypeBadge(rule.routingType)}
                          </TableCell>
                          <TableCell>
                            {rule.routingType === 'FIXED' && rule.defaultProviderId && (
                              <span className="text-sm">{getProviderName(rule.defaultProviderId)}</span>
                            )}
                            {rule.routingType === 'PRIORITY' && rule.providerPriorities && (
                              <span className="text-sm text-muted-foreground">
                                {rule.providerPriorities.map(p => getProviderName(p.providerId)).join(' → ')}
                              </span>
                            )}
                            {rule.routingType === 'LCR' && (
                              <span className="text-sm text-muted-foreground">Auto-select cheapest</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch 
                              checked={rule.isActive} 
                              onCheckedChange={() => handleToggleRule(rule.id)}
                            />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {rule.updatedAt.split('T')[0]}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-500 hover:text-red-600"
                                onClick={() => handleDeleteRule(rule.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Test LCR Selection</CardTitle>
              <CardDescription>
                Simulate which provider would be selected for a recharge request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Country</Label>
                  <Select>
                    <SelectTrigger id="test-country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countriesWithCarriers.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Operator</Label>
                  <Select>
                    <SelectTrigger id="test-operator">
                      <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockCarriers.map((carrier) => (
                        <SelectItem key={carrier.code} value={carrier.code}>
                          {carrier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => handleTestLCR('IN', 'JIO')} className="w-full">
                    Test Routing
                  </Button>
                </div>
              </div>

              {/* Test Results */}
              {testResult && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    {testResult.result ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    Test Result for {getCountryName(testResult.countryCode)} - {getOperatorName(testResult.operatorCode)}
                  </h4>
                  
                  {testResult.result ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Selected Provider</p>
                        <p className="font-medium">{testResult.result.providerName} ({testResult.result.providerCode})</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Cost Price</p>
                        <p className="font-medium">${testResult.result.costPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Margin</p>
                        <p className="font-medium">{(testResult.result.margin * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Est. Processing Time</p>
                        <p className="font-medium">{testResult.result.estimatedProcessingTime}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">Fallback Providers</p>
                        <p className="font-medium">
                          {testResult.result.fallbackProviders.length > 0
                            ? testResult.result.fallbackProviders.map(id => getProviderName(id)).join(' → ')
                            : 'None configured'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-red-600">No provider available for this combination</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
