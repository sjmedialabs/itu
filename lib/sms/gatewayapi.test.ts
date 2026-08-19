import { formatPhoneToMsisdn, sendGatewayApiSms } from './gatewayapi'

describe('GatewayAPI SMS Service', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.restoreAllMocks()
    process.env = { ...originalEnv }
    process.env.GATEWAYAPI_BASE_URL = 'https://messaging.gatewayapi.com'
    process.env.GATEWAYAPI_API_TOKEN = 'test-token-123'
    process.env.GATEWAYAPI_SENDER = 'ITU'
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('formatPhoneToMsisdn', () => {
    it('should format 10-digit Indian numbers to 91 MSISDN', () => {
      expect(formatPhoneToMsisdn('9876543210')).toBe(919876543210)
    })

    it('should strip plus sign from international MSISDN', () => {
      expect(formatPhoneToMsisdn('+919876543210')).toBe(919876543210)
      expect(formatPhoneToMsisdn('+14155552671')).toBe(14155552671)
    })

    it('should handle formatted numbers with spaces and hyphens', () => {
      expect(formatPhoneToMsisdn('+91 98765-43210')).toBe(919876543210)
    })

    it('should return null for invalid phone numbers', () => {
      expect(formatPhoneToMsisdn('')).toBeNull()
      expect(formatPhoneToMsisdn('abc')).toBeNull()
    })
  })

  describe('sendGatewayApiSms', () => {
    it('should return error if GATEWAYAPI_API_TOKEN is missing', async () => {
      delete process.env.GATEWAYAPI_API_TOKEN

      const res = await sendGatewayApiSms({
        recipient: '9876543210',
        message: 'Test message',
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBe('SMS service configuration missing.')
      }
    })

    it('should return error for invalid phone number', async () => {
      const res = await sendGatewayApiSms({
        recipient: 'invalid',
        message: 'Test message',
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBe('Invalid recipient phone number format.')
      }
    })

    it('should make POST request with Token authorization header and return success on 202', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        status: 202,
        text: jest.fn().mockResolvedValue(JSON.stringify({ msg_id: '01JNN696A9E0WS89FPYGT15NBX' })),
      })
      global.fetch = mockFetch as any

      const res = await sendGatewayApiSms({
        recipient: '+919876543210',
        message: 'Your verification code is 123456.',
      })

      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.msgId).toBe('01JNN696A9E0WS89FPYGT15NBX')
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://messaging.gatewayapi.com/mobile/single',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Token test-token-123',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            sender: 'ITU',
            message: 'Your verification code is 123456.',
            recipient: 919876543210,
          }),
        }
      )
    })

    it('should handle GatewayAPI error responses safely without leaking secrets', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        status: 403,
        text: jest.fn().mockResolvedValue(JSON.stringify({ message: 'Forbidden' })),
      })
      global.fetch = mockFetch as any

      const res = await sendGatewayApiSms({
        recipient: '9876543210',
        message: 'Test message',
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(403)
        expect(res.error).toBe('Unable to send SMS. Please try again later.')
      }
    })

    it('should handle network exceptions gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Fetch network error'))

      const res = await sendGatewayApiSms({
        recipient: '9876543210',
        message: 'Test message',
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBe('SMS service temporarily unavailable.')
      }
    })
  })
})
