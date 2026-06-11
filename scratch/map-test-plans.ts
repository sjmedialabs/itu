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

const DING_ID = 'bb376d0e-2cd6-4958-8956-4a9881948f86'
const DTONE_ID = 'a7b07821-e109-4a56-987a-30afaf2f8654'

async function run() {
  const targetPlanIds = [
    '2a113566-6cb5-4892-a9b0-f2930a4b5910',
    '701dbeaa-4aba-4aa7-8327-ed5037f38bfd'
  ]

  console.log('=== SEEDING PROVIDER MAPPINGS FOR Airtel IND ===')
  try {
    for (const planId of targetPlanIds) {
      console.log(`\nMapping Plan ID: ${planId}`)

      // Check if mappings already exist
      const existingRes = await supabaseRest(`internal_plan_provider_mapping?internal_plan_id=eq.${planId}`, { cache: 'no-store' })
      const existing = existingRes.ok ? (await existingRes.json() as any[]) : []
      if (existing.length > 0) {
        console.log(`  Already has ${existing.length} mappings. Deleting old ones first...`)
        await supabaseRest(`internal_plan_provider_mapping?internal_plan_id=eq.${planId}`, { method: 'DELETE' })
      }

      // Insert fresh mappings to Ding & DT One
      const mappingsToInsert = [
        {
          internal_plan_id: planId,
          provider_id: DING_ID,
          provider_plan_id: `MOCK-DING-${planId.slice(0, 8)}`,
          provider_price: 80.0,
          provider_currency: 'INR',
          enabled: true,
          provider_priority: 1
        },
        {
          internal_plan_id: planId,
          provider_id: DTONE_ID,
          provider_plan_id: `MOCK-DTONE-${planId.slice(0, 8)}`,
          provider_price: 1.0,
          provider_currency: 'EUR',
          enabled: true,
          provider_priority: 2
        }
      ]

      const insertRes = await supabaseRest('internal_plan_provider_mapping', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(mappingsToInsert)
      })

      if (insertRes.ok) {
        console.log(`  Successfully created mappings to Ding & DT One!`)
      } else {
        console.error(`  Failed to create mappings: ${await insertRes.text()}`)
      }
    }
  } catch (err) {
    console.error('Error seeding:', err)
  }
}

run()
