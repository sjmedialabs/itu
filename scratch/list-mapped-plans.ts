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
  console.log('=== INTERNAL PLANS WITH ENABLED PROVIDER MAPPINGS ===')
  try {
    const res = await supabaseRest(
      'internal_plan_provider_mapping?enabled=eq.true&select=internal_plan_id,provider_id,provider_plan_id,provider_price',
      { cache: 'no-store' }
    )
    if (res.ok) {
      const mappings = await res.json() as any[]
      console.log(`Found ${mappings.length} enabled mappings in database.\n`)
      
      const planIds = Array.from(new Set(mappings.map(m => m.internal_plan_id)))
      console.log(`Unique internal plans mapped: ${planIds.length}`)
      
      for (const id of planIds) {
        const planRes = await supabaseRest(`internal_plans?id=eq.${id}&select=uti_plan_name,country_iso3,operator_ref`, { cache: 'no-store' })
        const plans = planRes.ok ? (await planRes.json() as any[]) : []
        const plan = plans[0]
        
        console.log(`\nInternal Plan ID: ${id}`)
        if (plan) {
          console.log(`  Name: "${plan.uti_plan_name}"`)
          console.log(`  Country: "${plan.country_iso3}"`)
          console.log(`  Operator Ref: "${plan.operator_ref}"`)
        } else {
          console.log(`  [WARNING] Plan not found in internal_plans table!`)
        }
        
        const planMaps = mappings.filter(m => m.internal_plan_id === id)
        planMaps.forEach(m => {
          console.log(`    -> Provider Mapped: ${m.provider_id} | SKU: ${m.provider_plan_id} | Price: ${m.provider_price}`)
        })
      }
    } else {
      console.log('Failed to fetch mappings:', await res.text())
    }
  } catch (err) {
    console.error('Error querying database:', err)
  }
}

run()
