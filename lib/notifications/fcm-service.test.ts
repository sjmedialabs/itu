import { sendFcmPushToUser } from '@/lib/notifications/fcm-service'

jest.mock('@/lib/db/supabase-rest', () => ({
  supabaseRest: jest.fn(),
}))

const mockSendEachForMulticast = jest.fn()
const mockInitializeApp = jest.fn()
const mockAdmin = {
  apps: [],
  credential: {
    cert: jest.fn().mockReturnValue('mock-credential'),
    applicationDefault: jest.fn().mockReturnValue('mock-credential'),
  },
  initializeApp: mockInitializeApp.mockReturnValue({ name: 'mock-app' }),
  messaging: jest.fn().mockReturnValue({
    sendEachForMulticast: mockSendEachForMulticast,
  }),
}

jest.mock('firebase-admin', () => mockAdmin, { virtual: true })

import { supabaseRest } from '@/lib/db/supabase-rest'

const mockRest = supabaseRest as jest.MockedFunction<typeof supabaseRest>

function jsonResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response
}

describe('FCM Push Notification Service & Token Management', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    jest.clearAllMocks()
    originalEnv = { ...process.env } as NodeJS.ProcessEnv
    mockAdmin.apps = [] as any
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('skips push when userId is empty', async () => {
    await sendFcmPushToUser({ userId: '', title: 'Test', body: 'Body' })
    expect(mockRest).not.toHaveBeenCalled()
  })

  it('fetches FCM tokens and sends multicast push notification to registered devices', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project'
    process.env.FIREBASE_CLIENT_EMAIL = 'test@project.iam.gserviceaccount.com'
    process.env.FIREBASE_PRIVATE_KEY = 'test-private-key'

    // Mock fetching FCM tokens for user
    mockRest.mockResolvedValueOnce(
      jsonResponse([{ fcm_token: 'token-device-1' }, { fcm_token: 'token-device-2' }])
    )

    // Mock FCM sendEachForMulticast response (2 successes)
    mockSendEachForMulticast.mockResolvedValueOnce({
      successCount: 2,
      failureCount: 0,
      responses: [{ success: true }, { success: true }],
    })

    await sendFcmPushToUser({ userId: 'user-active', title: 'Payment Success', body: 'Your topup completed' })

    expect(mockRest).toHaveBeenCalledWith(
      expect.stringContaining('user_fcm_tokens?user_id=eq.user-active'),
      expect.any(Object)
    )

    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['token-device-1', 'token-device-2'],
        notification: {
          title: 'Payment Success',
          body: 'Your topup completed',
        },
      })
    )
  })

  it('identifies and deletes expired/unregistered FCM tokens on delivery failure', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project'
    process.env.FIREBASE_CLIENT_EMAIL = 'test@project.iam.gserviceaccount.com'
    process.env.FIREBASE_PRIVATE_KEY = 'test-private-key'

    // Mock fetching 2 tokens
    mockRest.mockResolvedValueOnce(
      jsonResponse([{ fcm_token: 'valid-token' }, { fcm_token: 'stale-token-uninstalled' }])
    )

    // Mock 1 success, 1 failure (unregistered token)
    mockSendEachForMulticast.mockResolvedValueOnce({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
      ],
    })

    // Mock DB delete response for stale token
    mockRest.mockResolvedValueOnce(jsonResponse({ count: 1 }))

    await sendFcmPushToUser({ userId: 'user-mixed-tokens', title: 'Alert', body: 'Test body' })

    expect(mockSendEachForMulticast).toHaveBeenCalled()
    // Verify DELETE was called for stale-token-uninstalled
    expect(mockRest).toHaveBeenCalledWith(
      expect.stringContaining('fcm_token=eq.stale-token-uninstalled'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('handles scenario when user has no FCM tokens registered', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project'
    process.env.FIREBASE_CLIENT_EMAIL = 'test@project.iam.gserviceaccount.com'
    process.env.FIREBASE_PRIVATE_KEY = 'test-private-key'

    mockRest.mockResolvedValueOnce(jsonResponse([]))

    await sendFcmPushToUser({ userId: 'user-no-tokens', title: 'Welcome', body: 'Hello' })

    expect(mockRest).toHaveBeenCalledWith(
      expect.stringContaining('user_fcm_tokens?user_id=eq.user-no-tokens'),
      expect.any(Object)
    )
    expect(mockSendEachForMulticast).not.toHaveBeenCalled()
  })
})
