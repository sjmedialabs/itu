/** Razorpay order amounts are in the currency's smallest unit (not always ×100). */

const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'KWD', 'OMR'])
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY'])

/** Razorpay minimum charge in major units (gateway rejects / rounds up below this). */
const MIN_MAJOR_BY_CURRENCY: Record<string, number> = {
  KWD: 1,
  BHD: 1,
  OMR: 1,
  INR: 1,
  USD: 0.5,
  EUR: 0.5,
  GBP: 0.5,
}

export function razorpayCurrencyExponent(currency: string): number {
  const code = currency.trim().toUpperCase()
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0
  if (THREE_DECIMAL_CURRENCIES.has(code)) return 3
  return 2
}

/**
 * Razorpay requires the last minor-unit digit to be 0 for KWD/BHD/OMR
 * (e.g. 99.991 KWD → 99990 fils, not 99991).
 */
export function normalizeRazorpayMinorUnits(minorUnits: number, currency: string): number {
  const code = currency.trim().toUpperCase()
  if (THREE_DECIMAL_CURRENCIES.has(code)) {
    return Math.floor(minorUnits / 10) * 10
  }
  return minorUnits
}

/** Convert major-unit amount (e.g. 3.69 KWD) to Razorpay minor units (e.g. 3690 fils). */
export function toRazorpayMinorUnits(amount: number, currency: string): number {
  const exponent = razorpayCurrencyExponent(currency)
  const factor = 10 ** exponent
  const raw = Math.round(amount * factor)
  return normalizeRazorpayMinorUnits(raw, currency)
}

/** Convert Razorpay minor units back to major-unit amount for display/reconciliation. */
export function fromRazorpayMinorUnits(minorUnits: number, currency: string): number {
  const exponent = razorpayCurrencyExponent(currency)
  const factor = 10 ** exponent
  return minorUnits / factor
}

export function razorpayMinimumMajorAmount(currency: string): number {
  const code = currency.trim().toUpperCase()
  return MIN_MAJOR_BY_CURRENCY[code] ?? 1
}

export type RazorpayAmountValidation =
  | { ok: true; minorUnits: number }
  | { ok: false; error: string; minimumMajor: number; currency: string }

/** Validate amount before creating a Razorpay order (prevents checkout amount mismatch). */
export function validateRazorpayPaymentAmount(
  amount: number,
  currency: string,
): RazorpayAmountValidation {
  const code = currency.trim().toUpperCase()
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      error: 'Payment amount must be greater than zero.',
      minimumMajor: razorpayMinimumMajorAmount(code),
      currency: code,
    }
  }

  const minimumMajor = razorpayMinimumMajorAmount(code)
  if (amount < minimumMajor) {
    return {
      ok: false,
      error:
        code === 'KWD' || code === 'BHD' || code === 'OMR'
          ? `Razorpay requires at least ${minimumMajor} ${code} per payment. Your total is ${amount.toFixed(3)} ${code} — choose INR or USD as pay currency, or pick a higher-value plan.`
          : `Razorpay requires at least ${minimumMajor} ${code} per payment. Choose another pay currency or a higher-value plan.`,
      minimumMajor,
      currency: code,
    }
  }

  const minorUnits = toRazorpayMinorUnits(amount, code)
  if (THREE_DECIMAL_CURRENCIES.has(code) && minorUnits < 1000) {
    return {
      ok: false,
      error: `Razorpay requires at least 1.000 ${code} per payment (your total is ${amount.toFixed(3)} ${code}). Choose INR or USD as pay currency instead.`,
      minimumMajor: 1,
      currency: code,
    }
  }

  if (!THREE_DECIMAL_CURRENCIES.has(code) && !ZERO_DECIMAL_CURRENCIES.has(code) && minorUnits < 100) {
    return {
      ok: false,
      error: `Razorpay requires at least ${minimumMajor} ${code} per payment.`,
      minimumMajor,
      currency: code,
    }
  }

  return { ok: true, minorUnits }
}
