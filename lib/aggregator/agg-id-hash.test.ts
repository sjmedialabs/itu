import { buildRawPlanLookupByAggId, stringToBigInt } from './agg-id-hash'

describe('agg-id-hash', () => {
  it('stringToBigInt is stable for provider plan ids', () => {
    expect(stringToBigInt('115')).toBe(stringToBigInt('115'))
    expect(stringToBigInt('115')).not.toBe(stringToBigInt('116'))
  })

  it('buildRawPlanLookupByAggId keys by hashed provider_plan_id', async () => {
    const rows = [
      { id: 'raw-1', provider_plan_id: '115' },
      { id: 'raw-2', provider_plan_id: '200' },
    ]
    const map = await buildRawPlanLookupByAggId('provider-1', async () => rows)
    expect(map.get(stringToBigInt('115'))).toEqual({ id: 'raw-1', provider_plan_id: '115' })
    expect(map.get(stringToBigInt('200'))).toEqual({ id: 'raw-2', provider_plan_id: '200' })
  })
})
