import {
  fromRazorpayMinorUnits,
  toRazorpayMinorUnits,
  validateRazorpayPaymentAmount,
} from '@/lib/payments/razorpay-amount'

describe('razorpay amount minor units', () => {
  it('converts INR with 2 decimal places', () => {
    expect(toRazorpayMinorUnits(349.5, 'INR')).toBe(34950)
    expect(fromRazorpayMinorUnits(34950, 'INR')).toBe(349.5)
  })

  it('converts KWD with 3 decimal places', () => {
    expect(toRazorpayMinorUnits(3.69, 'KWD')).toBe(3690)
    expect(fromRazorpayMinorUnits(3690, 'KWD')).toBe(3.69)
  })

  it('rounds KWD minor units so last digit is 0', () => {
    expect(toRazorpayMinorUnits(0.325, 'KWD')).toBe(320)
  })

  it('converts JPY with 0 decimal places', () => {
    expect(toRazorpayMinorUnits(1200, 'JPY')).toBe(1200)
  })

  it('rejects KWD payments below 1.000', () => {
    const result = validateRazorpayPaymentAmount(0.32, 'KWD')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.minimumMajor).toBe(1)
      expect(result.error).toMatch(/1\.000 KWD|at least 1 KWD/i)
    }
  })

  it('accepts KWD payments at or above 1.000', () => {
    const result = validateRazorpayPaymentAmount(1.05, 'KWD')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.minorUnits).toBe(1050)
  })
})
