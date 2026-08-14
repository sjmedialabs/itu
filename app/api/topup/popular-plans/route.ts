import { NextResponse } from 'next/server'
import { supabaseRest } from '@/lib/db/supabase-rest'
import { cacheGetJson, cacheSetJson } from '@/lib/cache/redis'

type SimpleTransactionRow = {
  id: string
  type: string
  status: string
  amount: number | string
  metadata: Record<string, unknown> | null
  recharge_orders: Array<{
    id: string | null
    status: string | null
  }> | null
}

const isSuccessStatus = (s: string) =>
  s === 'completed' || s === 'success' || s === 'successful' || s === 'paid'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const noCache = searchParams.get('nocache') === '1'
    const cacheKey = `catalog:public:popular-plans-counts:v5`

    if (!noCache) {
      const cached = await cacheGetJson<{ popularCounts: Record<string, number> }>(cacheKey)
      if (cached) return NextResponse.json(cached)
    }

    // Query overall recharge transactions across all users
    const res = await supabaseRest(
      `transactions?type=eq.recharge&select=id,type,status,amount,metadata,recharge_orders(id,status)&order=created_at.desc&limit=2000`,
      { cache: 'no-store' }
    )

    const popularCounts: Record<string, number> = {}

    if (res.ok) {
      const rows = (await res.json()) as SimpleTransactionRow[]
      if (Array.isArray(rows)) {
        rows.forEach((tx) => {
          const meta = tx.metadata ?? {}
          const rechargeOrder = tx.recharge_orders?.[0] ?? null

          const roStatus = String(rechargeOrder?.status || '').toLowerCase().trim()
          const txStatus = String(tx.status || '').toLowerCase().trim()
          const metaStatus = String(meta.recharge_status || meta.rechargeStatus || meta.status || '').toLowerCase().trim()

          // Check explicit success vs failure/pending
          const isSuccess = isSuccessStatus(roStatus) || isSuccessStatus(txStatus) || isSuccessStatus(metaStatus)
          const hasFailureOrPending =
            roStatus.includes('fail') || roStatus.includes('refund') || roStatus.includes('cancel') || roStatus.includes('pend') || roStatus.includes('create') ||
            txStatus.includes('fail') || txStatus.includes('refund') || txStatus.includes('cancel') || txStatus.includes('pend') || txStatus.includes('create') ||
            metaStatus.includes('fail') || metaStatus.includes('refund') || metaStatus.includes('cancel') || metaStatus.includes('pend') || metaStatus.includes('create')

          // Only count STRICTLY successful recharges
          if (!isSuccess || hasFailureOrPending) return

          // Pick ONE primary plan ID per transaction to avoid duplicate keys
          const primaryPlanId = String(
            meta.system_plan_id ||
            meta.systemPlanId ||
            meta.plan_id ||
            meta.planId ||
            meta.internal_plan_id ||
            meta.internalPlanId ||
            meta.dtone_plan_id ||
            ''
          ).trim()

          if (primaryPlanId) {
            popularCounts[primaryPlanId] = (popularCounts[primaryPlanId] || 0) + 1
          }

          // Extract operator name and price amount for operator-specific key matching
          const rawOpName = String(meta.operator_name || meta.carrierName || meta.operator || meta.provider_name || '').toLowerCase().trim()
          const cleanOpName = rawOpName.split(/\s+/)[0] || rawOpName
          const numAmount = Number(meta.plan_price || meta.recharge_amount || meta.send_amount || tx.amount || 0)

          // Only set operator_amount key if cleanOpName is a real operator name (not generic "value" or "topup")
          if (cleanOpName && cleanOpName !== 'value' && cleanOpName !== 'topup' && cleanOpName !== 'plan' && numAmount > 0) {
            const key1 = `${cleanOpName}_${Math.round(numAmount)}`
            const key2 = `${rawOpName}_${Math.round(numAmount)}`
            popularCounts[key1] = (popularCounts[key1] || 0) + 1
            if (key2 !== key1) popularCounts[key2] = (popularCounts[key2] || 0) + 1
          }
        })
      }
    }

    const payload = { popularCounts }
    await cacheSetJson(cacheKey, payload, 180) // Cache 3 min
    return NextResponse.json(payload)
  } catch (error) {
    console.error('popular-plans GET error:', error)
    return NextResponse.json({ popularCounts: {} })
  }
}
