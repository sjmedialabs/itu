import { NextResponse } from 'next/server'
import { isInRefreshWindow, refreshAggregatorData } from '@/lib/api/lcr-engine'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const configuredSecret = process.env.CRON_SECRET
  if (configuredSecret && authHeader !== `Bearer ${configuredSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
  }

  const now = new Date()
  const inWindow = isInRefreshWindow(now)

  try {
    const run = await refreshAggregatorData({ source: 'scheduled', maxAttempts: 3 })
    return NextResponse.json({
      run,
      inScheduledWindow: inWindow,
      scheduledWindow: '01:00-03:00 server time',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scheduled refresh failed' },
      { status: 500 },
    )
  }
}
