import { supabaseRest } from '../lib/db/supabase-rest'
import { processLcrV2Recharge } from '../lib/lcr-v2/recharge'
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

// Enable LCR v2 for testing
process.env.LCR_V2_ENABLED = 'true'

async function run() {
  console.log('=== TEST RECHARGE LOGS & HINTS ===')
  try {
    // 1. Fetch a valid active mapping to use for testing
    const mapRes = await supabaseRest(
      'internal_plan_provider_mapping?enabled=eq.true&limit=1&select=internal_plan_id,provider_id,provider_plan_id,provider_price',
      { cache: 'no-store' }
    )
    if (!mapRes.ok) {
      throw new Error(`Failed to load mappings: ${await mapRes.text()}`)
    }
    const mappings = await mapRes.json() as any[]
    if (mappings.length === 0) {
      console.log('No enabled internal plan mappings found in the database. Please map a plan first.')
      return
    }

    const mapping = mappings[0]
    const internalPlanId = mapping.internal_plan_id
    console.log(`Using mapping: InternalPlanID=${internalPlanId}, ProviderID=${mapping.provider_id}, SKU=${mapping.provider_plan_id}, Cost=${mapping.provider_price}`)

    // 2. Mock a Request object
    const request = new Request('http://localhost:3000/api/recharge', {
      method: 'POST',
      headers: {
        'idempotency-key': `test-idem-${Date.now()}`,
        'Content-Type': 'application/json'
      }
    })

    // 3. Construct the recharge body
    const body = {
      internalPlanId,
      phoneNumber: '919876543210',
      sendAmount: mapping.provider_price || 10.0,
      receiveCurrency: 'INR'
    }

    console.log('\nInvoking processLcrV2Recharge...')
    const result = await processLcrV2Recharge(request, body)

    console.log('\n--- processLcrV2Recharge Result ---')
    console.log('OK:', result.ok)
    console.log('Status Code:', result.status)
    if ('error' in result) {
      console.log('Error:', result.error)
    }
    if ('attempts' in result) {
      console.log('Attempts:', JSON.stringify(result.attempts, null, 2))
    }
    if ('hints' in result) {
      console.log('\nCollected Hints in Response JSON:')
      result.hints.forEach((hint: string) => console.log(`  -> ${hint}`))
    }

  } catch (error) {
    console.error('Test run failed:', error)
  }
}

run()
