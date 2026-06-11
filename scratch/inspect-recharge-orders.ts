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
  console.log('=== INSPECTING RECHARGE ORDERS ===')
  try {
    const res = await supabaseRest('recharge_orders?select=*&order=created_at.desc&limit=10', { cache: 'no-store' })
    if (res.ok) {
      const rows = await res.json() as any[]
      console.log(`Found ${rows.length} recharge orders:`)
      rows.forEach((r, idx) => {
        console.log(`\n[Recharge Order ${idx + 1}] ID: ${r.id}`)
        console.log(`  Phone: ${r.phone_number}`)
        console.log(`  Operator Code: "${r.operator_code}"`)
        console.log(`  Operator Name: "${r.operator_name}"`)
        console.log(`  Country ISO: "${r.country_iso}"`)
        console.log(`  SKU Code: "${r.sku_code}"`)
        console.log(`  Status: "${r.status}"`)
        console.log(`  Provider: "${r.provider}"`)
        console.log(`  Provider Ref: "${r.provider_ref}"`)
        console.log(`  Failure Reason: "${r.failure_reason}"`)
        console.log(`  Created At: ${r.created_at}`)
      })
    } else {
      console.log('Failed to fetch recharge orders:', await res.text())
    }
  } catch (err) {
    console.error('Error:', err)
  }
}

run()
