import crypto from 'crypto'

export type TopupOrderStatus = 'pending' | 'success' | 'failed'

export type TopupOrderRecord = {
  id: string
  phone_number: string
  operator: string
  country: string
  plan_id: string
  amount: number
  fee: number
  total: number
  currency: string
  status: TopupOrderStatus
  payment_gateway: string | null
  razorpay_order_id?: string
  razorpay_payment_id?: string
  created_at: string
}

const orders = new Map<string, TopupOrderRecord>()

function nowIso() {
  return new Date().toISOString()
}

export function createOrderMemory(input: Omit<TopupOrderRecord, 'id' | 'created_at'>) {
  const id = crypto.randomUUID()
  const record: TopupOrderRecord = { ...input, id, created_at: nowIso() }
  orders.set(id, record)
  return record
}

export function getOrderMemory(id: string) {
  return orders.get(id) ?? null
}

export function updateOrderMemory(
  id: string,
  patch: Partial<Pick<TopupOrderRecord, 'status' | 'payment_gateway' | 'razorpay_order_id' | 'razorpay_payment_id'>>
) {
  const existing = orders.get(id)
  if (!existing) return null
  const next = { ...existing, ...patch }
  orders.set(id, next)
  return next
}

