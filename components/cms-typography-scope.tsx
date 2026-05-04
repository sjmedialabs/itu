'use client'

import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react'
import { useCMSStore } from '@/lib/cms-store'
import { cn } from '@/lib/utils'

const SCOPE_CLASS = 'cms-typography-scope'
const LINK_ID = 'itu-cms-google-fonts'
const STYLE_ID = 'itu-cms-custom-font-face'

function isAllowedGoogleFontsUrl(raw: string): boolean {
  const url = raw.trim()
  if (!url) return false
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    return u.hostname === 'fonts.googleapis.com'
  } catch {
    return false
  }
}

function sanitizeFontFamilyName(name: string): string {
  const s = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim()
  return s || 'CMSUploadedFont'
}

type Props = { className?: string; children: ReactNode }

export function CMSTypographyScope({ className, children }: Props) {
  const typography = useCMSStore((s) => s.content.typography)

  useEffect(() => {
    const href = typography.googleFontsStylesheetUrl.trim()
    let link = document.getElementById(LINK_ID) as HTMLLinkElement | null
    if (href && isAllowedGoogleFontsUrl(href)) {
      if (!link) {
        link = document.createElement('link')
        link.id = LINK_ID
        link.rel = 'stylesheet'
        link.crossOrigin = 'anonymous'
        document.head.appendChild(link)
      }
      link.href = href
    } else {
      link?.remove()
    }
  }, [typography.googleFontsStylesheetUrl])

  useEffect(() => {
    const dataUrl = typography.customFontDataUrl.trim()
    const name = sanitizeFontFamilyName(typography.customFontFamilyName)
    let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    if (dataUrl.startsWith('data:')) {
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = STYLE_ID
        document.head.appendChild(styleEl)
      }
      const ff = JSON.stringify(name)
      const src = JSON.stringify(dataUrl)
      styleEl.textContent = `@font-face{font-family:${ff};src:url(${src}) format("woff2"),url(${src}) format("woff"),url(${src}) format("opentype"),url(${src}) format("truetype");font-weight:100 900;font-style:normal;font-display:swap;}`
    } else {
      styleEl?.remove()
    }
  }, [typography.customFontDataUrl, typography.customFontFamilyName])

  const style = useMemo(() => {
    const f = typography.families
    const out: CSSProperties = {}
    const setVar = (key: string, value: string) => {
      const v = value.trim()
      if (v) (out as Record<string, string>)[key] = v
    }
    setVar('--cms-font-h1', f.h1)
    setVar('--cms-font-h2', f.h2)
    setVar('--cms-font-h3', f.h3)
    setVar('--cms-font-h4', f.h4)
    setVar('--cms-font-h5', f.h5)
    setVar('--cms-font-p', f.p)
    return out
  }, [typography.families])

  return (
    <div className={cn(SCOPE_CLASS, className)} style={style}>
      {children}
    </div>
  )
}
