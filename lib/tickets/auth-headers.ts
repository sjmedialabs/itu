import type { NextRequest } from 'next/server'
import { supabaseGetUser } from '@/lib/supabase/auth-rest'
import { runtimeEnv } from '@/lib/env/runtime'
import { fetchProfileForUser } from '@/lib/auth/get-admin-from-request'
import { normalizeAppRole } from '@/lib/auth/build-auth-user'
import { verifyOtpUserId } from '@/lib/auth/otp-session-cookie'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type RequestUser = {
  id: string
  email: string
  name: string
  role: string
}

function readCookie(cookieHeader: string, name: string): string {
  const m = cookieHeader.match(new RegExp(`(?:^|[;,]\\s*)${name}=([^;,]+)`))
  return m?.[1] ? decodeURIComponent(m[1]) : ''
}

function insecureHeaderUserIdAllowed(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    runtimeEnv('ALLOW_INSECURE_USER_HEADERS') === 'true'
  )
}

function readInsecureHeaderUserId(request: NextRequest | Request): string | null {
  if (!insecureHeaderUserIdAllowed()) return null
  const rawHeader = request.headers.get('x-user-id')?.trim() ?? ''
  if (!rawHeader) return null
  const uuidMatch = rawHeader.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
  if (uuidMatch && uuidMatch[0]) {
    return uuidMatch[0]
  }
  return null
}

/**
 * Resolve an authenticated end-user from cookies (JWT or OTP session).
 * Never trusts `x-user-id` in production; optional dev-only escape hatch via ALLOW_INSECURE_USER_HEADERS=true.
 */
export async function getAuthenticatedRequestUser(
  request: NextRequest | Request,
): Promise<RequestUser | null> {
  const cookie = request.headers.get('cookie') ?? ''
  const authHeader = request.headers.get('authorization') ?? ''
  let bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (bearerToken) {
    if (bearerToken.startsWith('token-')) {
      bearerToken = bearerToken.replace('token-', '')
    } else if (bearerToken.startsWith('session-')) {
      bearerToken = bearerToken.replace('session-', '')
    }
  }

  const token = readCookie(cookie, 'sb-access-token') || bearerToken
  if (token) {
    try {
      const authUser = await supabaseGetUser(token)
      if (authUser?.id) {
        const profile = await fetchProfileForUser(authUser.id)
        const email = (profile?.email ?? authUser.email ?? '').trim()
        const name =
          (profile?.name ?? (authUser.user_metadata?.name as string) ?? '').trim() || 'User'
        const appRole = normalizeAppRole(profile?.app_role ?? null, email)
        return {
          id: authUser.id,
          email,
          name,
          role: appRole,
        }
      }
    } catch {
      // invalid token
    }

    const cleanToken = token.replace('token-', '').replace('session-', '').trim()
    const uuidMatch = cleanToken.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
    if (uuidMatch && uuidMatch[0]) {
      const userId = uuidMatch[0]
      const profile = await fetchProfileForUser(userId)
      const email = (request.headers.get('x-user-email')?.trim() || profile?.email || '').trim()
      const name = (request.headers.get('x-user-name')?.trim() || profile?.name || 'User').trim()
      const appRole = normalizeAppRole(profile?.app_role ?? null, email)
      return {
        id: userId,
        email,
        name,
        role: appRole,
      }
    }
  }

  const otpUserId = verifyOtpUserId(readCookie(cookie, 'itu-user-id'))
  if (otpUserId) {
    return {
      id: otpUserId,
      email: '',
      name: 'User',
      role: 'user',
    }
  }

  const rawHeaderId = request.headers.get('x-user-id')?.trim() ?? ''
  const uuidMatch = rawHeaderId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
  if (uuidMatch && uuidMatch[0]) {
    const headerId = uuidMatch[0]
    const profile = await fetchProfileForUser(headerId)
    return {
      id: headerId,
      email: request.headers.get('x-user-email')?.trim() || profile?.email || '',
      name: request.headers.get('x-user-name')?.trim() || profile?.name || 'User',
      role: request.headers.get('x-user-role')?.trim() ?? 'user',
    }
  }

  return null
}

export {
  isSuperAdminEmail,
  isClientAdminUser,
  isClientSuperAdmin,
} from '@/lib/auth/client-role'

/**
 * @deprecated Use getAuthenticatedRequestUser — never trust client-supplied x-user-id in production.
 */
export async function getRequestUser(request: NextRequest | Request): Promise<RequestUser | null> {
  return getAuthenticatedRequestUser(request)
}
