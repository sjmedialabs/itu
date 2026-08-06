import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth/require-admin-feature'
import { getOperatorLogoStatistics } from '@/lib/operator-logo'

export async function GET(request: Request) {
  const denied = await requireAdminPermission(request, 'operators.view')
  if (denied) return denied

  try {
    const statistics = await getOperatorLogoStatistics()
    return NextResponse.json({ statistics })
  } catch (error: any) {
    console.error('API /admin/operator-logos/statistics error:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
