import { NextResponse } from 'next/server'
import { supabaseRest } from '@/lib/db/supabase-rest'

export async function GET() {
  try {
    const res = await supabaseRest(
      'app_settings?key=in.(reward_point_eur_value,reward_max_redemption_percentage,reward_min_balance_to_redeem)&select=key,value',
      { cache: 'no-store' }
    )

    let pointValue = 0.02
    let maxRedemptionPercentage = 50
    let minBalanceToRedeem = 0

    if (res.ok) {
      const rows = (await res.json().catch(() => [])) as Array<{ key: string; value: unknown }>
      rows.forEach((r) => {
        if (r.key === 'reward_point_eur_value' && r.value != null) {
          pointValue = Number(r.value) || 0.02
        }
        if (r.key === 'reward_max_redemption_percentage' && r.value != null) {
          maxRedemptionPercentage = Number(r.value) ?? 50
        }
        if (r.key === 'reward_min_balance_to_redeem' && r.value != null) {
          minBalanceToRedeem = Number(r.value) ?? 0
        }
      })
    }

    return NextResponse.json({
      ok: true,
      pointValue,
      maxRedemptionPercentage,
      minBalanceToRedeem,
      minPointsToRedeem: minBalanceToRedeem,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, pointValue: 0.02, maxRedemptionPercentage: 50, minBalanceToRedeem: 0 },
      { status: 500 }
    )
  }
}
