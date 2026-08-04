import { runtimeEnv } from '@/lib/env/runtime'
import { verifyOtpUserId } from '@/lib/auth/otp-session-cookie'
import { resolveUserIdFromAccessToken } from '@/lib/auth/session-cache'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function readCookie(cookieHeader: string, name: string): string {
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return m?.[1] ? decodeURIComponent(m[1]) : ''
}

function readInsecureHeaderUserId(request: Request): string | null {
  const nodeEnv = (process.env.NODE_ENV ?? 'development').toLowerCase()
  if (nodeEnv === 'production') {
    return null
  }

  const allowInsecureUserHeaders =
    process.env.ALLOW_INSECURE_USER_HEADERS === 'true' ||
    runtimeEnv('ALLOW_INSECURE_USER_HEADERS') === 'true'

  if (!allowInsecureUserHeaders) {
    return null
  }

  const headerId = request.headers.get('x-user-id')?.trim() ?? ''
  if (!headerId || !UUID_RE.test(headerId)) return null
  return headerId
}

/**
 * Resolve the authenticated user id for payment/checkout APIs.
 * Order: sb-access-token cookie / Bearer header → itu-user-id cookie → (dev only) x-user-id header when ALLOW_INSECURE_USER_HEADERS=true.
 *
 * Access-token path uses request/Redis/JWT-local caches (see session-cache) to avoid
 * repeated remote /auth/v1/user calls; invalidation checks are still enforced.
 */
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const cookie = request.headers.get('cookie') ?? ''
  const authHeader = request.headers.get('authorization') ?? ''
  const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()

  const token = readCookie(cookie, 'sb-access-token') || bearerToken
  if (token) {
    if (token.startsWith('token-')) {
      const extracted = token.slice(6).trim()
      if (extracted) return extracted
    }
    try {
      const userId = await resolveUserIdFromAccessToken(token)
      if (userId) return userId
    } catch {
      // ignore invalid/expired token
    }
  }

  const otpUserId = verifyOtpUserId(readCookie(cookie, 'itu-user-id'))
  if (otpUserId) return otpUserId

  return readInsecureHeaderUserId(request)
}

export type { ClientAuthUser } from '@/lib/auth/client-auth-headers'
export { buildUserAuthHeaders } from '@/lib/auth/client-auth-headers'
