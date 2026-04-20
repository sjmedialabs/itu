'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// CMS Content Types
export interface HeroContent {
  title: string
  subtitle: string
  backgroundImage: string
  overlayGradient: string
  ctaText: string
  showWelcomeBack: boolean
}

export interface ServiceToggleContent {
  label: string
  showVouchers: boolean
  vouchersLabel: string
  topupLabel: string
}

export interface TopupCardContent {
  title: string
  placeholder: string
  buttonText: string
  buttonColor: string
  sectionImage: string
}

export interface AppPromoContent {
  title: string
  subtitle: string
  sectionImage: string
  showAppStore: boolean
  showGooglePlay: boolean
  appStoreUrl: string
  googlePlayUrl: string
  backgroundGradient: string
}

export interface FAQItem {
  id: string
  question: string
  answer: string
  order: number
  isActive: boolean
}

export interface FAQSectionContent {
  title: string
  sectionImage: string
  items: FAQItem[]
}

export interface CountriesSectionContent {
  sectionImage: string
}

export interface PopularCountry {
  code: string
  name: string
  flag: string
  dialCode: string
  order: number
  isActive: boolean
}

export interface FooterContent {
  brandTagline: string
  companyLinks: { label: string; href: string }[]
  legalLinks: { label: string; href: string }[]
  helpLinks: { label: string; href: string }[]
  socialLinks: {
    facebook: string
    twitter: string
    instagram: string
    linkedin: string
  }
  trustBadgeText: string
  backgroundImage: string
}

export interface HeaderContent {
  logoText: string
  backgroundColor: string
  navItems: { label: string; href: string; hasDropdown?: boolean; badge?: string }[]
  showLanguageSelector: boolean
  languages: { code: string; name: string; flag: string }[]
}

export interface TrustSectionContent {
  items: { icon: string; title: string; description: string }[]
}

export interface SiteContent {
  header: HeaderContent
  hero: HeroContent
  serviceToggle: ServiceToggleContent
  topupCard: TopupCardContent
  appPromo: AppPromoContent
  faq: FAQSectionContent
  countriesSection: CountriesSectionContent
  popularCountries: PopularCountry[]
  trustSection: TrustSectionContent
  footer: FooterContent
}

// Default content
const defaultContent: SiteContent = {
  header: {
    logoText: 'ITU',
    backgroundColor: '#003d5b',
    navItems: [
      { label: 'Send top-up', href: '/', hasDropdown: true },
      { label: 'Vouchers', href: '/vouchers', badge: 'New' },
      { label: 'Help', href: '/help' },
    ],
    showLanguageSelector: true,
    languages: [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
    ],
  },
  hero: {
    title: 'Top-Up Anytime. Anywhere.',
    subtitle: 'Deliver instant top-ups worldwide with a seamless, secure, and always-on platform.',
    backgroundImage: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1920&q=80',
    overlayGradient: 'from-[#0d4a6e]/90 via-[#0d6a8e]/80 to-[#3d8ab0]/70',
    ctaText: 'Start top-up',
    showWelcomeBack: true,
  },
  serviceToggle: {
    label: 'Services to send on ITU',
    showVouchers: true,
    vouchersLabel: 'Vouchers',
    topupLabel: 'Top-up',
  },
  topupCard: {
    title: 'Ready to send a top-up?',
    placeholder: 'Enter phone number',
    buttonText: 'Topup Now',
    buttonColor: '#E30613',
    sectionImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
  },
  appPromo: {
    title: 'Top-up wherever, whenever',
    subtitle: 'Get the ITU App for the fastest, easiest way to top-up any phone.',
    sectionImage: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80',
    showAppStore: true,
    showGooglePlay: true,
    appStoreUrl: '#',
    googlePlayUrl: '#',
    backgroundGradient: 'from-[#e8f4f8] to-[#f0f7fa]',
  },
  faq: {
    title: 'Have a question about sending mobile recharge with ITU?',
    sectionImage: '',
    items: [
      { id: '1', question: 'What is ITU?', answer: 'ITU is a leading international mobile top-up platform that allows you to send airtime and data to mobile phones in over 150 countries instantly.', order: 1, isActive: true },
      { id: '2', question: 'What is an international top-up?', answer: 'An international top-up is a way to add credit or data to a mobile phone in another country.', order: 2, isActive: true },
      { id: '3', question: 'Can I send mobile recharges from abroad?', answer: 'Yes! You can send mobile recharges from anywhere in the world.', order: 3, isActive: true },
      { id: '4', question: 'How to send a top-up online?', answer: 'Simply enter the phone number, select country and operator, choose an amount, and complete payment.', order: 4, isActive: true },
      { id: '5', question: 'Can I also send data?', answer: 'Yes! Many operators offer data bundles that you can send.', order: 5, isActive: true },
      { id: '6', question: 'Can I pay with my credit card?', answer: 'Yes, we accept all major credit and debit cards including Visa, Mastercard, and American Express.', order: 6, isActive: true },
    ],
  },
  countriesSection: {
    sectionImage: '',
  },
  popularCountries: [
    { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91', order: 1, isActive: true },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234', order: 2, isActive: true },
    { code: 'PH', name: 'Philippines', flag: '🇵🇭', dialCode: '+63', order: 3, isActive: true },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽', dialCode: '+52', order: 4, isActive: true },
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dialCode: '+880', order: 5, isActive: true },
    { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dialCode: '+92', order: 6, isActive: true },
  ],
  trustSection: {
    items: [
      { icon: 'shield', title: 'Secure payments', description: '256-bit SSL encryption' },
      { icon: 'zap', title: 'Instant delivery', description: '99% delivered in 30 seconds' },
      { icon: 'globe', title: '150+ countries', description: '600+ operators worldwide' },
    ],
  },
  footer: {
    brandTagline: 'A little goes a long way',
    companyLinks: [
      { label: 'About us', href: '/about' },
      { label: 'Press', href: '/press' },
      { label: 'Careers', href: '/careers' },
    ],
    legalLinks: [
      { label: 'Privacy notice', href: '/privacy' },
      { label: 'Terms & conditions', href: '/terms' },
      { label: 'Cookies', href: '/cookies' },
    ],
    helpLinks: [
      { label: 'Support centre', href: '/support' },
      { label: 'Sitemap', href: '/sitemap' },
    ],
    socialLinks: {
      facebook: '#',
      twitter: '#',
      instagram: '#',
      linkedin: '#',
    },
    trustBadgeText: 'Protected by Trustwave. Secure 128-bit SSL Encrypted.',
    backgroundImage: '',
  },
}

