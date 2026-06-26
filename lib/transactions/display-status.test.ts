import {
  isHiddenUserTransaction,
  resolveTransactionDisplayStatus,
} from '@/lib/transactions/display-status'

describe('resolveTransactionDisplayStatus', () => {
  it('prefers completed recharge_orders status over processing transaction status', () => {
    expect(
      resolveTransactionDisplayStatus({
        type: 'recharge',
        transactionStatus: 'processing',
        rechargeOrderStatus: 'completed',
      }),
    ).toBe('completed')
  })

  it('falls back to transaction status when recharge order is missing', () => {
    expect(
      resolveTransactionDisplayStatus({
        type: 'recharge',
        transactionStatus: 'processing',
      }),
    ).toBe('processing')
  })

  it('maps provider_unavailable_after_payment to failed', () => {
    expect(
      resolveTransactionDisplayStatus({
        type: 'recharge',
        transactionStatus: 'processing',
        rechargeOrderStatus: 'provider_unavailable_after_payment',
      }),
    ).toBe('failed')
  })
})

describe('isHiddenUserTransaction', () => {
  it('hides pending_payment recharges', () => {
    expect(
      isHiddenUserTransaction({
        type: 'recharge',
        status: 'pending_payment',
      }),
    ).toBe(true)
  })

  it('shows completed recharges', () => {
    expect(
      isHiddenUserTransaction({
        type: 'recharge',
        status: 'completed',
      }),
    ).toBe(false)
  })
})
