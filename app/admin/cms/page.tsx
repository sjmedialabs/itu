'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useCMSStore, FAQItem, PopularCountry } from '@/lib/cms-store'
import { 
  Image as ImageIcon, 
  Type, 
  Smartphone, 
  HelpCircle, 
  Globe, 
  Settings, 
  Save, 
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Eye,
  ExternalLink,
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'

export default function CMSPage() {
  const { 
    content, 
    isDirty,
    updateHero, 
    updateServiceToggle,
    updateTopupCard, 
    updateAppPromo,
    updateFAQ,
    updateCountriesSection,
    addFAQItem,
    updateFAQItem,
    deleteFAQItem,
    updatePopularCountries,
    updateTrustSection,
    updateHeader,
    updateFooter,
    resetToDefault,
    markClean
  } = useCMSStore()

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [editingFAQ, setEditingFAQ] = useState<FAQItem | null>(null)
  const [newFAQ, setNewFAQ] = useState({ question: '', answer: '' })
  const [editingCountry, setEditingCountry] = useState<PopularCountry | null>(null)
  const [newCountry, setNewCountry] = useState({ code: '', name: '', flag: '', dialCode: '' })

  const fileToDataUrl = async (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })

  const handleUpload = async (file: File | undefined, onDone: (url: string) => void) => {
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    if (dataUrl) onDone(dataUrl)
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    markClean()
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  return (
    <div className="space-y-6 p-4 sm:p-5 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Website CMS</h1>
          <p className="text-muted-foreground">Manage all website content, images, and sections</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/" target="_blank" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview Site
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset to Default
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all content?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset all website content to default values. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetToDefault}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={handleSave} disabled={!isDirty || saveStatus === 'saving'} className="gap-2">
            {saveStatus === 'saving' ? (
              <>Saving...</>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {isDirty && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
          You have unsaved changes. Click &quot;Save Changes&quot; to publish your updates.
        </div>
      )}

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="hero" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Hero</span>
          </TabsTrigger>
          <TabsTrigger value="topup" className="gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Top-up Card</span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">FAQ</span>
          </TabsTrigger>
          <TabsTrigger value="countries" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Countries</span>
          </TabsTrigger>
          <TabsTrigger value="app" className="gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">App Promo</span>
          </TabsTrigger>
          <TabsTrigger value="footer" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Footer</span>
          </TabsTrigger>
        </TabsList>

        {/* Hero Section */}
        <TabsContent value="hero" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
              <CardDescription>Configure the main hero banner with parallax background</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hero-title">Hero Title</Label>
                  <Input
                    id="hero-title"
                    value={content.hero.title}
                    onChange={(e) => updateHero({ title: e.target.value })}
                    placeholder="Send mobile top-ups instantly"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero-subtitle">Subtitle</Label>
                  <Input
                    id="hero-subtitle"
                    value={content.hero.subtitle}
                    onChange={(e) => updateHero({ subtitle: e.target.value })}
                    placeholder="99% of mobile recharges..."
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hero-image">Background Image URL</Label>
                <Input
                  id="hero-image"
                  value={content.hero.backgroundImage}
                  onChange={(e) => updateHero({ backgroundImage: e.target.value })}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">Enter an image URL or upload to your media library</p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleUpload(e.target.files?.[0], (url) => updateHero({ backgroundImage: url }))}
                />
              </div>

              {content.hero.backgroundImage && (
                <div className="relative h-40 rounded-lg overflow-hidden border">
                  <img
                    src={content.hero.backgroundImage}
                    alt="Hero preview"
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-r ${content.hero.overlayGradient}`} />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="hero-gradient">Overlay Gradient (Tailwind classes)</Label>
                <Input
                  id="hero-gradient"
                  value={content.hero.overlayGradient}
                  onChange={(e) => updateHero({ overlayGradient: e.target.value })}
                  placeholder="from-[#0d4a6e]/90 via-[#0d6a8e]/80 to-[#3d8ab0]/70"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show &quot;Welcome back&quot; for logged-in users</Label>
                  <p className="text-xs text-muted-foreground">Personalize the greeting when users are logged in</p>
                </div>
                <Switch
                  checked={content.hero.showWelcomeBack}
                  onCheckedChange={(checked) => updateHero({ showWelcomeBack: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Toggle</CardTitle>
              <CardDescription>Configure the Vouchers/Top-up toggle buttons</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="toggle-label">Toggle Label</Label>
                <Input
                  id="toggle-label"
                  value={content.serviceToggle.label}
                  onChange={(e) => updateServiceToggle({ label: e.target.value })}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vouchers-label">Vouchers Button Text</Label>
                  <Input
                    id="vouchers-label"
                    value={content.serviceToggle.vouchersLabel}
                    onChange={(e) => updateServiceToggle({ vouchersLabel: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topup-label">Top-up Button Text</Label>
                  <Input
                    id="topup-label"
                    value={content.serviceToggle.topupLabel}
                    onChange={(e) => updateServiceToggle({ topupLabel: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topup-section-image">Section Image URL</Label>
                <Input
                  id="topup-section-image"
                  value={content.topupCard.sectionImage || ''}
                  onChange={(e) => updateTopupCard({ sectionImage: e.target.value })}
                  placeholder="https://..."
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleUpload(e.target.files?.[0], (url) => updateTopupCard({ sectionImage: url }))}
                />
              </div>

              {content.topupCard.sectionImage && (
                <div className="relative h-40 overflow-hidden rounded-lg border">
                  <img src={content.topupCard.sectionImage} alt="Top-up section preview" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label>Show Vouchers Option</Label>
                <Switch
                  checked={content.serviceToggle.showVouchers}
                  onCheckedChange={(checked) => updateServiceToggle({ showVouchers: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top-up Card */}
        <TabsContent value="topup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top-up Card</CardTitle>
              <CardDescription>Configure the main action card overlay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-title">Card Title</Label>
                <Input
                  id="card-title"
                  value={content.topupCard.title}
                  onChange={(e) => updateTopupCard({ title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-placeholder">Input Placeholder</Label>
                <Input
                  id="card-placeholder"
                  value={content.topupCard.placeholder}
                  onChange={(e) => updateTopupCard({ placeholder: e.target.value })}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="card-button">Button Text</Label>
                  <Input
                    id="card-button"
                    value={content.topupCard.buttonText}
                    onChange={(e) => updateTopupCard({ buttonText: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-color">Button Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="card-color"
                      type="color"
                      value={content.topupCard.buttonColor}
                      onChange={(e) => updateTopupCard({ buttonColor: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={content.topupCard.buttonColor}
                      onChange={(e) => updateTopupCard({ buttonColor: e.target.value })}
                      placeholder="#00b67a"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">Preview:</p>
                <div className="max-w-sm mx-auto bg-card rounded-xl p-4 shadow-lg">
                  <p className="text-center font-semibold mb-3">{content.topupCard.title}</p>
                  <div className="flex items-center border rounded-lg overflow-hidden bg-muted/30 mb-3">
                    <span className="px-3 py-2 border-r">🇮🇳</span>
                    <span className="px-3 py-2 text-muted-foreground">{content.topupCard.placeholder}</span>
                  </div>
                  <button
                    className="w-full py-2.5 rounded-lg text-white font-medium"
                    style={{ backgroundColor: content.topupCard.buttonColor }}
                  >
                    {content.topupCard.buttonText}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Section */}
        <TabsContent value="faq" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>FAQ Section</CardTitle>
                  <CardDescription>Manage frequently asked questions</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add FAQ
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New FAQ</DialogTitle>
                      <DialogDescription>Create a new frequently asked question</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Question</Label>
                        <Input
                          value={newFAQ.question}
                          onChange={(e) => setNewFAQ({ ...newFAQ, question: e.target.value })}
                          placeholder="What is your question?"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Answer</Label>
                        <Textarea
                          value={newFAQ.answer}
                          onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
                          placeholder="Provide a detailed answer..."
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          if (newFAQ.question && newFAQ.answer) {
                            addFAQItem({ ...newFAQ, isActive: true })
                            setNewFAQ({ question: '', answer: '' })
                          }
                        }}
                      >
                        Add FAQ
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="faq-title">Section Title</Label>
                <Input
                  id="faq-title"
                  value={content.faq.title}
                  onChange={(e) => updateFAQ({ title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faq-image">FAQ Image URL</Label>
                <Input
                  id="faq-image"
                  value={content.faq.sectionImage || ''}
                  onChange={(e) => updateFAQ({ sectionImage: e.target.value })}
                  placeholder="https://..."
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleUpload(e.target.files?.[0], (url) => updateFAQ({ sectionImage: url }))}
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className="w-20">Active</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {content.faq.items
                    .sort((a, b) => a.order - b.order)
                    .map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{item.question}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{item.answer}</p>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.isActive}
                          onCheckedChange={(checked) => updateFAQItem(item.id, { isActive: checked })}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setEditingFAQ(item)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit FAQ</DialogTitle>
                              </DialogHeader>
                              {editingFAQ && (
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Question</Label>
                                    <Input
                                      value={editingFAQ.question}
                                      onChange={(e) => setEditingFAQ({ ...editingFAQ, question: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Answer</Label>
                                    <Textarea
                                      value={editingFAQ.answer}
                                      onChange={(e) => setEditingFAQ({ ...editingFAQ, answer: e.target.value })}
                                      rows={4}
                                    />
                                  </div>
                                </div>
                              )}
                              <DialogFooter>
                                <Button
                                  onClick={() => {
                                    if (editingFAQ) {
                                      updateFAQItem(editingFAQ.id, editingFAQ)
                                      setEditingFAQ(null)
                                    }
                                  }}
                                >
                                  Save Changes
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete FAQ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this FAQ item.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteFAQItem(item.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Popular Countries */}
        <TabsContent value="countries" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Popular Countries</CardTitle>
                  <CardDescription>Manage featured destination countries</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Country
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Popular Country</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Country Code</Label>
                          <Input
                            value={newCountry.code}
                            onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value.toUpperCase() })}
                            placeholder="IN"
                            maxLength={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Flag Emoji</Label>
                          <Input
                            value={newCountry.flag}
                            onChange={(e) => setNewCountry({ ...newCountry, flag: e.target.value })}
                            placeholder="🇮🇳"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Country Name</Label>
                        <Input
                          value={newCountry.name}
                          onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })}
                          placeholder="India"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Dial Code</Label>
                        <Input
                          value={newCountry.dialCode}
                          onChange={(e) => setNewCountry({ ...newCountry, dialCode: e.target.value })}
                          placeholder="+91"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          if (newCountry.code && newCountry.name) {
                            const maxOrder = Math.max(...content.popularCountries.map(c => c.order), 0)
                            updatePopularCountries([
                              ...content.popularCountries,
                              { ...newCountry, order: maxOrder + 1, isActive: true }
                            ])
                            setNewCountry({ code: '', name: '', flag: '', dialCode: '' })
                          }
                        }}
                      >
                        Add Country
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="countries-image">Countries Section Image URL</Label>
                <Input
                  id="countries-image"
                  value={content.countriesSection?.sectionImage || ''}
                  onChange={(e) => updateCountriesSection({ sectionImage: e.target.value })}
                  placeholder="https://..."
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleUpload(e.target.files?.[0], (url) => updateCountriesSection({ sectionImage: url }))}
                />
              </div>

              {content.countriesSection?.sectionImage && (
                <div className="relative h-40 overflow-hidden rounded-lg border">
                  <img
                    src={content.countriesSection.sectionImage}
                    alt="Countries section preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Dial Code</TableHead>
                    <TableHead className="w-20">Active</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {content.popularCountries
                    .sort((a, b) => a.order - b.order)
                    .map((country) => (
                    <TableRow key={country.code}>
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{country.flag}</span>
                          <span>{country.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{country.code}</TableCell>
                      <TableCell>{country.dialCode}</TableCell>
                      <TableCell>
                        <Switch
                          checked={country.isActive}
                          onCheckedChange={(checked) => {
                            const updated = content.popularCountries.map(c =>
                              c.code === country.code ? { ...c, isActive: checked } : c
                            )
                            updatePopularCountries(updated)
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            updatePopularCountries(
                              content.popularCountries.filter(c => c.code !== country.code)
                            )
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* App Promo */}
        <TabsContent value="app" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>App Promotion Section</CardTitle>
              <CardDescription>Configure the mobile app download section</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="app-title">Title</Label>
                  <Input
                    id="app-title"
                    value={content.appPromo.title}
                    onChange={(e) => updateAppPromo({ title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-subtitle">Subtitle</Label>
                  <Input
                    id="app-subtitle"
                    value={content.appPromo.subtitle}
                    onChange={(e) => updateAppPromo({ subtitle: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="app-gradient">Background Gradient</Label>
                <Input
                  id="app-gradient"
                  value={content.appPromo.backgroundGradient}
                  onChange={(e) => updateAppPromo({ backgroundGradient: e.target.value })}
                  placeholder="from-[#e8f4f8] to-[#f0f7fa]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="app-image">App Promo Image URL</Label>
                <Input
                  id="app-image"
                  value={content.appPromo.sectionImage || ''}
                  onChange={(e) => updateAppPromo({ sectionImage: e.target.value })}
                  placeholder="https://..."
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleUpload(e.target.files?.[0], (url) => updateAppPromo({ sectionImage: url }))}
                />
              </div>

              {content.appPromo.sectionImage && (
                <div className="relative h-40 overflow-hidden rounded-lg border">
                  <img src={content.appPromo.sectionImage} alt="App promo preview" className="h-full w-full object-cover" />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Show App Store Button</p>
                    <p className="text-xs text-muted-foreground">iOS download link</p>
                  </div>
                  <Switch
                    checked={content.appPromo.showAppStore}
                    onCheckedChange={(checked) => updateAppPromo({ showAppStore: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Show Google Play Button</p>
                    <p className="text-xs text-muted-foreground">Android download link</p>
                  </div>
                  <Switch
                    checked={content.appPromo.showGooglePlay}
                    onCheckedChange={(checked) => updateAppPromo({ showGooglePlay: checked })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="appstore-url">App Store URL</Label>
                  <Input
                    id="appstore-url"
                    value={content.appPromo.appStoreUrl}
                    onChange={(e) => updateAppPromo({ appStoreUrl: e.target.value })}
                    placeholder="https://apps.apple.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playstore-url">Google Play URL</Label>
                  <Input
                    id="playstore-url"
                    value={content.appPromo.googlePlayUrl}
                    onChange={(e) => updateAppPromo({ googlePlayUrl: e.target.value })}
                    placeholder="https://play.google.com/..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Footer */}
        <TabsContent value="footer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Footer Settings</CardTitle>
              <CardDescription>Configure footer content and links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand-tagline">Brand Tagline</Label>
                <Input
                  id="brand-tagline"
                  value={content.footer.brandTagline}
                  onChange={(e) => updateFooter({ brandTagline: e.target.value })}
                  placeholder="A little goes a long way"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trust-badge">Trust Badge Text</Label>
                <Input
                  id="trust-badge"
                  value={content.footer.trustBadgeText}
                  onChange={(e) => updateFooter({ trustBadgeText: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer-bg-image">Footer Background Image URL</Label>
                <Input
                  id="footer-bg-image"
                  value={content.footer.backgroundImage || ''}
                  onChange={(e) => updateFooter({ backgroundImage: e.target.value })}
                  placeholder="https://..."
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleUpload(e.target.files?.[0], (url) => updateFooter({ backgroundImage: url }))}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Facebook URL</Label>
                  <Input
                    value={content.footer.socialLinks.facebook}
                    onChange={(e) => updateFooter({ 
                      socialLinks: { ...content.footer.socialLinks, facebook: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Twitter URL</Label>
                  <Input
                    value={content.footer.socialLinks.twitter}
                    onChange={(e) => updateFooter({ 
                      socialLinks: { ...content.footer.socialLinks, twitter: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instagram URL</Label>
                  <Input
                    value={content.footer.socialLinks.instagram}
                    onChange={(e) => updateFooter({ 
                      socialLinks: { ...content.footer.socialLinks, instagram: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input
                    value={content.footer.socialLinks.linkedin}
                    onChange={(e) => updateFooter({ 
                      socialLinks: { ...content.footer.socialLinks, linkedin: e.target.value }
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
