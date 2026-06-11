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
  console.log('=== SYSTEM PLANS FOR INDIA (IND) ===')
  try {
    // 1. Get system operator IDs for India
    const opRes = await supabaseRest('system_operators?country_id=eq.IND&select=id,system_operator_name', { cache: 'no-store' })
    if (!opRes.ok) throw new Error(await opRes.text())
    const ops = await opRes.json() as any[]
    const opIds = ops.map(o => o.id)
    const opMap = new Map(ops.map(o => [o.id, o.system_operator_name]))

    if (opIds.length === 0) {
      console.log('No system operators found for India.')
      return
    }

    // 2. Fetch system plans
    const res = await supabaseRest(`system_plans?system_operator_id=in.(${opIds.join(',')})&select=*&order=amount.asc`, { cache: 'no-store' })
    if (res.ok) {
      const plans = await res.json() as any[]
      console.log(`Found ${plans.length} system plans in India:\n`)
      for (const p of plans) {
        console.log(`- Plan: "${p.system_plan_name}" | ID: ${p.id}`)
        console.log(`  Amount: ${p.amount} ${p.currency} | Status: ${p.status}`)
        console.log(`  Operator: "${opMap.get(p.system_operator_id)}" (${p.system_operator_id})`)
        console.log(`  Internal Plan ID: "${p.internal_plan_id}"`)
        
        if (p.internal_plan_id) {
          // Check if this internal plan has enabled mapping in internal_plan_provider_mapping
          const mapRes = await supabaseRest(`internal_plan_provider_mapping?internal_plan_id=eq.${p.internal_plan_id}&enabled=eq.true&select=id,provider_id,provider_price`, { cache: 'no-store' })
          const maps = mapRes.ok ? (await mapRes.json() as any[]) : []
          console.log(`  Enabled mappings: ${maps.length}`)
          maps.forEach(m => {
            console.log(`    -> Provider: ${m.provider_id} | Price: ${m.provider_price}`)
          })
        } else {
          console.log(`  Enabled mappings: 0 (No Internal Plan linked)`)
        }
        console.log('')
      }
    } else {
      console.log('Failed to fetch system plans:', await res.text())
    }
  } catch (err) {
    console.error('Error querying database:', err)
  }
}

run()
