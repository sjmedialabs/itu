import { NextResponse } from 'next/server'
import { supabaseRest } from '@/lib/db/supabase-rest'
import type { SiteContent } from '@/lib/cms-store'

const CMS_ID = 'default'

export async function GET() {
  try {
    const res = await supabaseRest(`cms_site?select=content&id=eq.${encodeURIComponent(CMS_ID)}&limit=1`)
    if (!res.ok) return NextResponse.json({ content: null }, { status: 200 })
    const rows = (await res.json()) as Array<{ content?: unknown }>
    const content = (rows?.[0]?.content ?? null) as SiteContent | null
    return NextResponse.json(
      { content },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  } catch {
    // If Supabase env/table isn't configured yet, fall back to client defaults.
    return NextResponse.json(
      { content: null },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { content?: SiteContent } | null
    if (!body?.content) return NextResponse.json({ ok: false, error: 'Missing content' }, { status: 400 })

    const payload = [{ id: CMS_ID, content: body.content, updated_at: new Date().toISOString() }]
    const res = await supabaseRest('cms_site', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: await res.text() }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Failed to save CMS content' }, { status: 500 })
  }
}

