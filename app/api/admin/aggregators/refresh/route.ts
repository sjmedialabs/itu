import { NextResponse } from 'next/server'
import {
  getLatestRefreshRun,
  getRefreshHistory,
  isInRefreshWindow,
  refreshAggregatorData,
} from '@/lib/api/lcr-engine'

export async function GET() {
  const latest = getLatestRefreshRun()
  return NextResponse.json({
    latest,
    history: getRefreshHistory().slice(0, 10),
    inScheduledWindow: isInRefreshWindow(),
    window: '01:00-03:00 server time',
  })
}

export async function POST() {
  try {
    const run = await refreshAggregatorData({ source: 'manual', maxAttempts: 2 })
    return NextResponse.json({ run })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Refresh failed' },
      { status: 500 },
    )
  }
}
