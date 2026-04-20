'use client'

import { useMemo, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
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
import { Badge } from '@/components/ui/badge'
import { Plus, Megaphone, Upload, Globe, Play, Pause, Trash2 } from 'lucide-react'
import { useAdminToolsStore } from '@/lib/admin-tools-store'
import { mockCountries } from '@/lib/mock-data'
import { toast } from 'sonner'

function prettyDate(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default function AdminAdsPage() {
  const ads = useAdminToolsStore((s) => s.ads)
  const addAd = useAdminToolsStore((s) => s.addAd)
  const deleteAd = useAdminToolsStore((s) => s.deleteAd)
  const setAdStatus = useAdminToolsStore((s) => s.setAdStatus)

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [ctaUrl, setCtaUrl] = useState('/recharge')
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate')
  const [startAt, setStartAt] = useState('')
  const [targetCountries, setTargetCountries] = useState<string[]>([])
  const [publishNow, setPublishNow] = useState(true)

  const publishedCount = useMemo(
    () => ads.filter((x) => x.status === 'published').length,
    [ads],
  )

  function toggleCountry(code: string) {
    setTargetCountries((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    )
  }

  const allCountryCodes = mockCountries.map((country) => country.code)
  const isAllCountriesSelected =
    allCountryCodes.length > 0 && allCountryCodes.every((code) => targetCountries.includes(code))

  function toggleAllCountries() {
    setTargetCountries(isAllCountriesSelected ? [] : allCountryCodes)
  }

  async function onFileChange(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageUrl(String(reader.result ?? ''))
    }
    reader.readAsDataURL(file)
  }

  function resetForm() {
    setTitle('')
    setDescription('')
    setImageUrl('')
    setCtaUrl('/recharge')
    setScheduleType('immediate')
    setStartAt('')
    setTargetCountries([])
    setPublishNow(true)
  }

  function createAd() {
    if (!title.trim()) {
      toast.error('Ad title is required')
      return
    }
    if (!imageUrl) {
      toast.error('Upload a banner image')
      return
    }
    if (scheduleType === 'scheduled' && !startAt) {
      toast.error('Pick a scheduled date/time')
      return
    }

    addAd({
      title: title.trim(),
      imageUrl,
      ctaUrl: ctaUrl.trim() || '/recharge',
      targetCountries,
      scheduleType,
      startAt: scheduleType === 'scheduled' ? new Date(startAt).toISOString() : undefined,
      status: publishNow ? 'published' : 'draft',
    })

    toast.success(publishNow ? 'Ad published' : 'Ad saved as draft')
    setOpen(false)
    resetForm()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ads Manager</h1>
          <p className="text-muted-foreground">
            Create country-targeted banners and publish to frontend pages.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create New Advertisement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>New Advertisement</DialogTitle>
              <DialogDescription>
                Upload banner, choose target countries, schedule, then publish.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="ad-title">Title</Label>
                <Input
                  id="ad-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summer recharge offer"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ad-description">Description</Label>
                <Textarea
                  id="ad-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional campaign note for admin context"
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ad-banner">Banner upload</Label>
                <Input id="ad-banner" type="file" accept="image/*" onChange={(e) => onFileChange(e.target.files?.[0])} />
                {imageUrl ? (
                  <img src={imageUrl} alt="Ad preview" className="h-28 w-full rounded-lg border object-cover" />
                ) : (
                  <div className="flex h-28 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload a banner image
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ad-cta">CTA URL</Label>
                <Input
                  id="ad-cta"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="/recharge"
                />
              </div>

              <div className="grid gap-2">
                <Label>Target countries</Label>
                <div className="max-h-44 rounded-lg border p-3">
                  <p className="mb-2 text-xs text-muted-foreground">
                    Leave unselected to make this ad global.
                  </p>
                  <label className="mb-3 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={isAllCountriesSelected}
                      onChange={toggleAllCountries}
                    />
                    <span>Select all countries</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {mockCountries.map((country) => (
                      <label
                        key={country.code}
                        className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={targetCountries.includes(country.code)}
                          onChange={() => toggleCountry(country.code)}
                        />
                        <span>{country.flag}</span>
                        <span>{country.code}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Schedule</Label>
                  <Select
                    value={scheduleType}
                    onValueChange={(value) => setScheduleType(value as 'immediate' | 'scheduled')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ad-start">Start time</Label>
                  <Input
                    id="ad-start"
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    disabled={scheduleType !== 'scheduled'}
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={publishNow}
                  onChange={(e) => setPublishNow(e.target.checked)}
                />
                Publish ad after create
              </label>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createAd}>Save Advertisement</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total ads</CardDescription>
            <CardTitle>{ads.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Published</CardDescription>
            <CardTitle className="text-green-600">{publishedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Drafts</CardDescription>
            <CardTitle className="text-amber-600">{ads.length - publishedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Campaigns
          </CardTitle>
          <CardDescription>
            Ads are shown on frontend pages, prioritized by user frequent destination country.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>Targets</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No ads yet. Create your first campaign.
                  </TableCell>
                </TableRow>
              ) : (
                ads.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={ad.imageUrl}
                          alt={ad.title}
                          className="h-11 w-20 rounded-md border object-cover"
                        />
                        <div>
                          <p className="font-medium">{ad.title}</p>
                          <p className="text-xs text-muted-foreground">{ad.ctaUrl}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ad.targetCountries.length === 0 ? (
                        <Badge variant="outline" className="gap-1">
                          <Globe className="h-3 w-3" />
                          Global
                        </Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {ad.targetCountries.slice(0, 3).map((code) => (
                            <Badge key={code} variant="secondary">
                              {code}
                            </Badge>
                          ))}
                          {ad.targetCountries.length > 3 && (
                            <Badge variant="secondary">+{ad.targetCountries.length - 3}</Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {ad.scheduleType === 'immediate' ? 'Immediate' : `Scheduled: ${prettyDate(ad.startAt)}`}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          ad.status === 'published'
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                        }
                      >
                        {ad.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        {ad.status === 'published' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => {
                              setAdStatus(ad.id, 'draft')
                              toast.success('Ad unpublished')
                            }}
                          >
                            <Pause className="h-3.5 w-3.5" />
                            Unpublish
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              setAdStatus(ad.id, 'published')
                              toast.success('Ad published')
                            }}
                          >
                            <Play className="h-3.5 w-3.5" />
                            Publish
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-destructive"
                          onClick={() => {
                            deleteAd(ad.id)
                            toast.success('Ad deleted')
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
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
