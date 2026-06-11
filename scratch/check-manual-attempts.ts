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
  console.log('=== LATEST PAYMENT ORDERS (MANUAL ATTEMPTS) ===')
  try {
    const res = await supabaseRest('payment_orders?select=*&order=created_at.desc&limit=5', { cache: 'no-store' })
    if (res.ok) {
      const rows = await res.json() as any[]
      rows.forEach((r, idx) => {
        console.log(`\n[Order ${idx + 1}] ID: ${r.id}`)
        console.log(`  Plan ID: ${r.plan_id}`)
        console.log(`  Operator ID (Passed): ${r.operator_id}`)
        console.log(`  Country ID (Passed): ${r.country_id}`)
        console.log(`  Mobile Number: ${r.mobile_number}`)
        console.log(`  Amount: ${r.amount}`)
        console.log(`  Status: ${r.status}`)
        console.log(`  Created At: ${r.created_at}`)
      })
    } else {
      console.log('Failed to fetch payment orders:', await res.text())
    }

    console.log('\n=== LATEST TRANSACTIONS ===')
    const txRes = await supabaseRest('transactions?select=*&order=created_at.desc&limit=5', { cache: 'no-store' })
    if (txRes.ok) {
      const rows = await txRes.json() as any[]
      rows.forEach((r, idx) => {
        console.log(`\n[Tx ${idx + 1}] ID: ${r.id}`)
        console.log(`  Amount: ${r.amount}`)
        console.log(`  Status: ${r.status}`)
        console.log(`  Created At: ${r.created_at}`)
        console.log(`  Metadata:`, JSON.stringify(r.metadata))
      })
    }

    console.log('\n=== LATEST LCR V2 RECHARGE ATTEMPTS ===')
    const v2Res = await supabaseRest('lcr_v2_recharge_attempts?select=*&order=created_at.desc&limit=5', { cache: 'no-store' })
    if (v2Res.ok) {
      const rows = await v2Res.json() as any[]
      rows.forEach((r, idx) => {
        console.log(`\n[V2 Attempt ${idx + 1}] ID: ${r.id}`)
        console.log(`  Internal Plan ID: ${r.internal_plan_id}`)
        console.log(`  Phone Number: ${r.phone_number}`)
        console.log(`  Status: ${r.status}`)
        console.log(`  Routing Decision:`, JSON.stringify(r.routing_decision))
        console.log(`  Attempts:`, JSON.stringify(r.attempts))
        console.log(`  Error: ${r.error}`)
      })
    }

  } catch (err) {
    console.error('Error querying database:', err)
  }
}

run()
