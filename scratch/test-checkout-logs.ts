import { supabaseRest } from '../lib/db/supabase-rest'
import { executeCheckout } from '../lib/topup/checkout-service'
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
  console.log('=== TEST POST-PAYMENT CHECKOUT LOGS & HINTS ===')
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
      console.log('No enabled internal plan mappings found in the database.')
      return
    }

    const mapping = mappings[0]
    const planId = mapping.internal_plan_id

    // Fetch the operator and country for this plan to make sure routing succeeds
    const planRes = await supabaseRest(`internal_plans?id=eq.${planId}&limit=1`, { cache: 'no-store' })
    const plans = await planRes.json() as any[]
    const plan = plans[0]
    if (!plan) {
      throw new Error(`Internal plan not found for ID ${planId}`)
    }

    // 2. Create a dummy payment_order in the database
    const rzOrderId = `rzp_test_order_${Date.now()}`
    const rzPaymentId = `rzp_test_pay_${Date.now()}`

    console.log('Inserting dummy payment order...')
    const poRes = await supabaseRest('payment_orders?select=id', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        order_id: rzOrderId,
        payment_id: rzPaymentId,
        plan_id: planId,
        mobile_number: '919876543210',
        operator_id: 'Mauritel',
        country_id: 'IN',
        amount: mapping.provider_price || 10.0,
        currency: 'INR',
        status: 'created'
      })
    })

    if (!poRes.ok) {
      throw new Error(`Failed to insert payment order: ${await poRes.text()}`)
    }

    const pos = await poRes.json() as any[]
    const paymentOrderId = pos[0].id
    console.log(`Created payment order ID: ${paymentOrderId}`)

    // 3. Execute checkout
    console.log('\nInvoking executeCheckout...')
    const result = await executeCheckout({
      paymentOrderId,
      planId,
      mobileNumber: '919876543210',
      operatorId: 'Mauritel',
      countryId: 'IN',
      amount: mapping.provider_price || 10.0,
      currency: 'INR',
      razorpayPaymentId: rzPaymentId
    })

    console.log('\n--- executeCheckout Result ---')
    console.log('OK:', result.ok)
    console.log('Status:', result.status)
    if (result.error) {
      console.log('Error:', result.error)
    }
    if (result.hints) {
      console.log('\nCollected Hints in Result:')
      result.hints.forEach((hint: string) => console.log(`  -> ${hint}`))
    }

  } catch (error) {
    console.error('Test run failed:', error)
  }
}

run()
