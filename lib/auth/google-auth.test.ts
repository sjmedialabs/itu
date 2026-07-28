import { POST } from '@/app/api/auth/google/route'

// Mock dependencies
jest.mock('@/lib/db/supabase-rest', () => ({
  supabaseRest: jest.fn().mockImplementation((path: string) => {
    if (path.includes('profiles?email=')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{ id: 'test-user-id' }]),
    })
  }),
}))

jest.mock('@/lib/supabase/auth-rest', () => ({
  supabaseSignInWithIdToken: jest.fn().mockRejectedValue(new Error('Unconfigured')),
  supabaseAdminCreateUser: jest.fn().mockResolvedValue({
    user: { id: 'new-google-user-id', email: 'test@example.com' },
  }),
  supabaseSignInWithPassword: jest.fn().mockResolvedValue({
    session: { access_token: 'fake-access-token', refresh_token: 'fake-refresh-token', expires_in: 3600 },
  }),
}))

jest.mock('@/lib/auth/get-admin-from-request', () => ({
  fetchProfileForUser: jest.fn().mockResolvedValue({
    id: 'new-google-user-id',
    email: 'test@example.com',
    name: 'Google User',
    app_role: 'user',
    is_active: true,
  }),
}))

jest.mock('@/lib/notifications/admin-notifications', () => ({
  createAdminNotification: jest.fn().mockResolvedValue({}),
}))

jest.mock('@/lib/auth/audit', () => ({
  logLoginAudit: jest.fn().mockResolvedValue({}),
}))

jest.mock('@/lib/security/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue({ ok: true }),
}))

describe('POST /api/auth/google', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('should return 400 when missing token', async () => {
    const req = new Request('http://localhost/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.error).toContain('Missing Google token')
  })

  it('should return 401 when Google tokeninfo fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'invalid_token' }),
    }) as any

    const req = new Request('http://localhost/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'invalid-token' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.error).toContain('Invalid or expired Google authentication token')
  })

  it('should sign up and sign in user when Google token is valid', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('oauth2.googleapis.com/tokeninfo')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              sub: 'google-123',
              email: 'test@example.com',
              name: 'Google User',
              picture: 'http://example.com/photo.jpg',
            }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    }) as any

    const req = new Request('http://localhost/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'valid-google-id-token' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.user).toBeDefined()
    expect(json.user.email).toBe('test@example.com')
    expect(json.access_token).toBe('fake-access-token')
  })
})
