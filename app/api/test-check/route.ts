import { NextResponse } from 'next/server'
import { supabaseRest } from '@/lib/db/supabase-rest'

export async function GET() {
  try {
    const pRes = await supabaseRest('lcr_providers?select=id,code,name,adapter_key')
    const providers = await pRes.json().catch(() => [])
    
    const mRes = await supabaseRest('internal_plan_provider_mapping?select=*')
    const mappings = await mRes.json().catch(() => [])

    return NextResponse.json({ providers, mappings })
  } catch (err: any) {
    return NextResponse.json({ error: err.message })
  }
}
