import { supabaseRest } from '../lib/db/supabase-rest'
import { resolveProvider } from '../lib/routing/routing-engine-service'
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
  const planId = '49e86577-a943-4dfe-b971-d7391d1d8e19'
  console.log(`Checking plan ${planId}...`)

  const res = await supabaseRest(`internal_plans?id=eq.${planId}&select=*`, { cache: 'no-store' })
  if (!res.ok) {
    console.error('Failed to fetch plan:', await res.text())
    process.exit(1)
  }
  const plans = await res.json() as any[]
  if (plans.length === 0) {
    console.error('Plan not found')
    process.exit(1)
  }
  const plan = plans[0]
  console.log('Plan details:', JSON.stringify(plan, null, 2))

  console.log('\nResolving provider using routing engine service...')
  const decision = await resolveProvider({
    countryId: plan.country_iso3 ?? '',
    operatorId: plan.operator_ref ?? '',
    productId: planId,
    service: plan.service,
    productType: plan.category,
    transactionId: 'test-trans-123',
    transactionAmount: 4.0,
  })

  console.log('Routing Decision:', JSON.stringify(decision, null, 2))
  process.exit(0)
}

run()
