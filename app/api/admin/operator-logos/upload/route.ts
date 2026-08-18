import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth/require-admin-feature'
import { uploadObject, STORAGE_BUCKETS, sanitizeStorageFileName } from '@/lib/storage/object-storage'
import { upsertOperatorLogo } from '@/lib/operator-logo'
import { supabaseRest } from '@/lib/db/supabase-rest'
import { processSecureUpload, cleanupQuarantineFile } from '@/lib/security/upload-security'

export async function POST(request: Request) {
  const denied = await requireAdminPermission(request, 'operators.view')
  if (denied) return denied

  try {
    const formData = await request.formData()
    const systemOperatorId = (formData.get('systemOperatorId') as string)?.trim()
    const file = formData.get('file') as File | null

    if (!systemOperatorId) {
      return NextResponse.json({ error: 'System operator ID is required' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'PNG image file is required' }, { status: 400 })
    }

    // Run Centralized Security Pipeline (.png magic byte & virus scan)
    const secResult = await processSecureUpload({
      file,
      originalName: file.name,
      declaredMimeType: file.type,
      category: 'operator_logo',
    })

    if (!secResult.ok) {
      return NextResponse.json({ error: secResult.error }, { status: secResult.status })
    }

    try {
      // 1. Fetch system operator details (for slug/name)
      const sysRes = await supabaseRest(
        `system_operators?id=eq.${encodeURIComponent(systemOperatorId)}&select=id,system_operator_name,slug,country_id&limit=1`,
        { cache: 'no-store' }
      )
      if (!sysRes.ok) {
        return NextResponse.json({ error: 'System operator not found' }, { status: 404 })
      }
      const sysRows = await sysRes.json()
      if (!Array.isArray(sysRows) || !sysRows.length) {
        return NextResponse.json({ error: 'System operator not found' }, { status: 404 })
      }
      const operator = sysRows[0]

      // 2. Upload to project Supabase storage 'operator-logos' bucket
      const slugOrId = operator.slug || operator.id
      const fileName = `${sanitizeStorageFileName(slugOrId)}.png`
      const storagePath = `operator-logos/${fileName}`

      const uploadResult = await uploadObject({
        bucket: STORAGE_BUCKETS.operator_logos,
        path: storagePath,
        body: secResult.buffer,
        contentType: 'image/png',
        upsert: true,
      })

      // 3. Update database record in operator_logos table
      const nowIso = new Date().toISOString()
      const ok = await upsertOperatorLogo({
        system_operator_id: systemOperatorId,
        logo_url: uploadResult.publicUrl,
        logo_status: 'FOUND',
        last_synced_at: nowIso,
      })

      if (!ok) {
        return NextResponse.json({ error: 'Failed to save logo record to database' }, { status: 500 })
      }

      return NextResponse.json({
        ok: true,
        message: 'Operator logo uploaded successfully',
        systemOperatorId,
        logo_url: uploadResult.publicUrl,
        last_synced_at: nowIso,
      })
    } finally {
      cleanupQuarantineFile(secResult.quarantinePath)
    }
  } catch (error: any) {
    console.error('API /admin/operator-logos/upload error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to upload logo' }, { status: 500 })
  }
}
