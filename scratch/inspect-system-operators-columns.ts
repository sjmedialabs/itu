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
  console.log('=== SYSTEM OPERATOR COLUMNS ===')
  try {
    const res = await supabaseRest('system_operators?select=*&limit=1', { cache: 'no-store' })
    if (res.ok) {
      const rows = await res.json() as any[]
      if (rows.length > 0) {
        console.log('Keys of system_operators record:', Object.keys(rows[0]))
        console.log('Full record data:', rows[0])
      } else {
        console.log('No records found in system_operators.')
      }
    } else {
      console.log('Failed to fetch system_operators:', await res.text())
    }
  } catch (err) {
    console.error('Error:', err)
  }
}

run()
