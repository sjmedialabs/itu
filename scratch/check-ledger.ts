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
  console.log('=== CHECKING WALLET LEDGER ===')
  const res = await supabaseRest('wallet_ledger?select=*&order=created_at.desc')
  const ledger = await res.json() as any[]
  console.log(`Total ledger entries: ${ledger.length}`)
  for (const l of ledger) {
    console.log(`ID: ${l.id} | Wallet ID: ${l.wallet_id} | Tx ID: ${l.transaction_id} | Direction: ${l.direction} | Amount: ${l.amount} ${l.currency} | Balance After: ${l.balance_after} | Reason: ${l.reason}`)
  }
}

check().catch(console.error)
