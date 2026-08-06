'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  RefreshCcw,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Radio,
  Globe,
  Pencil,
  Upload,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { toBrowserStorageUrl } from '@/lib/storage/public-url'

interface OperatorLogoItem {
  id: string
  system_operator_name: string
  slug?: string | null
  country_id: string
  service_domain?: string | null
  status?: string | null
  logo_url?: string | null
  brandfetch_domain?: string | null
  logo_status?: 'PENDING' | 'FOUND' | 'NOT_FOUND' | 'FAILED'
  last_synced_at?: string | null
}

interface LogoStatistics {
  totalOperators: number
  logosSynced: number
  logosPending: number
  logosFailed: number
  logosNotFound: number
  lastSyncTime?: string | null
}

interface SyncProgress {
  isRunning: boolean
  forceResync: boolean
  totalToProcess: number
  processedCount: number
  completedCount: number
  failedCount: number
  notFoundCount: number
  currentOperator?: string | null
  startedAt?: string | null
  completedAt?: string | null
  lastError?: string | null
}

export default function OperatorLogoManagementPage() {
  const [stats, setStats] = useState<LogoStatistics>({
    totalOperators: 0,
    logosSynced: 0,
    logosPending: 0,
    logosFailed: 0,
    logosNotFound: 0,
    lastSyncTime: null,
  })
  const [operators, setOperators] = useState<OperatorLogoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [isStartingSync, setIsStartingSync] = useState(false)
  const [confirmForceModal, setConfirmForceModal] = useState(false)

  // State for Edit Logo Modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedOperator, setSelectedOperator] = useState<OperatorLogoItem | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Fetch Summary Statistics
  const loadStatistics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/operator-logos/statistics', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (data.statistics) setStats(data.statistics)
    } catch (err) {
      console.error('Failed to fetch statistics:', err)
    }
  }, [])

  // Fetch Paginated Operators List
  const loadOperators = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100', offset: '0' })
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/admin/operator-logos/list?${params}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load operators')
      const data = await res.json()
      setOperators(Array.isArray(data.operators) ? data.operators : [])
    } catch (err) {
      toast.error('Failed to load operator logos list')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  // Poll active sync status
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/operator-logos/status', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const p: SyncProgress = data.progress
      setProgress(p)

      if (p.isRunning) {
        // Continue polling while sync is running
        setTimeout(pollStatus, 1500)
      } else {
        // Refresh data when sync completes
        void loadStatistics()
        void loadOperators()
      }
    } catch {
      // Ignore polling errors
    }
  }, [loadStatistics, loadOperators])

  useEffect(() => {
    void loadStatistics()
    void loadOperators()
    void pollStatus()
  }, [loadStatistics, loadOperators, pollStatus])

  // Trigger Normal Sync
  const handleStartSync = async () => {
    setIsStartingSync(true)
    try {
      const res = await fetch('/api/admin/operator-logos/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start sync')
      toast.success('Operator logo synchronization started in background!')
      void pollStatus()
    } catch (err: any) {
      toast.error(err.message || 'Failed to start sync')
    } finally {
      setIsStartingSync(false)
    }
  }

  // Trigger Force Resync
  const handleForceSync = async () => {
    setConfirmForceModal(false)
    setIsStartingSync(true)
    try {
      const res = await fetch('/api/admin/operator-logos/force-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start force sync')
      toast.success('Force logo resynchronization started in background!')
      void pollStatus()
    } catch (err: any) {
      toast.error(err.message || 'Failed to start force sync')
    } finally {
      setIsStartingSync(false)
    }
  }

  // Open Edit Modal
  const handleOpenEditModal = (op: OperatorLogoItem) => {
    setSelectedOperator(op)
    setSelectedFile(null)
    setFilePreview(null)
    setFileError(null)
    setEditModalOpen(true)
  }

  // Handle File Input Selection (.png validation)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setSelectedFile(null)
      setFilePreview(null)
      setFileError(null)
      return
    }

    const isPng = file.name.toLowerCase().endsWith('.png') || file.type === 'image/png'
    if (!isPng) {
      setSelectedFile(null)
      setFilePreview(null)
      setFileError('Invalid format. Please select a .png image file.')
      return
    }

    setFileError(null)
    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = () => {
      setFilePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Save / Upload New Logo
  const handleSaveLogo = async () => {
    if (!selectedOperator || !selectedFile) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('systemOperatorId', selectedOperator.id)
      formData.append('file', selectedFile)

      const res = await fetch('/api/admin/operator-logos/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      const nowIso = data.last_synced_at || new Date().toISOString()
      const rawUrl = data.logo_url || ''
      const cacheBustUrl = rawUrl ? `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : rawUrl

      // Optimistically update local operators table state immediately
      setOperators((prev) =>
        prev.map((op) => {
          if (op.id === selectedOperator.id) {
            return {
              ...op,
              logo_url: cacheBustUrl,
              logo_status: 'FOUND' as const,
              last_synced_at: nowIso,
            }
          }
          return op
        })
      )

      toast.success(`Logo updated successfully for ${selectedOperator.system_operator_name}`)
      setEditModalOpen(false)
      void loadStatistics()
      void loadOperators()
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo')
    } finally {
      setUploading(false)
    }
  }

  const isSyncActive = progress?.isRunning ?? false
  const progressPercent =
    progress && progress.totalToProcess > 0
      ? Math.round((progress.processedCount / progress.totalToProcess) * 100)
      : 0

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Operator Logo Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Automatically fetch, optimize, and store telecom operator logos using the Brandfetch API.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              void loadStatistics()
              void loadOperators()
            }}
            disabled={loading}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="default"
            onClick={handleStartSync}
            disabled={isSyncActive || isStartingSync}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {isStartingSync ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Sync Operator Logos
          </Button>

          <Button
            variant="destructive"
            onClick={() => setConfirmForceModal(true)}
            disabled={isSyncActive || isStartingSync}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Force Resync
          </Button>
        </div>
      </div>

      {/* Background Sync Progress Banner (Non-blocking) */}
      {isSyncActive && (
        <Card className="border-primary/50 bg-primary/5 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Background Logo Sync Running...
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {progress?.processedCount} / {progress?.totalToProcess} ({progressPercent}%)
              </Badge>
            </div>
            {progress?.currentOperator && (
              <CardDescription className="text-xs text-muted-foreground truncate">
                Processing: <span className="font-medium text-foreground">{progress.currentOperator}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Completed: <strong className="text-emerald-500">{progress?.completedCount}</strong></span>
              <span>Not Found: <strong className="text-amber-500">{progress?.notFoundCount}</strong></span>
              <span>Failed: <strong className="text-red-500">{progress?.failedCount}</strong></span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics / Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Operators</CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.totalOperators}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Logos Synced</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-500">{stats.logosSynced}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Pending</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-500">{stats.logosPending}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Not Found</CardDescription>
            <CardTitle className="text-2xl font-bold text-zinc-400">{stats.logosNotFound}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Failed</CardDescription>
            <CardTitle className="text-2xl font-bold text-red-500">{stats.logosFailed}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Last Sync Time</CardDescription>
            <CardTitle className="text-xs font-mono text-muted-foreground truncate">
              {stats.lastSyncTime
                ? new Date(stats.lastSyncTime).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Never'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter & Search Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search operator name or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="FOUND">Synced (FOUND)</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="NOT_FOUND">Not Found</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operators & Logos Table */}
      <Card>
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-base font-semibold">Operator Logos Directory</CardTitle>
          <CardDescription>
            Showing system operators and their synchronized Brandfetch logo assets.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Logo Preview</TableHead>
                <TableHead>Operator Name</TableHead>
                <TableHead>Country Code</TableHead>
                <TableHead>Brandfetch Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Synced At</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading operator logos...
                  </TableCell>
                </TableRow>
              ) : operators.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No operator logo records found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                operators.map((op) => {
                  const logoUrl = op.logo_url ? toBrowserStorageUrl(op.logo_url) : null
                  return (
                    <TableRow key={op.id}>
                      <TableCell className="pl-6">
                        <div className="h-10 w-10 rounded-md border bg-muted/40 flex items-center justify-center overflow-hidden p-1">
                          {logoUrl ? (
                            <img
                              key={logoUrl || op.id}
                              src={logoUrl}
                              alt={op.system_operator_name}
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                // Fallback to placeholder if image fails loading
                                ;(e.target as HTMLElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <Radio className="h-5 w-5 text-muted-foreground/60" />
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium text-sm">{op.system_operator_name}</div>
                        {op.slug && <div className="text-xs text-muted-foreground font-mono">{op.slug}</div>}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {op.country_id}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {op.brandfetch_domain ? (
                          <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {op.brandfetch_domain}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={op.logo_status} />
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {op.last_synced_at
                          ? new Date(op.last_synced_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </TableCell>

                      <TableCell className="pr-6 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditModal(op)}
                          className="h-8 px-2.5 text-xs font-medium"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit Logo
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Operator Logo Dialog Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Operator Logo
            </DialogTitle>
            <DialogDescription>
              Upload a custom PNG logo for <strong className="text-foreground">{selectedOperator?.system_operator_name}</strong> ({selectedOperator?.country_id}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Current / New Logo Preview Box */}
            <div className="flex items-center gap-4 rounded-lg border p-3 bg-muted/20">
              <div className="h-16 w-16 rounded-md border bg-background flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                {filePreview ? (
                  <img src={filePreview} alt="New Preview" className="h-full w-full object-contain" />
                ) : selectedOperator?.logo_url ? (
                  <img
                    src={toBrowserStorageUrl(selectedOperator.logo_url)}
                    alt={selectedOperator.system_operator_name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Radio className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-semibold text-sm">{selectedOperator?.system_operator_name}</div>
                <div className="text-muted-foreground font-mono">Slug: {selectedOperator?.slug || '—'}</div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <StatusBadge status={filePreview ? 'FOUND' : selectedOperator?.logo_status} />
                </div>
              </div>
            </div>

            {/* File Input */}
            <div className="space-y-2">
              <Label htmlFor="logo-file-input" className="text-xs font-semibold">
                Upload New Logo (.png format only)
              </Label>
              <Input
                id="logo-file-input"
                type="file"
                accept=".png,image/png"
                onChange={handleFileChange}
                disabled={uploading}
                className="cursor-pointer text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Requirements: PNG format with transparent background recommended.
              </p>
              {fileError && (
                <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {fileError}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSaveLogo}
              disabled={!selectedFile || Boolean(fileError) || uploading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Save Logo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Force Resync */}
      <Dialog open={confirmForceModal} onOpenChange={setConfirmForceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Confirm Force Logo Resync
            </DialogTitle>
            <DialogDescription>
              Force Resync will query Brandfetch and re-download logos for ALL system operators, including those with existing logos. Are you sure you want to trigger this action?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmForceModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleForceSync}>
              Yes, Force Resync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBadge({ status }: { status?: string }) {
  const st = (status ?? 'PENDING').toUpperCase()
  if (st === 'FOUND') {
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-semibold flex w-max items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Synced
      </Badge>
    )
  }
  if (st === 'NOT_FOUND') {
    return (
      <Badge variant="outline" className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 font-semibold flex w-max items-center gap-1">
        <XCircle className="h-3 w-3" />
        Not Found
      </Badge>
    )
  }
  if (st === 'FAILED') {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 font-semibold flex w-max items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Failed
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-semibold flex w-max items-center gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  )
}
