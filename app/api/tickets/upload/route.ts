import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/get-user-id-from-request'
import { STORAGE_BUCKETS, uploadObject } from '@/lib/storage/object-storage'
import { processSecureUpload, cleanupQuarantineFile } from '@/lib/security/upload-security'

export async function POST(req: Request) {
  try {
    // Resolve user via cookie / Bearer header / x-user-id
    const userId = await getUserIdFromRequest(req)

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 })
    }

    // Run Centralized Upload Security Pipeline (Quarantine -> Magic-Bytes -> ClamAV)
    const secResult = await processSecureUpload({
      file,
      originalName: file.name,
      declaredMimeType: file.type,
      category: 'document',
    })

    if (!secResult.ok) {
      return NextResponse.json(
        { ok: false, error: secResult.error },
        { status: secResult.status }
      )
    }

    try {
      // Promote clean quarantine file to permanent Supabase Storage
      const uploaded = await uploadObject({
        bucket: STORAGE_BUCKETS.tickets,
        path: `${userId}/${secResult.sanitizedFileName}`,
        body: secResult.buffer,
        contentType: secResult.mimeType,
      })

      return NextResponse.json({
        ok: true,
        url: uploaded.publicUrl,
      })
    } finally {
      cleanupQuarantineFile(secResult.quarantinePath)
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Upload failed'
    console.error('Ticket attachment upload failed:', e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
