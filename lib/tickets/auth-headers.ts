import type { NextRequest } from 'next/server'

export type RequestUser = {
  id: string
  email: string
  name: string
  role: string
}

export function getRequestUser(request: NextRequest | Request): RequestUser | null {
  const id = request.headers.get('x-user-id')?.trim()
  if (!id) return null
  return {
    id,
    email: request.headers.get('x-user-email')?.trim() ?? '',
    name: request.headers.get('x-user-name')?.trim() ?? 'User',
    role: request.headers.get('x-user-role')?.trim() ?? 'user',
  }
}

export function isAdminRequest(request: NextRequest | Request): boolean {
  const role = request.headers.get('x-user-role')?.trim().toLowerCase()
  const email = request.headers.get('x-user-email')?.trim().toLowerCase()
  return role === 'admin' || email === 'admin@itu.com'
}
