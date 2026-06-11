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
  console.log('=== INTERNAL PLANS FOR INDIA (IND) ===')
  try {
    const res = await supabaseRest('internal_plans?country_iso3=eq.IND&select=*&limit=5', { cache: 'no-store' })
    if (res.ok) {
      const rows = await res.json() as any[]
      console.log(`Found ${rows.length} internal plans:`)
      rows.forEach((r, idx) => {
        console.log(`\n[Plan ${idx + 1}] ID: ${r.id}`)
        console.log(`  Name: "${r.uti_plan_name}"`)
        console.log(`  Country ISO3: "${r.country_iso3}"`)
        console.log(`  Operator Ref: "${r.operator_ref}"`)
      })
    } else {
      console.log('Failed to fetch internal plans:', await res.text())
    }
  } catch (err) {
    console.error('Error:', err)
  }
}

run()
