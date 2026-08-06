import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth/require-admin-feature'
import { runOperatorLogoSyncJob } from '@/lib/operator-logo'

export async function POST(request: Request) {
  const denied = await requireAdminPermission(request, 'operators.view')
  if (denied) return denied

  try {
    const body = await request.json().catch(() => ({}))
    const progress = await runOperatorLogoSyncJob({
      forceResync: true,
      batchSize: body.batchSize,
      concurrency: body.concurrency,
      delayMs: body.delayMs,
    })

    return NextResponse.json({
      message: 'Operator logo force resync started successfully',
      progress,
    })
  } catch (error: any) {
    console.error('API /admin/operator-logos/force-sync error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to start force sync' }, { status: 500 })
  }
}
