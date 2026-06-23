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

async function check() {
  console.log('=== CHECKING ALL PAYMENT ORDERS ===')
  const poRes = await supabaseRest('payment_orders?select=*&order=created_at.desc')
  const pos = await poRes.json() as any[]
  console.log(`Total payment orders: ${pos.length}`)
  for (const p of pos) {
    console.log(`ID: ${p.id} | Order ID: ${p.order_id} | Plan: ${p.plan_id} | User ID: ${p.user_id} | Amount: ${p.amount} ${p.currency} | Status: ${p.status} | Metadata: ${JSON.stringify(p.metadata)}`)
  }

  console.log('\n=== CHECKING ALL TRANSACTIONS ===')
  const res = await supabaseRest('transactions?select=*&order=created_at.desc')
  const txs = await res.json() as any[]
  console.log(`Total transactions: ${txs.length}`)
  for (const t of txs) {
    console.log(`ID: ${t.id} | Type: ${t.type} | Amount: ${t.amount} ${t.currency} | Status: ${t.status} | Desc: ${t.description} | Metadata: ${JSON.stringify(t.metadata)}`)
  }
}

check().catch(console.error)
