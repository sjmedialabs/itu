import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth/require-admin-feature'
import { runOperatorLogoSyncJob } from '@/lib/operator-logo'

export async function POST(request: Request) {
  const denied = await requireAdminPermission(request, 'operators.view')
  if (denied) return denied

  try {
    const body = await request.json().catch(() => ({}))
    const progress = await runOperatorLogoSyncJob({
      forceResync: false,
      batchSize: body.batchSize,
      concurrency: body.concurrency,
      delayMs: body.delayMs,
    })

    return NextResponse.json({
      message: 'Operator logo sync started successfully',
      progress,
    })
  } catch (error: any) {
    console.error('API /admin/operator-logos/sync error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to start sync' }, { status: 500 })
  }
}
