'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useLocalePreferencesStore, useAuthStore } from '@/lib/stores'
import { Settings, Bell, Globe, CheckCircle2, Loader2 } from 'lucide-react'
import { countriesList } from '@/lib/country-codes'
import { allLanguages, allCurrencies } from '@/lib/languages-currencies'

export default function AccountSettingsPage() {
  const { user } = useAuthStore()
  const { regionCode, languageCode, currencyCode, setRegion, setLanguage, setCurrency, setManualOverride } = useLocalePreferencesStore()

  const [mounted, setMounted] = useState(false)
  const [emailNotify, setEmailNotify] = useState(true)
  const [smsNotify, setSmsNotify] = useState(true)
  const [promoNotify, setPromoNotify] = useState(false)
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Build options for the searchable language dropdown
  const languageOptions = useMemo(
    () =>
      allLanguages.map((l) => ({
        value: l.code,
        label: `${l.name}`,
        secondaryLabel: l.nativeName,
      })),
    [],
  )

  // Build options for the searchable currency dropdown
  const currencyOptions = useMemo(
    () =>
      allCurrencies.map((c) => ({
        value: c.code,
        label: `${c.symbol}  ${c.name}`,
        secondaryLabel: c.code,
      })),
    [],
  )

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setManualOverride(true)
    setIsSaving(true)

    // Persist language & currency to Supabase profiles table
    try {
      if (user?.id) {
        await fetch('/api/profile/locale', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            country: regionCode,
            language: languageCode,
            currency: currencyCode,
          }),
        })
      }
    } catch {
      // Silently fail — locale is also persisted client-side via zustand
    }

    setIsSaving(false)
    setSuccess('Settings updated successfully!')
    setTimeout(() => setSuccess(''), 3000)
  }

  if (!user || !mounted) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">Customize your regional settings and notification preferences</p>
      </div>

      {success && (
        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 flex items-center gap-2 max-w-md">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
        {/* Regional Settings */}
        <Card className="rounded-2xl border-neutral-200/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800 shadow-sm">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-neutral-900">Regional & Locale</CardTitle>
                <CardDescription>Configure your default region, language, and billing currency</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="region-select">Default Region</Label>
                <Select value={regionCode} onValueChange={(val) => setRegion(val)}>
                  <SelectTrigger id="region-select" className="rounded-xl h-10">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    {countriesList.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="mr-2">{c.flag}</span> {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lang-select">Display Language</Label>
                <SearchableSelect
                  id="lang-select"
                  options={languageOptions}
                  value={languageCode}
                  onValueChange={(val) => setLanguage(val)}
                  placeholder="Select language"
                  searchPlaceholder="Search languages…"
                  emptyMessage="No language found."
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="currency-select">Preferred Currency</Label>
                <SearchableSelect
                  id="currency-select"
                  options={currencyOptions}
                  value={currencyCode}
                  onValueChange={(val) => setCurrency(val)}
                  placeholder="Select currency"
                  searchPlaceholder="Search currencies…"
                  emptyMessage="No currency found."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Settings */}
        {/* <Card className="rounded-2xl border-neutral-200/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800 shadow-sm">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-neutral-900">Notification Preferences</CardTitle>
                <CardDescription>Manage how and when you receive order status updates and alert messages</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 divide-y divide-neutral-100 pt-2">
            <div className="flex items-center justify-between pb-4">
              <div className="space-y-0.5 pr-4">
                <Label className="text-sm font-semibold text-neutral-900">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive invoices and transaction status receipts via email</p>
              </div>
              <Switch checked={emailNotify} onCheckedChange={setEmailNotify} />
            </div>

            <div className="flex items-center justify-between py-4">
              <div className="space-y-0.5 pr-4">
                <Label className="text-sm font-semibold text-neutral-900">SMS / Mobile Alerts</Label>
                <p className="text-xs text-muted-foreground">Receive real-time text message notifications on delivery status</p>
              </div>
              <Switch checked={smsNotify} onCheckedChange={setSmsNotify} />
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="space-y-0.5 pr-4">
                <Label className="text-sm font-semibold text-neutral-900">Marketing & Promotional Offers</Label>
                <p className="text-xs text-muted-foreground">Get notified about discounts, double-points days, and voucher campaigns</p>
              </div>
              <Switch checked={promoNotify} onCheckedChange={setPromoNotify} />
            </div>
          </CardContent>
        </Card> */}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="rounded-xl h-10 px-8 bg-neutral-900 text-white font-semibold hover:bg-neutral-800"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  )
}
