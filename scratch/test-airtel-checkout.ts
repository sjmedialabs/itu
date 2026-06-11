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
  console.log('=== TESTING AIRTEL IND CHECKOUT FLOW ===')
  try {
    const planId = '2a113566-6cb5-4892-a9b0-f2930a4b5910'
    const mobileNumber = '+917989748290'
    const operatorId = 'Airtel IND'
    const countryId = 'IN'

    // Create a new dummy payment order to avoid duplicate constraints
    const rzOrderId = `rzp_test_order_${Date.now()}`
    const rzPaymentId = `rzp_test_pay_${Date.now()}`

    console.log('Inserting dummy payment order for Airtel IND...')
    const poRes = await supabaseRest('payment_orders?select=id', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        order_id: rzOrderId,
        payment_id: rzPaymentId,
        plan_id: planId,
        mobile_number: mobileNumber,
        operator_id: operatorId,
        country_id: countryId,
        amount: 90.49,
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

    // Execute checkout
    console.log('\nInvoking executeCheckout...')
    const result = await executeCheckout({
      paymentOrderId,
      planId,
      mobileNumber,
      operatorId,
      countryId,
      amount: 90.49,
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
