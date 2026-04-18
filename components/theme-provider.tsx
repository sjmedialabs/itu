'use client'

import * as React from 'react'

const THEMES = ['light', 'dark', 'system'] as const
type ThemeName = (typeof THEMES)[number]

export type ThemeProviderProps = {
  children: React.ReactNode
  attribute?: 'class'
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  storageKey?: string
}

export type UseThemeProps = {
  theme: string | undefined
  setTheme: (theme: string) => void
  resolvedTheme: string | undefined
  systemTheme: 'dark' | 'light' | undefined
  themes: string[]
}

const ThemeContext = React.createContext<UseThemeProps | null>(null)

function normalizeStored(
  raw: string | null,
  defaultTheme: string,
  enableSystem: boolean,
): ThemeName {
  if (raw === 'dark' || raw === 'light') return raw
  if (raw === 'system') return enableSystem ? 'system' : 'light'
  if (defaultTheme === 'dark' || defaultTheme === 'light') return defaultTheme as ThemeName
  if (defaultTheme === 'system' && enableSystem) return 'system'
  return 'light'
}

function readSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveLightDark(
  theme: ThemeName,
  enableSystem: boolean,
  systemTheme: 'dark' | 'light' | undefined,
): 'light' | 'dark' {
  if (theme === 'system' && enableSystem) {
    return systemTheme ?? readSystemTheme()
  }
  return theme === 'dark' ? 'dark' : 'light'
}

export function ThemeProvider({
  children,
  attribute: _attribute = 'class',
  defaultTheme = 'light',
  enableSystem = false,
  disableTransitionOnChange: _disableTransitionOnChange = false,
  storageKey = 'theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<ThemeName>(() =>
    normalizeStored(null, defaultTheme, enableSystem),
  )
  const [systemTheme, setSystemTheme] = React.useState<'dark' | 'light' | undefined>(undefined)

  React.useEffect(() => {
    const stored = window.localStorage.getItem(storageKey)
    setThemeState(normalizeStored(stored, defaultTheme, enableSystem))
    setSystemTheme(readSystemTheme())

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onPrefChange = () => setSystemTheme(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', onPrefChange)
    return () => mq.removeEventListener('change', onPrefChange)
  }, [defaultTheme, enableSystem, storageKey])

  React.useEffect(() => {
    const resolved = resolveLightDark(theme, enableSystem, systemTheme)
    const root = document.documentElement
    root.classList.toggle('dark', resolved === 'dark')
    root.style.colorScheme = resolved
  }, [theme, systemTheme, enableSystem])

  const setTheme = React.useCallback(
    (value: string) => {
      const next: ThemeName =
        value === 'light' || value === 'dark'
          ? value
          : value === 'system' && enableSystem
            ? 'system'
            : normalizeStored(null, defaultTheme, enableSystem)
      setThemeState(next)
      try {
        window.localStorage.setItem(storageKey, next)
      } catch {
        /* ignore */
      }
    },
    [defaultTheme, enableSystem, storageKey],
  )

  const resolvedTheme = resolveLightDark(theme, enableSystem, systemTheme)

  const value = React.useMemo<UseThemeProps>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme,
      themes: [...THEMES],
    }),
    [theme, setTheme, resolvedTheme, systemTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): UseThemeProps {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
