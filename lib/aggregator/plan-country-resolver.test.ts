import {
  planCountryMatchesOperator,
  resolvePlanCountryCode,
  toCanonicalPlanCountryCode,
} from './plan-country-resolver'

describe('plan-country-resolver', () => {
  it('extracts ISO2 prefix from plan name', () => {
    expect(
      resolvePlanCountryCode({
        planName: 'NG MTN 5 GB',
        operatorCountryIso3: 'IND',
      }),
    ).toBe('NGA')
  })

  it('extracts country name from plan name', () => {
    expect(
      resolvePlanCountryCode({
        planName: 'Airtel Bangladesh 10 GB',
        operatorCountryIso3: 'IND',
      }),
    ).toBe('BGD')
  })

  it('falls back to operator country when plan has no country hint', () => {
    expect(
      resolvePlanCountryCode({
        planName: '10 GB Data',
        operatorCountryIso3: 'IND',
      }),
    ).toBe('IND')
  })

  it('returns UNK when nothing is available', () => {
    expect(resolvePlanCountryCode({ planName: '10 GB Data' })).toBe('UNK')
  })

  it('normalizes ISO2 to ISO3', () => {
    expect(toCanonicalPlanCountryCode('BD')).toBe('BGD')
    expect(toCanonicalPlanCountryCode('IND')).toBe('IND')
  })

  it('detects cross-country mismatch', () => {
    expect(planCountryMatchesOperator('NGA', 'IND')).toBe(false)
    expect(planCountryMatchesOperator('IND', 'IND')).toBe(true)
    expect(planCountryMatchesOperator('UNK', 'IND')).toBe(true)
  })
})
