'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Transaction, Country, Carrier, Product, RechargeOrder } from './types'
import {
  mockUsers,
  mockWallets,
  mockTransactions,
  mockCountries,
  mockCarriers,
  mockProducts,
} from './mock-data'

// Auth Store
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  loginWithOTP: (phone: string, countryCode: string) => Promise<boolean>
  logout: () => void
  register: (email: string, password: string, name: string) => Promise<boolean>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, // Start logged out for public website
      isAuthenticated: false,
      isLoading: false,
      login: async (email: string) => {
        set({ isLoading: true })
        await new Promise((resolve) => setTimeout(resolve, 500))
        // Case-insensitive email comparison and trim whitespace
        const normalizedEmail = email.toLowerCase().trim()
        const user = mockUsers.find((u) => u.email.toLowerCase().trim() === normalizedEmail)
        if (user) {
          set({ user, isAuthenticated: true, isLoading: false })
          return true
        }
        set({ isLoading: false })
        return false
      },
      loginWithOTP: async (phone: string, countryCode: string) => {
        set({ isLoading: true })
        await new Promise((resolve) => setTimeout(resolve, 500))
        // Create or find user by phone
        const newUser: User = {
          id: `user-${Date.now()}`,
          email: '',
          name: 'User',
          phone,
          countryCode,
          role: 'user',
          rewardPoints: 0,
          createdAt: new Date().toISOString(),
        }
        set({ user: newUser, isAuthenticated: true, isLoading: false })
        return true
      },
      logout: () => {
        set({ user: null, isAuthenticated: false })
      },
      register: async (email: string, _password: string, name: string) => {
        set({ isLoading: true })
        await new Promise((resolve) => setTimeout(resolve, 500))
        const newUser: User = {
          id: `user-${Date.now()}`,
          email,
          name,
          role: 'user',
          rewardPoints: 0,
          createdAt: new Date().toISOString(),
        }
        set({ user: newUser, isAuthenticated: true, isLoading: false })
        return true
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)

// Wallet Store
interface WalletState {
  balance: number
  transactions: Transaction[]
  isLoading: boolean
  topUp: (amount: number) => Promise<boolean>
  deduct: (amount: number, description: string, metadata?: Transaction['metadata']) => Promise<boolean>
  addRewardPoints: (points: number, orderId: string) => void
  getTransactions: () => Transaction[]
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balance: mockWallets[0]?.balance || 0,
      transactions: mockTransactions,
      isLoading: false,
      topUp: async (amount: number) => {
        set({ isLoading: true })
        await new Promise((resolve) => setTimeout(resolve, 500))
        const newTransaction: Transaction = {
          id: `txn-${Date.now()}`,
          userId: 'user-1',
          type: 'topup',
          amount,
          currency: 'USD',
          status: 'completed',
          description: 'Wallet Top-up',
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          balance: state.balance + amount,
          transactions: [newTransaction, ...state.transactions],
          isLoading: false,
        }))
        return true
      },
      deduct: async (amount: number, description: string, metadata?: Transaction['metadata']) => {
        const { balance } = get()
        if (balance < amount) return false
        set({ isLoading: true })
        await new Promise((resolve) => setTimeout(resolve, 500))
        const newTransaction: Transaction = {
          id: `txn-${Date.now()}`,
          userId: 'user-1',
          type: 'recharge',
          amount,
          currency: 'USD',
          status: 'completed',
          description,
          createdAt: new Date().toISOString(),
          metadata,
        }
        set((state) => ({
          balance: state.balance - amount,
          transactions: [newTransaction, ...state.transactions],
          isLoading: false,
        }))
        return true
      },
      addRewardPoints: (points: number, orderId: string) => {
        const newTransaction: Transaction = {
          id: `txn-${Date.now()}`,
          userId: 'user-1',
          type: 'points_earned',
          amount: points,
          currency: 'PTS',
          status: 'completed',
          description: `Reward points earned for order ${orderId}`,
          rewardPoints: points,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          transactions: [newTransaction, ...state.transactions],
        }))
      },
      getTransactions: () => get().transactions,
    }),
    {
      name: 'wallet-storage',
    }
  )
)

// Recharge Flow Store
interface RechargeState {
  step: number
  selectedCountry: Country | null
  selectedCarrier: Carrier | null
  selectedProduct: Product | null
  phoneNumber: string
  countries: Country[]
  carriers: Carrier[]
  products: Product[]
  currentOrder: RechargeOrder | null
  isLoadingCarriers: boolean
  isLoadingProducts: boolean
  isProcessing: boolean
  setStep: (step: number) => void
  setCountry: (country: Country | null) => void
  setCarrier: (carrier: Carrier | null) => void
  setProduct: (product: Product | null) => void
  setPhoneNumber: (phone: string) => void
  loadCarriers: (countryCode: string) => Promise<void>
  loadProducts: (carrierId: string) => Promise<void>
  detectCarrier: (phoneNumber: string, countryCode: string) => Promise<Carrier | null>
  processRecharge: () => Promise<RechargeOrder>
  resetRecharge: () => void
}

