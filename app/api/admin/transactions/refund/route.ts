import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/auth/require-admin-permission'
import { getUserIdFromRequest } from '@/lib/auth/get-user-id-from-request'
import { processAdminWalletRefund } from '@/lib/admin/process-wallet-refund'
import { sendFcmPushToUser } from '@/lib/notifications/fcm-service'
import { supabaseRest } from '@/lib/db/supabase-rest'

/**
 * Admin wallet refund for failed recharge delivery.
 * Fulfillment is a single Postgres transaction (row lock + unique refund + wallet credit).
 *
 * Auth: transactions.refund OR wallet.manage — never transactions.view.
 */
export async function POST(request: Request) {
  const denied = await requireAnyAdminPermission(request, [
    'transactions.refund',
    'wallet.manage',
  ])
  if (denied) return denied

  try {
    const body = await request.json().catch(() => ({}))
    const transactionId =
      typeof body.transactionId === 'string' ? body.transactionId.trim() : ''

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 })
    }

    const adminUserId = await getUserIdFromRequest(request)
    const result = await processAdminWalletRefund({
      transactionId,
      adminUserId,
    })

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, code: result.code },
        { status: result.status },
      )
    }

    // Send FCM Push notification to user on new successful refund
    if (result.ok && !result.idempotent && result.transactionId) {
      supabaseRest(
        `transactions?id=eq.${encodeURIComponent(result.transactionId)}&select=user_id&limit=1`,
        { cache: 'no-store' }
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((rows) => {
          const userId = rows?.[0]?.user_id
          if (userId) {
            const formattedAmount =
              result.amount != null ? `${result.currency || ''} ${result.amount}`.trim() : 'amount'
            sendFcmPushToUser({
              userId,
              title: 'Refund Credit Received',
              body: `Your refund of ${formattedAmount} has been credited to your wallet.`,
              data: {
                type: 'amount_refunded',
                transactionId: result.transactionId,
                amount: String(result.amount ?? ''),
                currency: String(result.currency ?? ''),
              },
            }).catch((err) => console.error('[FCM] Error sending refund push:', err))
          }
        })
        .catch((err) => console.error('[FCM] Failed to query user for refund push:', err))
    }

    return NextResponse.json({
      ok: true,
      idempotent: result.idempotent,
      transactionId: result.transactionId,
      refundId: result.refundId,
      refundTransactionId: result.refundTransactionId,
      amount: result.amount,
      currency: result.currency,
      message: result.message,
      code: result.code,
    })
  } catch (error) {
    console.error('Refund processing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
