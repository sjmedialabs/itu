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

async function checkTable(tableName: string) {
  try {
    const res = await supabaseRest(`${tableName}?select=*`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json() as any[]
      console.log(`\n=== Table "${tableName}" (${data.length} rows) ===`)
      if (data.length > 0) {
        console.log(JSON.stringify(data.slice(0, 10), null, 2))
        if (data.length > 10) {
          console.log(`... and ${data.length - 10} more rows`)
        }
      }
    } else {
      console.log(`\nFailed to fetch from "${tableName}":`, res.status, await res.text())
    }
  } catch (err: any) {
    console.error(`Error querying table "${tableName}":`, err.message)
  }
}

async function run() {
  console.log('=== ROUTING DATABASE CHECK ===')
  await checkTable('lcr_engine_settings')
}

run()
