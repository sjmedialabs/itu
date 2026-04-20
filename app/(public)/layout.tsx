'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Menu,
  User,
  LogOut,
  History,
  Settings,
  Gift,
  ChevronDown,
  HelpCircle,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Shield,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAuthStore, useLocalePreferencesStore } from '@/lib/stores'
import { useCMSStore } from '@/lib/cms-store'
import { mockCountries } from '@/lib/mock-data'
import { NAV_CURRENCIES, navRegionShortLabel, isNavCurrency } from '@/lib/locale-nav-data'
import { cn } from '@/lib/utils'
import { ItuLogoMark } from '@/components/itu-logo-mark'
import { TargetedAdBanner } from '@/components/targeted-ad-banner'

const navLinks = [
  { href: '/', label: 'Home', match: (p: string) => p === '/' },
  { href: '/recharge', label: 'Top-up', match: (p: string) => p.startsWith('/recharge') },
  { href: '/vouchers', label: 'Vouchers', match: (p: string) => p.startsWith('/vouchers') },
  { href: '/help', label: 'Help', match: (p: string) => p.startsWith('/help') },
]

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { content } = useCMSStore()
  const {
    regionCode,
    languageCode,
    currencyCode,
    setRegion,
    setLanguage,
    setCurrency,
  } = useLocalePreferencesStore()

  const region = mockCountries.find((c) => c.code === regionCode) ?? mockCountries[0]!
  const language =
    content.header.languages.find((l) => l.code === languageCode) ?? content.header.languages[0]!
  const currency = NAV_CURRENCIES.find((c) => c.code === currencyCode) ?? NAV_CURRENCIES[0]!

  useEffect(() => {
    document.documentElement.lang = languageCode
  }, [languageCode])

  useEffect(() => {
    if (!mockCountries.some((c) => c.code === regionCode)) {
      setRegion(mockCountries[0]!.code)
    }
  }, [regionCode, setRegion])

  useEffect(() => {
    const valid = content.header.languages.some((l) => l.code === languageCode)
    if (!valid && content.header.languages[0]) {
      setLanguage(content.header.languages[0].code)
    }
  }, [languageCode, content.header.languages, setLanguage])

  useEffect(() => {
    if (!isNavCurrency(currencyCode)) {
      setCurrency('USD')
    }
  }, [currencyCode, setCurrency])

  const navClass = (active: boolean) =>
    cn(
      'rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors md:px-4',
      active ? 'text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100/90 hover:text-neutral-800',
    )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center px-3 sm:px-4">
        <div
          className="pointer-events-auto flex w-full max-w-5xl items-center gap-2 rounded-full border border-neutral-200/90 bg-white/85 py-2 pl-3 pr-2 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:gap-3 sm:pl-4 md:py-2.5 md:pl-5"
        >
          <Link href="/" className="flex shrink-0 items-center gap-2 pl-1" aria-label={content.header.logoText}>
            <ItuLogoMark />
          </Link>

          <nav className="mx-auto hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
            {navLinks.map((item) => {
              const active = item.match(pathname)
              return (
                <Link key={item.href} href={item.href} className={navClass(active)}>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden h-9 gap-1.5 rounded-full px-2.5 text-neutral-600 hover:bg-neutral-100/90 hover:text-neutral-900 md:inline-flex"
                  aria-label={`Region: ${region.name}`}
                >
                  <span className="text-base leading-none">{region.flag}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    {navRegionShortLabel(region.code)}
                  </span>
                  <ChevronDown className="size-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-[min(24rem,70vh)] w-56 overflow-y-auto rounded-2xl p-1 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
                {mockCountries.map((c) => (
                  <DropdownMenuItem
                    key={c.code}
                    className={cn('rounded-xl', c.code === region.code && 'bg-muted font-medium')}
                    onClick={() => setRegion(c.code)}
                  >
                    <span className="mr-2 text-base leading-none">{c.flag}</span>
                    <span className="flex-1">{c.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{navRegionShortLabel(c.code)}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {content.header.showLanguageSelector && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden h-9 gap-1.5 rounded-full px-2.5 text-neutral-600 hover:bg-neutral-100/90 hover:text-neutral-900 sm:inline-flex"
                    aria-label={`Language: ${language.name}`}
                  >
                    <span className="text-base leading-none">{language.flag}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide">
                      {language.code.toUpperCase()}
                    </span>
                    <ChevronDown className="size-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
                  {content.header.languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      className={cn('rounded-xl', lang.code === language.code && 'bg-muted font-medium')}
                      onClick={() => setLanguage(lang.code)}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden h-9 gap-1.5 rounded-full px-2.5 text-neutral-600 hover:bg-neutral-100/90 hover:text-neutral-900 md:inline-flex"
                  aria-label={`Currency: ${currency.name}`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide">{currency.code}</span>
                  <ChevronDown className="size-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
                {NAV_CURRENCIES.map((cur) => (
                  <DropdownMenuItem
                    key={cur.code}
                    className={cn('rounded-xl', cur.code === currency.code && 'bg-muted font-medium')}
                    onClick={() => setCurrency(cur.code)}
                  >
                    <span className="font-mono text-xs font-semibold">{cur.code}</span>
                    <span className="ml-2 text-muted-foreground">{cur.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-2 rounded-full px-2 text-neutral-700 hover:bg-neutral-100/90"
                  >
                    <Avatar className="size-8 ring-1 ring-neutral-200">
                      <AvatarFallback className="bg-neutral-100 text-xs font-bold text-neutral-800">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="hidden size-3.5 opacity-50 sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link href="/account" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link href="/account/transactions" className="flex items-center">
                      <History className="mr-2 h-4 w-4" />
                      Transaction History
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link href="/account/rewards" className="flex items-center">
                      <Gift className="mr-2 h-4 w-4" />
                      Rewards ({user.rewardPoints || 0} pts)
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link href="/account/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="rounded-xl text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                className="h-9 shrink-0 rounded-full px-5 text-[11px] font-bold uppercase tracking-[0.12em] shadow-[0_6px_20px_-4px_rgba(227,6,19,0.45)]"
                asChild
              >
                <Link href="/login">Login</Link>
              </Button>
            )}

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9 shrink-0 rounded-full text-neutral-700 hover:bg-neutral-100/90 lg:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(100%,22rem)] border-l border-neutral-200/80 bg-white/95 backdrop-blur-xl">
                <nav className="mt-10 flex flex-col gap-1">
                  {navLinks.map((item) => {
                    const active = item.match(pathname)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em]',
                          active ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50',
                        )}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                  <div className="my-3 h-px bg-neutral-200" />
                  {!isAuthenticated ? (
                    <>
                      <Link
                        href="/login"
                        className="rounded-2xl bg-primary px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.12em] text-primary-foreground shadow-md"
                      >
                        Login
                      </Link>
                      <Link
                        href="/register"
                        className="rounded-2xl px-4 py-3 text-center text-sm font-semibold text-primary hover:bg-neutral-50"
                      >
                        Create account
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/account" className="rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-neutral-50">
                        My account
                      </Link>
                      <Link
                        href="/account/transactions"
                        className="rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-neutral-50"
                      >
                        Transactions
                      </Link>
                      <button
                        type="button"
                        onClick={() => logout()}
                        className="rounded-2xl px-4 py-3 text-left text-sm font-semibold text-destructive hover:bg-red-50"
                      >
                        Sign out
                      </button>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main
        className={cn(
          'flex flex-1 flex-col',
          pathname === '/' ? 'pt-0' : 'pt-[5.25rem] sm:pt-[5.5rem]',
        )}
      >
        {!pathname.startsWith('/account') && <TargetedAdBanner />}
        {pathname === '/' ? (
          children
        ) : pathname.startsWith('/account') ? (
          <div className="flex w-full flex-1 flex-col px-4 pb-16 pt-2 sm:px-6">
            {children}
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-16 pt-2 sm:px-6 lg:max-w-7xl">
            {children}
          </div>
        )}
      </main>

      <footer
        className="mt-auto border-t border-border/60 bg-foreground text-background"
        style={
          content.footer.backgroundImage
            ? {
                backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.9)), url(${content.footer.backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div className="container mx-auto px-4 py-14">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-4 space-y-5">
              <Link href="/" className="inline-flex items-center gap-3">
                <ItuLogoMark size="md" />
                <span className="font-title-logo text-2xl font-semibold tracking-tight text-background">
                  {content.header.logoText}
                </span>
              </Link>
              <p className="max-w-sm text-sm leading-relaxed text-background/75">{content.footer.brandTagline}</p>
              <div className="flex flex-wrap gap-2 text-sm text-background/80">
                <span className="inline-flex items-center gap-2 rounded-xl border border-background/15 bg-background/5 px-3 py-2">
                  <Shield className="h-4 w-4 text-primary" />
                  {content.footer.trustBadgeText}
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <a
                  href={content.footer.socialLinks.facebook}
                  className="flex size-10 items-center justify-center rounded-full border border-background/15 bg-background/5 text-background/80 transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  aria-label="Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </a>
                <a
                  href={content.footer.socialLinks.twitter}
                  className="flex size-10 items-center justify-center rounded-full border border-background/15 bg-background/5 text-background/80 transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  aria-label="Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <a
                  href={content.footer.socialLinks.instagram}
                  className="flex size-10 items-center justify-center rounded-full border border-background/15 bg-background/5 text-background/80 transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a
                  href={content.footer.socialLinks.linkedin}
                  className="flex size-10 items-center justify-center rounded-full border border-background/15 bg-background/5 text-background/80 transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-2">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-background/55">Company</h4>
              <ul className="space-y-3 text-sm text-background/75">
                {content.footer.companyLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-background">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-background/55">Legal</h4>
              <ul className="space-y-3 text-sm text-background/75">
                {content.footer.legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-background">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-background/55">Help</h4>
              <ul className="space-y-3 text-sm text-background/75">
                {content.footer.helpLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-background">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-background/10 bg-black/20">
          <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row">
            <span className="text-sm text-background/70">
              &copy; {new Date().getFullYear()} {content.header.logoText}. All rights reserved.
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-2 rounded-full text-background/70 hover:bg-background/10 hover:text-background"
              asChild
            >
              <Link href="/help">
                <HelpCircle className="h-4 w-4" />
                Help
              </Link>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
