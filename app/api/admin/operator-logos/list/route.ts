import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth/require-admin-feature'
import { getSystemOperatorsWithLogos } from '@/lib/operator-logo'

export async function GET(request: Request) {
  const denied = await requireAdminPermission(request, 'operators.view')
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? searchParams.get('q') ?? undefined
    const status = searchParams.get('status') ?? undefined
    const limit = Number(searchParams.get('limit') ?? '50')
    const offset = Number(searchParams.get('offset') ?? '0')

    const result = await getSystemOperatorsWithLogos({
      search,
      status,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('API /admin/operator-logos/list error:', error)
    return NextResponse.json({ error: 'Failed to fetch operators list' }, { status: 500 })
  }
}