interface CMSStore {
  content: SiteContent
  isDirty: boolean
  updateHero: (hero: Partial<HeroContent>) => void
  updateServiceToggle: (toggle: Partial<ServiceToggleContent>) => void
  updateTopupCard: (card: Partial<TopupCardContent>) => void
  updateAppPromo: (promo: Partial<AppPromoContent>) => void
  updateFAQ: (faq: Partial<FAQSectionContent>) => void
  updateCountriesSection: (section: Partial<CountriesSectionContent>) => void
  addFAQItem: (item: Omit<FAQItem, 'id' | 'order'>) => void
  updateFAQItem: (id: string, item: Partial<FAQItem>) => void
  deleteFAQItem: (id: string) => void
  updatePopularCountries: (countries: PopularCountry[]) => void
  updateHeader: (header: Partial<HeaderContent>) => void
  updateFooter: (footer: Partial<FooterContent>) => void
  updateTrustSection: (trust: Partial<TrustSectionContent>) => void
  resetToDefault: () => void
  markClean: () => void
}

export const useCMSStore = create<CMSStore>()(
  persist(
    (set, get) => ({
      content: defaultContent,
      isDirty: false,

      updateHero: (hero) =>
        set((state) => ({
          content: { ...state.content, hero: { ...state.content.hero, ...hero } },
          isDirty: true,
        })),

      updateServiceToggle: (toggle) =>
        set((state) => ({
          content: { ...state.content, serviceToggle: { ...state.content.serviceToggle, ...toggle } },
          isDirty: true,
        })),

      updateTopupCard: (card) =>
        set((state) => ({
          content: { ...state.content, topupCard: { ...state.content.topupCard, ...card } },
          isDirty: true,
        })),

      updateAppPromo: (promo) =>
        set((state) => ({
          content: { ...state.content, appPromo: { ...state.content.appPromo, ...promo } },
          isDirty: true,
        })),

      updateFAQ: (faq) =>
        set((state) => ({
          content: { ...state.content, faq: { ...state.content.faq, ...faq } },
          isDirty: true,
        })),

      updateCountriesSection: (section) =>
        set((state) => ({
          content: {
            ...state.content,
            countriesSection: { ...state.content.countriesSection, ...section },
          },
          isDirty: true,
        })),

      addFAQItem: (item) =>
        set((state) => {
          const newId = `faq-${Date.now()}`
          const maxOrder = Math.max(...state.content.faq.items.map((i) => i.order), 0)
          return {
            content: {
              ...state.content,
              faq: {
                ...state.content.faq,
                items: [...state.content.faq.items, { ...item, id: newId, order: maxOrder + 1 }],
              },
            },
            isDirty: true,
          }
        }),

      updateFAQItem: (id, item) =>
        set((state) => ({
          content: {
            ...state.content,
            faq: {
              ...state.content.faq,
              items: state.content.faq.items.map((i) => (i.id === id ? { ...i, ...item } : i)),
            },
          },
          isDirty: true,
        })),

      deleteFAQItem: (id) =>
        set((state) => ({
          content: {
            ...state.content,
            faq: {
              ...state.content.faq,
              items: state.content.faq.items.filter((i) => i.id !== id),
            },
          },
          isDirty: true,
        })),

      updatePopularCountries: (countries) =>
        set((state) => ({
          content: { ...state.content, popularCountries: countries },
          isDirty: true,
        })),

      updateHeader: (header) =>
        set((state) => ({
          content: { ...state.content, header: { ...state.content.header, ...header } },
          isDirty: true,
        })),

      updateFooter: (footer) =>
        set((state) => ({
          content: { ...state.content, footer: { ...state.content.footer, ...footer } },
          isDirty: true,
        })),

      updateTrustSection: (trust) =>
        set((state) => ({
          content: { ...state.content, trustSection: { ...state.content.trustSection, ...trust } },
          isDirty: true,
        })),

      resetToDefault: () => set({ content: defaultContent, isDirty: true }),

      markClean: () => set({ isDirty: false }),
    }),
    {
      name: 'itu-cms-storage',
    }
  )
)
