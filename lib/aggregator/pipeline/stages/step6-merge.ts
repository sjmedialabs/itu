import { supabaseRest } from '@/lib/db/supabase-rest'
import * as countries from 'i18n-iso-countries'
import { shouldBlockOperatorAsNonMobile } from '@/lib/aggregator/telecom-validator'
import { operatorMergeKey } from '@/lib/aggregator/pipeline/operator-country-strip'
import {
  logCrossCountrySkip,
  planCountryMatchesOperator,
  resolvePlanCountryCode,
  toCanonicalPlanCountryCode,
} from '@/lib/aggregator/plan-country-resolver'

function groupHasBlockingKeyword(operators: Array<{ name: string; operator_domain?: string | null }>): boolean {
  return operators.some((op) => shouldBlockOperatorAsNonMobile(op.name, op.operator_domain))
}

function operatorCountryCode(op: { country_iso3?: string | null }): string {
  return String(op.country_iso3 ?? '').trim().toUpperCase()
}

function operatorsShareCountry(
  a: { country_iso3?: string | null },
  b: { country_iso3?: string | null },
): boolean {
  const countryA = operatorCountryCode(a)
  const countryB = operatorCountryCode(b)
  return countryA.length > 0 && countryA === countryB
}

function resolveAggPlanCountry(plan: {
  country_code?: string | null
  name?: string | null
  description?: string | null
  raw_response?: unknown
}, operatorCountryIso3: string): string {
  if (plan.country_code && String(plan.country_code).trim()) {
    return toCanonicalPlanCountryCode(plan.country_code)
  }
  return resolvePlanCountryCode({
    planName: plan.name,
    planDescription: plan.description,
    rawPlan: plan.raw_response,
    operatorCountryIso3,
  })
}

export async function runStep6Merge(
  providerId: string,
  config: any,
  syncRunId?: string | null
): Promise<{ success: boolean; message: string; data?: any }> {
  const opsRes = await supabaseRest(`agg_operators?provider=eq.${config.code}&status=eq.active`, { cache: 'no-store' })
  const aggOps = await opsRes.json().catch(() => []) as any[]

  const countryGroups = new Map<string, any[]>()
  for (const op of aggOps) {
    const country = String(op.country_iso3 ?? '').toUpperCase()
    if (!countryGroups.has(country)) countryGroups.set(country, [])
    countryGroups.get(country)!.push(op)
  }

  let totalMerged = 0
  let plansReassigned = 0
  let skippedBlocking = 0
  let skippedCrossCountry = 0
  let skippedMissingCountry = 0
  let skippedCrossCountryPlans = 0

  for (const [country, opsInCountry] of countryGroups.entries()) {
    if (!country || country === 'UNK') {
      skippedMissingCountry += opsInCountry.length
      continue
    }

    const countryName = countries.getName(country, 'en') || undefined
    const mergeGroups = new Map<string, any[]>()

    for (const op of opsInCountry) {
      if (operatorCountryCode(op) !== country) {
        skippedCrossCountry++
        continue
      }

      const normalizedNameKey = operatorMergeKey(op.name, country, countryName)
      if (!normalizedNameKey) continue
      const mergeKey = `${country}::${normalizedNameKey}`
      if (!mergeGroups.has(mergeKey)) mergeGroups.set(mergeKey, [])
      mergeGroups.get(mergeKey)!.push(op)
    }

    for (const group of mergeGroups.values()) {
      if (group.length < 2) continue

      const groupCountry = operatorCountryCode(group[0])
      if (!group.every((op) => operatorCountryCode(op) === groupCountry)) {
        skippedCrossCountry++
        continue
      }

      if (groupHasBlockingKeyword(group)) {
        skippedBlocking++
        continue
      }

      const canonical = group.reduce((prev, curr) =>
        String(prev.name).length <= String(curr.name).length ? prev : curr,
      )
      const canonicalCountry = operatorCountryCode(canonical)

      for (const dup of group) {
        if (dup.id === canonical.id) continue
        if (!operatorsShareCountry(dup, canonical)) {
          skippedCrossCountry++
          continue
        }

        const dupPlansRes = await supabaseRest(
          `agg_plans?operator_id=eq.${dup.id}&select=id,name,description,country_code,raw_response`,
          { cache: 'no-store' },
        )
        const dupPlans = await dupPlansRes.json().catch(() => []) as Array<{
          id: string
          name?: string | null
          description?: string | null
          country_code?: string | null
          raw_response?: unknown
        }>

        for (const dupPlan of dupPlans) {
          const planCountry = resolveAggPlanCountry(dupPlan, operatorCountryCode(dup))
          if (!planCountryMatchesOperator(planCountry, canonicalCountry)) {
            skippedCrossCountryPlans++
            logCrossCountrySkip('Step6', {
              planId: dupPlan.id,
              planName: dupPlan.name ?? undefined,
              planCountry,
              operatorName: canonical.name,
              operatorCountry: canonicalCountry,
              action: 'operator merge plan reassignment',
            })
            continue
          }

          await supabaseRest(`agg_plans?id=eq.${dupPlan.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              operator_id: canonical.id,
              status: canonical.status || 'active',
            }),
          }).catch(() => {})
          plansReassigned++
        }

        totalMerged++

        await supabaseRest(`agg_operators?id=eq.${dup.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'inactive',
            name: `${dup.name} (merged into ${canonical.name})`,
          }),
        }).catch(() => {})
      }

      await supabaseRest(`agg_operators?id=eq.${canonical.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: canonical.name }),
      }).catch(() => {})
    }
  }

  return {
    success: true,
    message: `Step 6 complete. Merged ${totalMerged} duplicate operators (${plansReassigned} plans reassigned, ${skippedCrossCountryPlans} plan reassignments blocked); skipped ${skippedBlocking} groups with blocking keywords; skipped ${skippedCrossCountry} cross-country mismatches.`,
    data: {
      merged: totalMerged,
      plansReassigned,
      skippedCrossCountryPlans,
      skippedBlocking,
      skippedCrossCountry,
      skippedMissingCountry,
      mergedCount: totalMerged,
      syncRunId: syncRunId ?? null,
    },
  }
}
