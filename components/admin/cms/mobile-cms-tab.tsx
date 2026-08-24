// @ts-nocheck
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { TabsContent } from '@/components/ui/tabs'
import {
  Image as ImageIcon,
  Smartphone,
  Shield,
  Zap,
  Gift,
  Bell,
  Sparkles,
  HelpCircle,
  Upload,
  X,
  ChevronRight,
  Info,
  CheckCircle2,
} from 'lucide-react'
import { useCmsEditor } from '@/app/admin/cms/hooks/cms-editor-context'

export function MobileCmsTab() {
  const {
    content,
    handleUpload,
    updateMobileHomeScreen,
    updateMobileHelpScreen,
  } = useCmsEditor()

  const [activeScreen, setActiveScreen] = useState<'home' | 'help'>('home')
  const [showWelcomePopupPreview, setShowWelcomePopupPreview] = useState(false)

  const homeScreen = content.mobileCms?.homeScreen || {
    logoImage: '',
    bgBannerImage: '',
    titleLine1: 'Instant International',
    titleLine2: 'Top-Up',
    titleLine2ColorToggle: true,
    titleLine2ColorCode: '#FF6B00',
    subtitle: 'anytime, anywhere\nFast, Secure & Hassle-free',
    welcomePopupIcon: 'gift',
    welcomePopupTitle: 'Welcome to ITU Mobile',
    welcomePopupDescription: 'Get special top-up offers now!',
    sendTopUpTitle: 'Send Top-Up',
    sendTopUpSubtitle: 'Enter the phone number you want to recharge',
    cards: [
      { id: 'm-card-1', icon: 'shield', title: 'Secure Payments', description: '100% Safe & Trusted' },
      { id: 'm-card-2', icon: 'zap', title: 'Instant Top-Up', description: 'In Seconds' },
    ],
    popularTopUpTitle: 'Popular Top-Up',
    rewardPointsIcon: '',
    rewardPointsTitle: 'Earn Rewards on Every Top-Up!',
    rewardPointsSubtitle: 'Top-up more, earn more points',
    rewardPointsButtonText: 'View Points >',
  }

  const helpScreen = content.mobileCms?.helpScreen || {
    cardLeftIcon: '',
    bannerMiddleImage: '',
    title: 'How can we help you?',
    description: 'Find answers, track your top-ups, or reach out to our 24/7 support team.',
  }

  const updateCardField = (index: number, field: string, value: string) => {
    const updatedCards = [...(homeScreen.cards || [])]
    if (updatedCards[index]) {
      updatedCards[index] = { ...updatedCards[index], [field]: value }
      updateMobileHomeScreen({ cards: updatedCards })
    }
  }

  return (
    <TabsContent value="mobile-cms" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <Smartphone className="h-3.5 w-3.5" />
            Mobile App Content Management
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Mobile App CMS</h2>
          <p className="text-slate-300 text-sm">
            Customize mobile app screens, hero banners, feature cards, and reward sections screen-wise.
          </p>
        </div>

        {/* Screen Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveScreen('home')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeScreen === 'home'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            HomeScreen
          </button>
          <button
            type="button"
            onClick={() => setActiveScreen('help')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeScreen === 'help'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            HelpScreen
          </button>
        </div>
      </div>

      {/* Main Form Controls Container */}
      <div className="space-y-6">
        {activeScreen === 'home' ? (
          <>
            {/* 1. Hero Banner Section */}
              <Card className="border-blue-100 dark:border-blue-900/40 shadow-sm">
                <CardHeader className="bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100/60 dark:border-blue-900/30">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-900 dark:text-blue-200">
                    <ImageIcon className="h-4 w-4 text-blue-600" />
                    1. Hero Banner Section
                  </CardTitle>
                  <CardDescription>
                    Configure app logo, header background banner, title lines, subtitle, and accent color.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <Label className="font-semibold text-xs text-slate-700 dark:text-slate-300">Logo Upload</Label>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <div className="relative h-14 w-14 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {homeScreen.logoImage ? (
                          <img src={homeScreen.logoImage} alt="Logo" className="h-full w-full object-contain p-1" />
                        ) : (
                          <span className="text-xs font-bold text-white">ITU</span>
                        )}
                        {homeScreen.logoImage && (
                          <button
                            type="button"
                            onClick={() => updateMobileHomeScreen({ logoImage: '' })}
                            className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 space-y-2 w-full">
                        <Input
                          placeholder="Image URL (https://...)"
                          value={homeScreen.logoImage || ''}
                          onChange={(e) => updateMobileHomeScreen({ logoImage: e.target.value })}
                          className="text-xs"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => void handleUpload(e.target.files?.[0], (url) => updateMobileHomeScreen({ logoImage: url }))}
                            className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Background Banner Image */}
                  <div className="space-y-2">
                    <Label className="font-semibold text-xs text-slate-700 dark:text-slate-300">Background Banner Image</Label>
                    <Input
                      placeholder="Background Image URL (https://...)"
                      value={homeScreen.bgBannerImage || ''}
                      onChange={(e) => updateMobileHomeScreen({ bgBannerImage: e.target.value })}
                      className="text-xs"
                    />
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handleUpload(e.target.files?.[0], (url) => updateMobileHomeScreen({ bgBannerImage: url }))}
                      className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    {homeScreen.bgBannerImage ? (
                      <div className="relative h-24 rounded-lg overflow-hidden border border-slate-200">
                        <img src={homeScreen.bgBannerImage} alt="Background preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => updateMobileHomeScreen({ bgBannerImage: '' })}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* Title Line 1 & Line 2 */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="font-semibold text-xs">Title</Label>
                      <Input
                        value={homeScreen.titleLine1}
                        onChange={(e) => updateMobileHomeScreen({ titleLine1: e.target.value })}
                        placeholder="e.g. Instant International"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-xs">Title</Label>
                      <Input
                        value={homeScreen.titleLine2}
                        onChange={(e) => updateMobileHomeScreen({ titleLine2: e.target.value })}
                        placeholder="e.g. Top-Up"
                      />
                    </div>
                  </div>

                  {/* Line 2 Color Toggle & Code */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="font-semibold text-xs">Apply Color to Title Line 2</Label>
                        <p className="text-[11px] text-muted-foreground">Toggle accent highlighting on line 2 text</p>
                      </div>
                      <Switch
                        checked={homeScreen.titleLine2ColorToggle}
                        onCheckedChange={(val) => updateMobileHomeScreen({ titleLine2ColorToggle: val })}
                      />
                    </div>
                    {homeScreen.titleLine2ColorToggle && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                        <Label className="font-semibold text-xs">Line 2 Color Code</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="color"
                            value={homeScreen.titleLine2ColorCode || '#FF6B00'}
                            onChange={(e) => updateMobileHomeScreen({ titleLine2ColorCode: e.target.value })}
                            className="w-12 h-9 p-1 cursor-pointer rounded"
                          />
                          <Input
                            value={homeScreen.titleLine2ColorCode}
                            onChange={(e) => updateMobileHomeScreen({ titleLine2ColorCode: e.target.value })}
                            placeholder="#FF6B00"
                            className="font-mono text-xs uppercase"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hero Subtitle */}
                  <div className="space-y-2">
                    <Label className="font-semibold text-xs">Hero Subtitle</Label>
                    <Textarea
                      rows={2}
                      value={homeScreen.subtitle}
                      onChange={(e) => updateMobileHomeScreen({ subtitle: e.target.value })}
                      placeholder="e.g. anytime, anywhere&#10;Fast, Secure & Hassle-free"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 2. Welcome Section Popup */}
              <Card className="border-indigo-100 dark:border-indigo-900/40 shadow-sm">
                <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100/60 dark:border-indigo-900/30">
                  <CardTitle className="text-base flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    2. Welcome Section Popup
                  </CardTitle>
                  <CardDescription>
                    Popup model parameters shown when user opens the app.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  {/* Popup Icon Upload & Title */}
                  <div className="space-y-2">
                    <Label className="font-semibold text-xs">Popup Icon Upload (Image or Icon Key)</Label>
                    <Input
                      value={homeScreen.welcomePopupIcon || ''}
                      onChange={(e) => updateMobileHomeScreen({ welcomePopupIcon: e.target.value })}
                      placeholder="Image URL (https://...) or gift, sparkles, bell"
                      className="text-xs"
                    />
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handleUpload(e.target.files?.[0], (url) => updateMobileHomeScreen({ welcomePopupIcon: url }))}
                      className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    {homeScreen.welcomePopupIcon && (homeScreen.welcomePopupIcon.startsWith('http') || homeScreen.welcomePopupIcon.startsWith('data:') || homeScreen.welcomePopupIcon.includes('/')) ? (
                      <div className="relative h-14 w-14 rounded-xl border border-slate-200 bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        <img src={homeScreen.welcomePopupIcon} alt="Popup Icon" className="h-full w-full object-contain p-1" />
                        <button
                          type="button"
                          onClick={() => updateMobileHomeScreen({ welcomePopupIcon: '' })}
                          className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-xs">Popup Title</Label>
                    <Input
                      value={homeScreen.welcomePopupTitle || ''}
                      onChange={(e) => updateMobileHomeScreen({ welcomePopupTitle: e.target.value })}
                      placeholder="e.g. Welcome to ITU Mobile"
                    />
                  </div>

                  {/* Popup Description with 30-char limit */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold text-xs">
                        Popup Description{' '}
                        <span className="text-[11px] font-normal text-amber-600 dark:text-amber-400">
                          (Max 30 chars limit)
                        </span>
                      </Label>
                      <span
                        className={`text-xs font-mono font-semibold ${(homeScreen.welcomePopupDescription || '').length > 30
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                      >
                        {(homeScreen.welcomePopupDescription || '').length}/30 chars
                      </span>
                    </div>
                    <Input
                      maxLength={35}
                      value={homeScreen.welcomePopupDescription || ''}
                      onChange={(e) => updateMobileHomeScreen({ welcomePopupDescription: e.target.value })}
                      placeholder="e.g. Get special top-up offers now!"
                      className={(homeScreen.welcomePopupDescription || '').length > 30 ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {(homeScreen.welcomePopupDescription || '').length > 30 && (
                      <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                        <Info className="h-3 w-3" /> Description exceeds 30 characters limit!
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 3. Send Top-Up Section */}
              <Card className="border-emerald-100 dark:border-emerald-900/40 shadow-sm">
                <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100/60 dark:border-emerald-900/30">
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                    <Zap className="h-4 w-4 text-emerald-600" />
                    3. Send Top-Up Section
                  </CardTitle>
                  <CardDescription>
                    Configure main top-up section titles and two feature cards below the input field.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="font-semibold text-xs">Section Title</Label>
                      <Input
                        value={homeScreen.sendTopUpTitle}
                        onChange={(e) => updateMobileHomeScreen({ sendTopUpTitle: e.target.value })}
                        placeholder="e.g. Send Top-Up"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-xs">Section Subtitle</Label>
                      <Input
                        value={homeScreen.sendTopUpSubtitle}
                        onChange={(e) => updateMobileHomeScreen({ sendTopUpSubtitle: e.target.value })}
                        placeholder="e.g. Enter the phone number..."
                      />
                    </div>
                  </div>

                  {/* Feature Cards List */}
                  <div className="space-y-4 pt-2">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">
                      Feature Cards (Max 2 Cards)
                    </Label>
                    {(homeScreen.cards || []).map((card, idx) => (
                      <div key={card.id || idx} className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            {idx === 0 ? <Shield className="h-3.5 w-3.5 text-blue-500" /> : <Zap className="h-3.5 w-3.5 text-amber-500" />}
                            Feature Card {idx + 1}
                          </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Icon Upload (Image or Key)</Label>
                            <Input
                              value={card.icon}
                              onChange={(e) => updateCardField(idx, 'icon', e.target.value)}
                              placeholder="shield, zap, or image URL"
                              className="text-xs"
                            />
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => void handleUpload(e.target.files?.[0], (url) => updateCardField(idx, 'icon', url))}
                              className="text-xs file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                            />
                            {card.icon && (card.icon.startsWith('http') || card.icon.startsWith('data:') || card.icon.includes('/')) ? (
                              <div className="relative h-10 w-10 rounded-lg border border-slate-200 bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                <img src={card.icon} alt="Card Icon" className="h-full w-full object-contain p-0.5" />
                                <button
                                  type="button"
                                  onClick={() => updateCardField(idx, 'icon', '')}
                                  className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Title</Label>
                            <Input
                              value={card.title}
                              onChange={(e) => updateCardField(idx, 'title', e.target.value)}
                              placeholder="Card Title"
                              className="text-xs"
                            />
                          </div>
                        </div>

                        {/* Feature Description with 20-char limit */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">
                              Feature Description{' '}
                              <span className="text-[11px] text-amber-600 dark:text-amber-400">
                                (Max 20 chars limit)
                              </span>
                            </Label>
                            <span
                              className={`text-[11px] font-mono font-semibold ${(card.description || '').length > 20
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                            >
                              {(card.description || '').length}/20 chars
                            </span>
                          </div>
                          <Input
                            maxLength={25}
                            value={card.description}
                            onChange={(e) => updateCardField(idx, 'description', e.target.value)}
                            placeholder="e.g. 100% Safe & Trusted"
                            className={`text-xs ${(card.description || '').length > 20 ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                          />
                          {(card.description || '').length > 20 && (
                            <p className="text-[11px] text-red-500 font-medium">
                              Feature description exceeds 20 chars limit!
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 4. Popular Top-Up Section */}
              <Card className="border-amber-100 dark:border-amber-900/40 shadow-sm">
                <CardHeader className="bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-100/60 dark:border-amber-900/30">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    4. Popular Top-Up Section
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <div className="space-y-2">
                    <Label className="font-semibold text-xs">Popular Top-Up Section Title</Label>
                    <Input
                      value={homeScreen.popularTopUpTitle}
                      onChange={(e) => updateMobileHomeScreen({ popularTopUpTitle: e.target.value })}
                      placeholder="e.g. Popular Top-Up"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 5. Reward Points Gift Card Section */}
              <Card className="border-purple-100 dark:border-purple-900/40 shadow-sm">
                <CardHeader className="bg-purple-50/50 dark:bg-purple-950/20 border-b border-purple-100/60 dark:border-purple-900/30">
                  <CardTitle className="text-base flex items-center gap-2 text-purple-900 dark:text-purple-200">
                    <Gift className="h-4 w-4 text-purple-600" />
                    5. Reward Points Gift Card Section
                  </CardTitle>
                  <CardDescription>
                    Configure bottom card icon, title, subtitle, and action button label.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <div className="space-y-2">
                    <Label className="font-semibold text-xs">Gift Icon (Upload or Image URL)</Label>
                    <Input
                      value={homeScreen.rewardPointsIcon || ''}
                      onChange={(e) => updateMobileHomeScreen({ rewardPointsIcon: e.target.value })}
                      placeholder="Image URL or gift icon name"
                      className="text-xs"
                    />
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handleUpload(e.target.files?.[0], (url) => updateMobileHomeScreen({ rewardPointsIcon: url }))}
                      className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="font-semibold text-xs">Card Title</Label>
                      <Input
                        value={homeScreen.rewardPointsTitle}
                        onChange={(e) => updateMobileHomeScreen({ rewardPointsTitle: e.target.value })}
                        placeholder="Earn Rewards on Every Top-Up!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-xs">Card Subtitle</Label>
                      <Input
                        value={homeScreen.rewardPointsSubtitle}
                        onChange={(e) => updateMobileHomeScreen({ rewardPointsSubtitle: e.target.value })}
                        placeholder="Top-up more, earn more points"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-xs">Button Text</Label>
                    <Input
                      value={homeScreen.rewardPointsButtonText}
                      onChange={(e) => updateMobileHomeScreen({ rewardPointsButtonText: e.target.value })}
                      placeholder="View Points >"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* HelpScreen Section Form */
            <Card className="border-sky-100 dark:border-sky-900/40 shadow-sm">
              <CardHeader className="bg-sky-50/50 dark:bg-sky-950/20 border-b border-sky-100/60 dark:border-sky-900/30">
                <CardTitle className="text-base flex items-center gap-2 text-sky-900 dark:text-sky-200">
                  <HelpCircle className="h-4 w-4 text-sky-600" />
                  Banner Card Section (HelpScreen)
                </CardTitle>
                <CardDescription>
                  Configure card left icon, banner middle image, title, and description for the HelpScreen.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                {/* Left Icon */}
                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Card Left Icon (Upload or Image URL)</Label>
                  <Input
                    value={helpScreen.cardLeftIcon || ''}
                    onChange={(e) => updateMobileHelpScreen({ cardLeftIcon: e.target.value })}
                    placeholder="https://... or icon key"
                    className="text-xs"
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleUpload(e.target.files?.[0], (url) => updateMobileHelpScreen({ cardLeftIcon: url }))}
                    className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>

                {/* Banner Middle Image */}
                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Banner Middle Image (Upload or URL)</Label>
                  <Input
                    value={helpScreen.bannerMiddleImage || ''}
                    onChange={(e) => updateMobileHelpScreen({ bannerMiddleImage: e.target.value })}
                    placeholder="https://..."
                    className="text-xs"
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleUpload(e.target.files?.[0], (url) => updateMobileHelpScreen({ bannerMiddleImage: url }))}
                    className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {helpScreen.bannerMiddleImage ? (
                    <div className="relative h-28 rounded-xl overflow-hidden border border-slate-200">
                      <img src={helpScreen.bannerMiddleImage} alt="Middle banner" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => updateMobileHelpScreen({ bannerMiddleImage: '' })}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Title</Label>
                  <Input
                    value={helpScreen.title}
                    onChange={(e) => updateMobileHelpScreen({ title: e.target.value })}
                    placeholder="e.g. How can we help you?"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Description</Label>
                  <Textarea
                    rows={3}
                    value={helpScreen.description}
                    onChange={(e) => updateMobileHelpScreen({ description: e.target.value })}
                    placeholder="Help screen description text..."
                  />
                </div>
              </CardContent>
            </Card>
          )}
      </div>
    </TabsContent>
  )
}
