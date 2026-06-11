import { supabaseRest } from '../lib/db/supabase-rest'
import * as fs from 'fs'
import * as path from 'path'

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let value = match[2] || ''
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.substring(1, value.length - 1)
        }
        process.env[key] = value.trim()
      }
    }
  }
}

loadEnv()

async function run() {
  const planId = '2a113566-6cb5-4892-a9b0-f2930a4b5910'
  console.log(`=== PLAN DETAILS FOR ID: ${planId} ===`)
  try {
    // 1. Check in internal_plans
    const planRes = await supabaseRest(`internal_plans?id=eq.${planId}&select=*`, { cache: 'no-store' })
    if (planRes.ok) {
      const plans = await planRes.json() as any[]
      if (plans.length > 0) {
        const p = plans[0]
        console.log(`Internal Plan found:`)
        console.log(`  Name: "${p.uti_plan_name}"`)
        console.log(`  Country: "${p.country_iso3}"`)
        console.log(`  Operator Ref: "${p.operator_ref}"`)
        console.log(`  Category: "${p.category}"`)
        console.log(`  Active: ${p.active}`)
      } else {
        console.log('Not found in internal_plans table.')
      }
    } else {
      console.log('Failed to query internal_plans:', await planRes.text())
    }

    // 2. Check in system_plans
    const sysPlanRes = await supabaseRest(`system_plans?id=eq.${planId}&select=*`, { cache: 'no-store' })
    if (sysPlanRes.ok) {
      const sysPlans = await sysPlanRes.json() as any[]
      if (sysPlans.length > 0) {
        const sp = sysPlans[0]
        console.log(`\nSystem Plan found:`)
        console.log(`  Name: "${sp.system_plan_name}"`)
        console.log(`  Internal Plan ID: "${sp.internal_plan_id}"`)
        console.log(`  Operator ID: "${sp.system_operator_id}"`)
        console.log(`  Status: ${sp.status}`)
        
        if (sp.internal_plan_id) {
          const mappedRes = await supabaseRest(`internal_plans?id=eq.${sp.internal_plan_id}&select=*`, { cache: 'no-store' })
          const mappedPlans = await mappedRes.json() as any[]
          if (mappedPlans.length > 0) {
            console.log(`  Associated Internal Plan Name: "${mappedPlans[0].uti_plan_name}"`)
          }
        }
      } else {
        console.log('Not found in system_plans table.')
      }
    }

    // 3. Check mappings
    console.log(`\n=== PROVIDER MAPPINGS ===`)
    // We will query internal_plan_provider_mapping for both planId and any referenced internal_plan_id
    const targetPlanIds = [planId]
    const sysPlanRes2 = await supabaseRest(`system_plans?id=eq.${planId}&select=internal_plan_id`, { cache: 'no-store' })
    const sysPlans2 = sysPlanRes2.ok ? (await sysPlanRes2.json() as any[]) : []
    if (sysPlans2[0]?.internal_plan_id) {
      targetPlanIds.push(sysPlans2[0].internal_plan_id)
    }

    for (const id of targetPlanIds) {
      console.log(`Mappings for plan ID ${id}:`)
      const mapRes = await supabaseRest(`internal_plan_provider_mapping?internal_plan_id=eq.${id}&select=*`, { cache: 'no-store' })
      if (mapRes.ok) {
        const maps = await mapRes.json() as any[]
        console.log(`  Found ${maps.length} mappings:`)
        maps.forEach((m, idx) => {
          console.log(`  [Mapping ${idx + 1}] Provider ID: ${m.provider_id} | SKU: ${m.provider_plan_id} | Price: ${m.provider_price} | Enabled: ${m.enabled}`)
        })
      } else {
        console.log(`  Failed to query mappings:`, await mapRes.text())
      }
    }

  } catch (err) {
    console.error('Error running check:', err)
  }
}

run()
