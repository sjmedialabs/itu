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
  console.log('=== ROUTING RULES IN DATABASE ===')
  try {
    const res = await supabaseRest('lcr_routing_rules?select=*', { cache: 'no-store' })
    if (res.ok) {
      const rules = await res.json() as any[]
      console.log(`Found ${rules.length} routing rules:`)
      rules.forEach(r => {
        console.log(`- Rule Name: "${r.rule_name}"`)
        console.log(`  Country: "${r.country_id}"`)
        console.log(`  Operator Ref: "${r.operator_id}"`)
        console.log(`  Provider ID: "${r.provider_id}"`)
        console.log(`  Priority: ${r.priority}`)
        console.log(`  Status: ${r.status}`)
      })
    } else {
      console.log('Failed to fetch routing rules:', await res.text())
    }
  } catch (err) {
    console.error('Error querying database:', err)
  }
}

run()
