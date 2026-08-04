import { getUserIdFromRequest, buildUserAuthHeaders } from '@/lib/auth/get-user-id-from-request'
import { signOtpUserId } from '@/lib/auth/otp-session-cookie'

const USER_ID = '11111111-1111-4111-8111-111111111111'

// Take a snapshot of the original env and update only keys we need.
const ORIGINAL_ENV = { ...process.env }

function setNodeEnv(value: string) {
  process.env = { ...process.env, NODE_ENV: value }
}

describe('getUserIdFromRequest', () => {
  beforeEach(() => {
    // set the values we need explicitly
    setNodeEnv('test')
    process.env.OTP_SESSION_SECRET = 'test-secret'
    delete process.env.ALLOW_INSECURE_USER_HEADERS
  })

  afterAll(() => {
    // Restore original environment safely: remove keys that were added and reset modified values.
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) delete process.env[key]
    }
    for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
      process.env[k] = v as string
    }
  })

  it('rejects an unsigned itu-user-id cookie (forged session)', async () => {
    const request = new Request('http://localhost/api/topup/prepare-checkout', {
      headers: { cookie: `itu-user-id=${USER_ID}` },
    })
    await expect(getUserIdFromRequest(request)).resolves.toBeNull()
  })

  it('accepts a validly signed itu-user-id cookie', async () => {
    const signed = signOtpUserId(USER_ID)
    const request = new Request('http://localhost/api/topup/prepare-checkout', {
      headers: { cookie: `itu-user-id=${encodeURIComponent(signed)}` },
    })
    await expect(getUserIdFromRequest(request)).resolves.toBe(USER_ID)
  })

  it('does not trust x-user-id header by default', async () => {
    const request = new Request('http://localhost/api/topup/prepare-checkout', {
      headers: {
        'x-user-id': USER_ID,
        'x-user-email': 'lovely@sjmedialabs.com',
      },
    })
    await expect(getUserIdFromRequest(request)).resolves.toBeNull()
  })

  it('reads x-user-id only when ALLOW_INSECURE_USER_HEADERS=true outside production', async () => {
    process.env.ALLOW_INSECURE_USER_HEADERS = 'true'
    const request = new Request('http://localhost/api/topup/prepare-checkout', {
      headers: {
        'x-user-id': USER_ID,
      },
    })
    await expect(getUserIdFromRequest(request)).resolves.toBe(USER_ID)
  })

  it('never trusts x-user-id header in production', async () => {
    setNodeEnv('production')
    process.env.ALLOW_INSECURE_USER_HEADERS = 'true'
    const request = new Request('http://localhost/api/topup/prepare-checkout', {
      headers: {
        'x-user-id': USER_ID,
      },
    })
    await expect(getUserIdFromRequest(request)).resolves.toBeNull()
  })

  it('builds auth headers for checkout requests', () => {
    expect(
      buildUserAuthHeaders({
        id: USER_ID,
        email: 'lovely@sjmedialabs.com',
        name: 'Lovely',
        role: 'user',
      }),
    ).toEqual({
      'x-user-id': USER_ID,
      'x-user-email': 'lovely@sjmedialabs.com',
      'x-user-name': 'Lovely',
      'x-user-role': 'user',
    })
  })
})
