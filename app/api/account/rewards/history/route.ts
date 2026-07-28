import { NextResponse } from 'next/server'
import { getAdminFromAccessCookie } from '@/lib/auth/get-admin-from-request'
import { supabaseRest } from '@/lib/db/supabase-rest'

/**
 * GET /api/account/rewards/history
 * Returns the user's reward ledger entries, current balance, total earned, and total used.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const paramUserId = url.searchParams.get('userId') || url.searchParams.get('user_id') || url.searchParams.get('email')

    let userId: string | null = null

    // 1. Try resolving user from auth session cookie
    const ctx = await getAdminFromAccessCookie(request)
    if (ctx?.user?.id) {
      userId = ctx.user.id
    } else if (paramUserId) {
      // 2. Resolve user from query param (userId or email)
      if (paramUserId.includes('@')) {
        const pRes = await supabaseRest(
          `profiles?email=eq.${encodeURIComponent(paramUserId.trim().toLowerCase())}&select=id&limit=1`,
          { cache: 'no-store' }
        )
        if (pRes.ok) {
          const pRows = await pRes.json()
          if (pRows[0]?.id) userId = pRows[0].id
        }
      } else {
        userId = paramUserId.trim()
      }
    }

    // If no user context and no user found, lookup first profile as default context for mobile demo
    if (!userId) {
      const defaultProf = await supabaseRest('profiles?select=id&limit=1', { cache: 'no-store' })
      if (defaultProf.ok) {
        const rows = await defaultProf.json()
        if (rows[0]?.id) userId = rows[0].id
      }
    }

    let entries: any[] = []
    let totalEarned = 0
    let totalUsed = 0

    if (userId) {
      // Fetch ledger entries for this user, ordered newest first
      const ledgerRes = await supabaseRest(
        `reward_ledger?user_id=eq.${encodeURIComponent(userId)}&select=id,points,reason,metadata,created_at,transaction_id,transactions(id,amount,currency,status,description,metadata)&order=created_at.desc&limit=100`,
        { cache: 'no-store' }
      )
      if (ledgerRes.ok) {
        entries = await ledgerRes.json().catch(() => [])
      }
    }

    // Calculate total earned and total used from entries
    entries.forEach((e) => {
      const p = Number(e.points) || 0
      if (p >= 0) {
        totalEarned += p
      } else {
        totalUsed += Math.abs(p)
      }
    })

    // Fetch point valuation from app_settings
    const settingsRes = await supabaseRest(
      'app_settings?key=eq.reward_point_eur_value&select=value&limit=1',
      { cache: 'no-store' }
    )
    let pointValue = 0.01 // default
    if (settingsRes.ok) {
      const rows = await settingsRes.json()
      if (rows[0]?.value != null) {
        pointValue = typeof rows[0].value === 'number' ? rows[0].value : Number(rows[0].value) || 0.01
      }
    }

    // Fetch user's current points balance
    let balance = totalEarned - totalUsed
    if (userId) {
      const balanceRes = await supabaseRest(
        `reward_accounts?user_id=eq.${encodeURIComponent(userId)}&select=points_balance&limit=1`,
        { cache: 'no-store' }
      )
      if (balanceRes.ok) {
        const bRows = await balanceRes.json().catch(() => [])
        if (bRows[0]?.points_balance != null) {
          balance = Number(bRows[0].points_balance)
        }
      }
    }

    return NextResponse.json({
      ok: true,
      success: true,
      balance,
      pointValue,
      balanceWorth: +(balance * pointValue).toFixed(2),
      totalEarned,
      totalUsed,
      entries,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}
