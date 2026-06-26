/** UI status for a transaction row (may differ from `transactions.status` for recharges). */
export function resolveTransactionDisplayStatus(input: {
  type: string
  transactionStatus: string
  rechargeOrderStatus?: string | null
}): string {
  const tx = (input.transactionStatus || '').trim().toLowerCase()
  const type = (input.type || '').trim().toLowerCase()

  if (type === 'recharge' && input.rechargeOrderStatus) {
    const ro = input.rechargeOrderStatus.trim().toLowerCase()
    if (ro === 'completed' || ro === 'success') return 'completed'
    if (ro === 'failed' || ro === 'provider_unavailable_after_payment') return 'failed'
    if (ro === 'processing') return 'processing'
    if (ro === 'pending') return 'pending'
    if (ro === 'cancelled' || ro === 'refunded') return ro
  }

  return input.transactionStatus || 'pending'
}

export function isHiddenUserTransaction(input: {
  type: string
  status: string
  description?: string | null
  metadata?: Record<string, unknown> | null
}): boolean {
  const meta = input.metadata ?? {}
  if (meta.hide_from_user === true || meta.hide_from_user === 'true') return true
  if (input.status === 'pending_payment') return true

  if (input.type === 'topup') {
    const desc = input.description || ''
    if (desc.startsWith('Payment for order') || desc.startsWith('Exchange credit from')) {
      return true
    }
  }

  return false
}
