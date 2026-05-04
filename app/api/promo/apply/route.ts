import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    const subtotal = typeof body.subtotal === 'number' ? body.subtotal : 0

    if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 })

    // Simple promo rules (replace with DB later).
    if (code === 'SAVE5') {
      const discount = Math.min(5, Math.max(0, subtotal * 0.15))
      return NextResponse.json({ valid: true, code, discount, message: 'Promo applied' })
    }
    if (code === 'WELCOME') {
      const discount = Math.min(3, Math.max(0, subtotal * 0.1))
      return NextResponse.json({ valid: true, code, discount, message: 'Welcome discount applied' })
    }

    return NextResponse.json({ valid: false, code, discount: 0, message: 'Invalid promo code' })
  } catch (error) {
    console.error('promo/apply:', error)
    return NextResponse.json({ error: 'Failed to apply promo' }, { status: 500 })
  }
}

