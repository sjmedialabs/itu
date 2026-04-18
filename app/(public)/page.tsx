'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Check, ChevronDown, Search, Shield, Zap, Globe, Apple, Play, ArrowRight, Headphones, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRechargeStore, useAuthStore } from '@/lib/stores'
import { useCMSStore } from '@/lib/cms-store'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { HeroPaymentLogos } from '@/components/hero-payment-logos'

const allCountries = [
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', dialCode: '+63' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', dialCode: '+52' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dialCode: '+880' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dialCode: '+92' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dialCode: '+233' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dialCode: '+254' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', dialCode: '+55' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', dialCode: '+57' },
]

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { setCountry, setPhoneNumber, resetRecharge } = useRechargeStore()
  const { content } = useCMSStore()
  const [selectedCountry, setSelectedCountry] = useState<(typeof allCountries)[0] | null>(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)

  useEffect(() => {
    resetRecharge()
  }, [resetRecharge])

  const handleStartTopUp = () => {
    if (phoneInput && selectedCountry) {
      setCountry({
        code: selectedCountry.code,
        name: selectedCountry.name,
        flag: selectedCountry.flag,
        dialCode: selectedCountry.dialCode,
        dialingInfo: [{ prefix: selectedCountry.dialCode, minLength: 10, maxLength: 15 }],
      })
      setPhoneNumber(phoneInput)
    }
    router.push('/recharge')
  }

  const popularCountries = content.popularCountries.filter((c) => c.isActive).sort((a, b) => a.order - b.order)
  const faqItems = content.faq.items.filter((i) => i.isActive).sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b border-neutral-200/90 bg-hero-landing">
        <div className="container relative mx-auto px-4 pb-14 pt-4 md:pb-16 md:pt-6 lg:pb-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-20">
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 mx-auto max-w-xl space-y-6 text-center lg:pt-4">
              <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight text-primary md:text-5xl lg:text-[3.25rem]">
                {content.hero.showWelcomeBack && user ? `Welcome back ${user.name}` : content.hero.title}
              </h1>
              <p className="text-lg leading-relaxed text-neutral-600 md:text-xl">{content.hero.subtitle}</p>
              <div className="flex flex-wrap justify-center gap-3 pt-1">
                {content.appPromo.showAppStore && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 gap-2 rounded-full border-neutral-900 bg-neutral-950 px-5 text-white shadow-md hover:bg-neutral-900 hover:text-white"
                    asChild
                  >
                    <a href={content.appPromo.appStoreUrl}>
                      <Apple className="h-5 w-5 shrink-0" />
                      <span className="text-left text-[11px] leading-tight">
                        <span className="block text-[9px] font-medium uppercase tracking-wide text-white/70">
                          Download on the
                        </span>
                        <span className="text-sm font-semibold">App Store</span>
                      </span>
                    </a>
                  </Button>
                )}
                {content.appPromo.showGooglePlay && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 gap-2 rounded-full border-neutral-900 bg-neutral-950 px-5 text-white shadow-md hover:bg-neutral-900 hover:text-white"
                    asChild
                  >
                    <a href={content.appPromo.googlePlayUrl}>
                      <Play className="h-5 w-5 shrink-0" />
                      <span className="text-left text-[11px] leading-tight">
                        <span className="block text-[9px] font-medium uppercase tracking-wide text-white/70">Get it on</span>
                        <span className="text-sm font-semibold">Google Play</span>
                      </span>
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-5 duration-500 delay-100 lg:pt-2">
              <Card className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_20px_60px_-24px_rgba(15,23,42,0.18)]">
                <div className="bg-primary px-5 py-3.5 text-center text-sm font-bold uppercase tracking-wide text-primary-foreground sm:text-[0.95rem]">
                  Send a Mobile Top-up Instantly
                </div>

                <div className="border-b border-neutral-200/80 bg-neutral-50/80 px-4 py-5 sm:px-6">
                  {(() => {
                    const steps = [
                      { n: 1, label: 'Enter Number', active: true },
                      { n: 2, label: 'Select Plan', active: false },
                      { n: 3, label: 'Payment', active: false },
                    ] as const
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center px-1 sm:px-2">
                          {steps.map((step, idx) => (
                            <div key={step.n} className="contents">
                              {idx > 0 && <div className="h-px flex-1 bg-neutral-200" aria-hidden />}
                              <div
                                className={cn(
                                  'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm',
                                  step.active ? 'bg-primary' : 'bg-neutral-300',
                                )}
                              >
                                {step.n}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between gap-1 text-[10px] font-semibold uppercase leading-tight tracking-wide text-neutral-600 sm:gap-2 sm:text-[11px]">
                          {steps.map((step) => (
                            <span key={step.n} className="min-w-0 flex-1 text-center">
                              {step.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>

                <CardContent className="space-y-4 bg-white p-6 sm:p-8">
                  <span className="sr-only">{content.topupCard.title}</span>
                  <div className="space-y-2">
                    <label htmlFor="hero-phone" className="text-xs font-semibold text-neutral-600">
                      Enter Details
                    </label>
                    <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200/90 bg-neutral-100 px-4 py-3 text-left text-sm font-medium text-neutral-800 shadow-inner transition-colors hover:bg-neutral-100/80"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {selectedCountry ? (
                              <>
                                <span className="text-xl leading-none">{selectedCountry.flag}</span>
                                <span className="truncate">{selectedCountry.name}</span>
                              </>
                            ) : (
                              <>
                                <Search className="size-4 shrink-0 text-neutral-500" />
                                <span className="text-neutral-500">Select country</span>
                              </>
                            )}
                          </span>
                          <span className="flex shrink-0 items-center gap-2 text-neutral-600">
                            {selectedCountry && (
                              <span className="text-sm font-semibold tabular-nums">{selectedCountry.dialCode}</span>
                            )}
                            <ChevronDown className="size-4 opacity-60" />
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[min(calc(100vw-2rem),22rem)] p-0 sm:w-80" align="start">
                        <Command>
                          <CommandInput placeholder="Search country..." />
                          <CommandList>
                            <CommandEmpty>No country found.</CommandEmpty>
                            <CommandGroup heading="Popular">
                              {popularCountries.map((country) => (
                                <CommandItem
                                  key={country.code}
                                  value={country.name}
                                  onSelect={() => {
                                    setSelectedCountry(country)
                                    setCountryOpen(false)
                                  }}
                                >
                                  <span className="mr-2 text-lg">{country.flag}</span>
                                  <span className="flex-1">{country.name}</span>
                                  <span className="text-sm text-muted-foreground">{country.dialCode}</span>
                                  <Check
                                    className={cn(
                                      'ml-2 h-4 w-4',
                                      selectedCountry?.code === country.code ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                            <CommandGroup heading="All Countries">
                              {allCountries
                                .filter((c) => !popularCountries.find((p) => p.code === c.code))
                                .map((country) => (
                                  <CommandItem
                                    key={country.code}
                                    value={country.name}
                                    onSelect={() => {
                                      setSelectedCountry(country)
                                      setCountryOpen(false)
                                    }}
                                  >
                                    <span className="mr-2 text-lg">{country.flag}</span>
                                    <span className="flex-1">{country.name}</span>
                                    <span className="text-sm text-muted-foreground">{country.dialCode}</span>
                                    <Check
                                      className={cn(
                                        'ml-2 h-4 w-4',
                                        selectedCountry?.code === country.code ? 'opacity-100' : 'opacity-0',
                                      )}
                                    />
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="relative">
                    <Input
                      id="hero-phone"
                      type="tel"
                      placeholder={content.topupCard.placeholder}
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                      className="h-12 rounded-xl border-neutral-200/90 bg-white pr-28 text-base shadow-sm focus-visible:border-primary focus-visible:ring-primary/25"
                    />
                    <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2 text-xs">
                      <span className="pointer-events-auto font-medium capitalize text-neutral-400">airtel</span>
                      <button
                        type="button"
                        onClick={() => setCountryOpen(true)}
                        className="pointer-events-auto font-bold text-primary hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  <Button
                    className="h-12 w-full rounded-full text-base font-bold uppercase tracking-wide text-white shadow-[0_10px_28px_-8px_rgba(227,6,19,0.55)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-primary/92"
                    style={{ backgroundColor: content.topupCard.buttonColor }}
                    size="lg"
                    onClick={handleStartTopUp}
                  >
                    {content.topupCard.buttonText}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <HeroPaymentLogos className="mt-12 border-t border-neutral-200/60 pt-10 md:mt-14 md:pt-12" />
        </div>
      </section>

      <section className="border-b border-border/60 bg-background py-20 md:py-24">
        <div className="container mx-auto grid items-center gap-12 px-4 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-5">
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Instantly recharge phones in 160+ countries
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Pick a destination, choose an amount, and we route your top-up through trusted operator partners with
              real-time delivery tracking—so your loved ones stay connected when it matters most.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-xl px-6 shadow-elevated-sm" asChild>
                <a href="/recharge">
                  Start a top-up
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" className="rounded-xl px-6" asChild>
                <a href="/help">View coverage</a>
              </Button>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" aria-hidden />
            <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-accent/10 blur-2xl" aria-hidden />
            <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-elevated">
              <Image
                src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80"
                alt="Phone recharge success preview"
                width={720}
                height={900}
                className="h-auto w-full object-cover"
              />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-border/60 bg-card/95 p-4 shadow-elevated-sm backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-success/15 text-success">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Recharge successful</p>
                    <p className="text-xs text-muted-foreground">Delivered in seconds · Encrypted checkout</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Why travelers choose ITU</h2>
            <p className="mt-3 text-muted-foreground">Premium experience built for speed, clarity, and peace of mind.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Instant top-up',
                copy: 'Most recharges arrive in under a minute with transparent status updates.',
                icon: Zap,
              },
              {
                title: '100% secure',
                copy: 'Modern fraud prevention and PCI-minded flows keep every payment protected.',
                icon: Lock,
              },
              {
                title: '24/7 support',
                copy: 'Human help when you need it, with guided flows for first-time senders.',
                icon: Headphones,
              },
            ].map((item) => (
              <Card
                key={item.title}
                className="rounded-2xl border border-border/70 bg-card/90 p-8 shadow-elevated-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-elevated"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.copy}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto overflow-hidden rounded-3xl border border-border/70 bg-card shadow-elevated">
          <div className="grid lg:grid-cols-2 lg:items-stretch">
            <div className="relative aspect-[5/4] min-h-[240px] w-full sm:aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[320px]">
              <Image
                src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80"
                alt="Customer using smartphone"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-background/40 via-transparent to-transparent" />
            </div>
            <div className="flex flex-col justify-center space-y-5 bg-primary px-8 py-12 text-primary-foreground md:px-12">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">Get started</p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Ready to send your next top-up?</h2>
              <p className="text-primary-foreground/85">
                Join thousands of customers who rely on ITU for fast international mobile recharge.
              </p>
              <div>
                <Button
                  size="lg"
                  variant="secondary"
                  className="rounded-xl px-8 text-base font-semibold text-primary shadow-elevated-sm"
                  asChild
                >
                  <a href="/recharge">Start recharging now</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-background py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-10 flex flex-col gap-3 text-center md:flex-row md:items-end md:justify-between md:text-left">
            <div>
              <h3 className="text-3xl font-bold tracking-tight">Popular destinations</h3>
              <p className="text-muted-foreground">Jump straight into a recharge flow for these countries.</p>
            </div>
            <Button variant="outline" className="self-center rounded-xl md:self-auto" asChild>
              <a href="/recharge">
                View all countries
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {popularCountries.map((country) => (
              <Card
                key={country.code}
                className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-elevated-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{country.flag}</span>
                  <div>
                    <p className="text-lg font-semibold">{country.name}</p>
                    <p className="text-sm text-muted-foreground">Multiple operators available</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="mt-6 w-full rounded-xl border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={() => {
                    setSelectedCountry(country)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  Recharge now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="mb-10 text-balance text-center text-3xl font-bold tracking-tight md:text-4xl">
            {content.faq.title}
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={item.id} value={`item-${index}`} className="border-b border-border/60">
                <AccordionTrigger className="py-5 text-left text-base font-semibold hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 leading-relaxed text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="border-t border-border/60 bg-muted/20 py-14">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-14">
            {content.trustSection.items.map((item, index) => {
              const IconComponent = item.icon === 'shield' ? Shield : item.icon === 'zap' ? Zap : Globe
              return (
                <div key={index} className="flex max-w-xs items-start gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-elevated-sm">
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-base font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
