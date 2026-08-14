import { NextResponse } from 'next/server'
import { supabaseRest } from '@/lib/db/supabase-rest'
import { getUserIdFromRequest } from '@/lib/auth/get-user-id-from-request'
import {
  isHiddenUserTransaction,
  resolveTransactionDisplayStatus,
} from '@/lib/transactions/display-status'

type TransactionRow = {
  id: string
  user_id: string | null
  type: string
  amount: number | string
  currency: string
  status: string
  description: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  recharge_orders: Array<{
    id: string | null
    status: string | null
    operator_name: string | null
  }> | null
}

function mapTransaction(row: TransactionRow) {
  const rechargeOrder = row.recharge_orders?.[0] ?? null
  const displayStatus = resolveTransactionDisplayStatus({
    type: row.type,
    transactionStatus: row.status,
    rechargeOrderStatus: rechargeOrder?.status,
  })

  const metadata = row.metadata ?? {}
  const carrierName = rechargeOrder?.operator_name || (metadata.carrierName as string)

  return {
    id: row.id,
    userId: row.user_id ?? '',
    type: row.type,
    amount: Number(row.amount) || 0,
    currency: row.currency,
    status: displayStatus,
    transactionStatus: row.status,
    rechargeStatus: rechargeOrder?.status ?? null,
    description: row.description ?? '',
    metadata: {
      ...metadata,
      ...(carrierName ? { carrierName } : {}),
    } as Record<string, unknown>,
    rechargeOrderId: rechargeOrder?.id ?? null,
    createdAt: row.created_at,
  }
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const res = await supabaseRest(
      `transactions?user_id=eq.${encodeURIComponent(userId)}&select=id,user_id,type,amount,currency,status,description,metadata,created_at,recharge_orders(id,status,operator_name)&order=created_at.desc`,
      { cache: 'no-store' },
    )
    if (!res.ok) return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 })

    const rawRows = (await res.json()) as TransactionRow[]

    // Build a map of unresolved operator IDs and logos
    const unresolvedOperatorIds = new Set<string>()
    const allOperatorNames = new Set<string>()

    for (const row of rawRows) {
      const rechargeOrder = row.recharge_orders?.[0] ?? null
      const rawOpId = row.metadata?.operator_id
      if (typeof rawOpId === 'string' && rawOpId.trim()) {
        const opId = rawOpId.trim()
        unresolvedOperatorIds.add(opId)
        if (opId.startsWith('system:')) {
          unresolvedOperatorIds.add(opId.slice(7))
        }
      }
      const name = rechargeOrder?.operator_name || row.metadata?.carrierName || row.metadata?.carrier
      if (typeof name === 'string' && name.trim()) {
        allOperatorNames.add(name.trim().toLowerCase())
      }
    }

    const operatorNameMap = new Map<string, string>()
    const operatorLogoMap = new Map<string, string>()
    const unresolvedList = Array.from(unresolvedOperatorIds)
    const uuidIds = unresolvedList.filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    const codeIds = unresolvedList.filter((id) => !/^[0-9a-f-]{36}$/i.test(id))

    if (uuidIds.length > 0) {
      // 1. Fetch system_operators and their logos
      const sysOpsRes = await supabaseRest(
        `system_operators?id=in.(${uuidIds.map(encodeURIComponent).join(',')})&select=id,system_operator_name`,
        { cache: 'no-store' },
      ).catch(() => null)
      if (sysOpsRes?.ok) {
        const rows = await sysOpsRes.json().catch(() => [])
        for (const r of rows) {
          if (r.id && r.system_operator_name) {
            operatorNameMap.set(r.id, r.system_operator_name)
          }
        }
      }

      const logosRes = await supabaseRest(
        `operator_logos?system_operator_id=in.(${uuidIds.map(encodeURIComponent).join(',')})&logo_status=eq.FOUND&select=system_operator_id,logo_url`,
        { cache: 'no-store' },
      ).catch(() => null)
      if (logosRes?.ok) {
        const logoRows = await logosRes.json().catch(() => [])
        for (const lr of logoRows) {
          if (lr.system_operator_id && lr.logo_url) {
            operatorLogoMap.set(lr.system_operator_id.toLowerCase(), lr.logo_url)
          }
        }
      }

      // 2. Fetch operators by id
      const opsRes = await supabaseRest(
        `operators?id=in.(${uuidIds.map(encodeURIComponent).join(',')})&select=id,name,logo`,
        { cache: 'no-store' },
      ).catch(() => null)
      if (opsRes?.ok) {
        const rows = await opsRes.json().catch(() => [])
        for (const r of rows) {
          if (r.id && r.name) {
            operatorNameMap.set(r.id, r.name)
          }
          if (r.id && r.logo) {
            operatorLogoMap.set(r.id.toLowerCase(), r.logo)
          }
          if (r.name && r.logo) {
            operatorLogoMap.set(r.name.toLowerCase(), r.logo)
          }
        }
      }
    }

    if (codeIds.length > 0) {
      // 3. Fetch operators by code
      const opsByCodeRes = await supabaseRest(
        `operators?code=in.(${codeIds.map(encodeURIComponent).join(',')})&select=code,name,logo`,
        { cache: 'no-store' },
      ).catch(() => null)
      if (opsByCodeRes?.ok) {
        const rows = await opsByCodeRes.json().catch(() => [])
        for (const r of rows) {
          if (r.code && r.name) {
            operatorNameMap.set(r.code, r.name)
          }
          if (r.code && r.logo) {
            operatorLogoMap.set(r.code.toLowerCase(), r.logo)
          }
          if (r.name && r.logo) {
            operatorLogoMap.set(r.name.toLowerCase(), r.logo)
          }
        }
      }
    }

    const filteredRows = rawRows.filter(
      (row) =>
        !isHiddenUserTransaction({
          type: row.type,
          status: row.status,
          description: row.description,
          metadata: row.metadata,
        }),
    )

    const transactions = filteredRows.map((row) => {
      const mapped = mapTransaction(row)
      const rawOpId = typeof row.metadata?.operator_id === 'string' ? row.metadata.operator_id.trim() : ''
      const cleanOpId = rawOpId.startsWith('system:') ? rawOpId.slice(7) : rawOpId

      if (!mapped.metadata?.carrierName && cleanOpId) {
        const resolvedName = operatorNameMap.get(cleanOpId) || operatorNameMap.get(rawOpId)
        if (resolvedName) {
          mapped.metadata = {
            ...mapped.metadata,
            carrierName: resolvedName,
          }
        }
      }

      const carrierName = String(mapped.metadata?.carrierName || mapped.metadata?.carrier || '').trim()

      const existingLogo =
        (row.metadata?.operatorLogo as string) ||
        (row.metadata?.logo as string) ||
        (row.metadata?.operator_logo as string) ||
        (row.metadata?.logoUrl as string)

      const resolvedLogo =
        existingLogo ||
        (cleanOpId ? operatorLogoMap.get(cleanOpId.toLowerCase()) : null) ||
        (rawOpId ? operatorLogoMap.get(rawOpId.toLowerCase()) : null) ||
        (carrierName ? operatorLogoMap.get(carrierName.toLowerCase()) : null) ||
        null

      if (resolvedLogo) {
        mapped.metadata = {
          ...mapped.metadata,
          operatorLogo: resolvedLogo,
          logo: resolvedLogo,
        }
      }

      return mapped
    })

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('profile/transactions:', error)
    return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 })
  }
}
