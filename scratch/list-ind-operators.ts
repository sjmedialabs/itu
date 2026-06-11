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
  console.log('=== SYSTEM OPERATORS IN INDIA (IND) ===')
  try {
    const res = await supabaseRest('system_operators?country_id=eq.IND&select=*', { cache: 'no-store' })
    if (res.ok) {
      const rows = await res.json() as any[]
      console.log(`Found ${rows.length} system operators for India:`)
      rows.forEach(r => {
        console.log(`- ID: ${r.id} | Name: "${r.system_operator_name}" | Slug: "${r.slug}" | Status: "${r.status}"`)
      })
    } else {
      console.log('Failed to fetch system operators:', await res.text())
    }
  } catch (err) {
    console.error('Error querying database:', err)
  }
}

run()
