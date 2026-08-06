import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth/require-admin-feature'
import { getSyncProgress } from '@/lib/operator-logo'

export async function GET(request: Request) {
  const denied = await requireAdminPermission(request, 'operators.view')
  if (denied) return denied

  try {
    const progress = getSyncProgress()
    return NextResponse.json({ progress })
  } catch (error: any) {
    console.error('API /admin/operator-logos/status error:', error)
    return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 })
  }
}
