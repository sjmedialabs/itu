import type { PlanRow } from '@/lib/db/catalog'
import { runtimeEnv } from '@/lib/env/runtime'

/** When DB seed has no rows, optional demo catalog so flows stay testable. */
export function isCatalogDemoFallbackEnabled(): boolean {
  if (runtimeEnv('CATALOG_DEMO_FALLBACK') === '0') return false
  if (runtimeEnv('CATALOG_DEMO_FALLBACK') === '1') return true
  return process.env.NODE_ENV === 'development'
}

export function getDemoPlanRows(countryIso: string): PlanRow[] {
  const c = countryIso.toUpperCase()

  if (c === 'IN') {
    return [
      {
        sku_code: 'DEMO-IN-199',
        country_iso: 'IN',
        operator_code: 'DEMO',
        price_inr: 199,
        price_eur: 2.45,
        validity: '28 days',
        plan_type: 'combo',
        tag: 'popular',
        benefits: 'Unlimited calls • 1.5 GB/day',
        data_label: '1.5 GB/day',
        calls_label: 'Unlimited',
        sms_label: '100 SMS/day',
        plan_name: 'Demo unlimited combo',
      },
      {
        sku_code: 'DEMO-IN-349',
        country_iso: 'IN',
        operator_code: 'DEMO',
        price_inr: 349,
        price_eur: 4.1,
        validity: '28 days',
        plan_type: 'data',
        tag: 'none',
        benefits: '2 GB/day • Unlimited calls',
        data_label: '2 GB/day',
        calls_label: 'Unlimited',
        sms_label: null,
        plan_name: 'Demo data pack',
      },
    ]
  }

  if (c === 'NG') {
    return [
      {
        sku_code: 'DEMO-NG-500',
        country_iso: 'NG',
        operator_code: 'DEMO',
        price_inr: 500,
        price_eur: 1.2,
        validity: '30 days',
        plan_type: 'topup',
        tag: 'none',
        benefits: 'Airtime demo',
        data_label: null,
        calls_label: null,
        sms_label: null,
        plan_name: 'Demo top-up',
      },
    ]
  }

  return [
    {
      sku_code: `DEMO-${c}-99`,
      country_iso: c,
      operator_code: 'DEMO',
      price_inr: 99,
      price_eur: 1.15,
      validity: '30 days',
      plan_type: 'topup',
      tag: 'none',
      benefits: 'Demo plan',
      data_label: null,
      calls_label: null,
      sms_label: null,
      plan_name: `Demo plan (${c})`,
    },
  ]
}
