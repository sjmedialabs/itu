import { NextResponse } from 'next/server'
import { adminCanUseFeature } from '@/lib/auth/require-admin-feature'
import { runtimeEnv } from '@/lib/env/runtime'
import { publicSupabaseBaseUrl } from '@/lib/storage/public-url'

export async function POST(request: Request) {
  const isAuthorized = await adminCanUseFeature(request, 'ads');
  if (!isAuthorized) {
    console.error('Upload Route: adminCanUseFeature returned false! Headers:', Object.fromEntries(request.headers.entries()));
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Upload API uses internal SUPABASE_URL; saved public URL uses browser-reachable base.
    const apiRaw = runtimeEnv('SUPABASE_URL')
    const key = runtimeEnv('SUPABASE_SERVICE_ROLE_KEY')
    if (!apiRaw || !key) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 })
    }

    const apiBase = apiRaw.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '')
    const publicBase =
      runtimeEnv('NEXT_PUBLIC_SUPABASE_URL') ||
      runtimeEnv('CDN_BASE_URL') ||
      publicSupabaseBaseUrl() ||
      apiBase
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`
    const bucket = 'ads_media'

    const storageUrl = `${apiBase}/storage/v1/object/${bucket}/${fileName}`

    const res = await fetch(storageUrl, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Supabase Storage Upload Error:', err)
      return NextResponse.json({ error: 'Failed to upload to Supabase Storage' }, { status: 500 })
    }

    const publicUrl = `${publicBase.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${fileName}`

    return NextResponse.json({ url: publicUrl })
  } catch (error: any) {
    console.error('Ads upload error:', error.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