export const useRechargeStore = create<RechargeState>()((set, get) => ({
  step: 1,
  selectedCountry: null,
  selectedCarrier: null,
  selectedProduct: null,
  phoneNumber: '',
  countries: mockCountries,
  carriers: [],
  products: [],
  currentOrder: null,
  isLoadingCarriers: false,
  isLoadingProducts: false,
  isProcessing: false,
  setStep: (step) => set({ step }),
  setCountry: (country) =>
    set({ selectedCountry: country, selectedCarrier: null, selectedProduct: null, carriers: [], products: [] }),
  setCarrier: (carrier) => set({ selectedCarrier: carrier, selectedProduct: null, products: [] }),
  setProduct: (product) => set({ selectedProduct: product }),
  setPhoneNumber: (phone) => set({ phoneNumber: phone }),
  loadCarriers: async (countryCode) => {
    set({ isLoadingCarriers: true })
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300))
    const carriers = mockCarriers.filter((c) => c.countryCode === countryCode)
    set({ carriers, isLoadingCarriers: false })
  },
  loadProducts: async (carrierId) => {
    set({ isLoadingProducts: true })
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300))
    const products = mockProducts.filter((p) => p.carrierId === carrierId)
    set({ products, isLoadingProducts: false })
  },
  detectCarrier: async (phoneNumber: string, countryCode: string) => {
    // Simulate operator detection API call
    await new Promise((resolve) => setTimeout(resolve, 500))
    const carriers = mockCarriers.filter((c) => c.countryCode === countryCode)
    // In real implementation, this would use the API to detect carrier
    // For now, return the first carrier as a simulation
    if (carriers.length > 0) {
      const detected = carriers[0]
      set({ selectedCarrier: detected })
      return detected
    }
    return null
  },
  processRecharge: async () => {
    set({ isProcessing: true })
    const { selectedCountry, selectedCarrier, selectedProduct, phoneNumber } = get()
    
    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    const order: RechargeOrder = {
      id: `order-${Date.now()}`,
      phoneNumber,
      countryCode: selectedCountry?.code || '',
      carrierCode: selectedCarrier?.code || '',
      carrierName: selectedCarrier?.name || '',
      skuCode: selectedProduct?.skuCode || '',
      productName: selectedProduct?.name || '',
      sendAmount: selectedProduct?.minSendAmount || 0,
      sendCurrency: selectedProduct?.sendCurrency || 'USD',
      receiveAmount: selectedProduct?.minReceiveAmount || 0,
      receiveCurrency: selectedProduct?.receiveCurrency || 'USD',
      serviceFee: 0.50,
      totalAmount: (selectedProduct?.minSendAmount || 0) + 0.50,
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      rewardPointsEarned: Math.floor((selectedProduct?.minSendAmount || 0)),
    }
    
    set({ currentOrder: order, isProcessing: false })
    return order
  },
  resetRecharge: () =>
    set({
      step: 1,
      selectedCountry: null,
      selectedCarrier: null,
      selectedProduct: null,
      phoneNumber: '',
      carriers: [],
      products: [],
      currentOrder: null,
      isProcessing: false,
    }),
}))

// UI Store
interface UIState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  commandOpen: boolean
  toggleTheme: () => void
  setSidebarOpen: (open: boolean) => void
  setCommandOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: true,
      commandOpen: false,
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setCommandOpen: (open) => set({ commandOpen: open }),
    }),
    {
      name: 'ui-storage',
    }
  )
)

// Public site: region / language / currency (navbar), persisted for return visits
interface LocalePreferencesState {
  regionCode: string
  languageCode: string
  currencyCode: string
  setRegion: (code: string) => void
  setLanguage: (code: string) => void
  setCurrency: (code: string) => void
}

export const useLocalePreferencesStore = create<LocalePreferencesState>()(
  persist(
    (set) => ({
      regionCode: 'IN',
      languageCode: 'en',
      currencyCode: 'USD',
      setRegion: (code) => set({ regionCode: code }),
      setLanguage: (code) => set({ languageCode: code }),
      setCurrency: (code) => set({ currencyCode: code }),
    }),
    { name: 'itu-locale-prefs' },
  ),
)
