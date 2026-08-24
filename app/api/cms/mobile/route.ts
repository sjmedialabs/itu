import { NextResponse } from 'next/server'
import { supabaseRest } from '@/lib/db/supabase-rest'
import type { SiteContent } from '@/lib/cms-store'
import { cacheGetJson, cacheSetJson } from '@/lib/cache/redis'

export const dynamic = 'force-dynamic'

const CMS_ID = 'default'
const MOBILE_CMS_CACHE_KEY = `cms:mobile:${CMS_ID}`
const CMS_BROWSER_CACHE = 'public, max-age=60, stale-while-revalidate=300'

export async function GET() {
  try {
    const cached = await cacheGetJson<{ data: any; ok: boolean }>(MOBILE_CMS_CACHE_KEY)
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { 'Cache-Control': CMS_BROWSER_CACHE },
      })
    }

    const res = await supabaseRest(`cms_site?select=content&id=eq.${encodeURIComponent(CMS_ID)}&limit=1`)
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'Database request failed' }, { status: 500 })
    }

    const rows = (await res.json()) as Array<{ content?: SiteContent }>
    const siteContent = rows?.[0]?.content ?? null
    const mobileCms = siteContent?.mobileCms ?? null

    const payload = { ok: true, data: mobileCms }
    await cacheSetJson(MOBILE_CMS_CACHE_KEY, payload, 60)

    return NextResponse.json(payload, {
      status: 200,
      headers: { 'Cache-Control': CMS_BROWSER_CACHE },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Failed to fetch mobile CMS' }, { status: 500 })
  }
}
