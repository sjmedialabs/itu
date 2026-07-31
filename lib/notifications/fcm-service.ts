import { supabaseRest } from '@/lib/db/supabase-rest'

let isFirebaseInitialized = false
let adminModule: any = null

function getFirebaseAdmin(): any {
  if (adminModule) return adminModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    adminModule = require('firebase-admin')
    return adminModule
  } catch {
    return null
  }
}

function getFirebaseAdminApp(): any {
  const admin = getFirebaseAdmin()
  if (!admin) return null

  if (isFirebaseInitialized && admin.apps?.length > 0) {
    return admin.apps[0]
  }

  try {
    if (admin.apps?.length > 0) {
      isFirebaseInitialized = true
      return admin.apps[0]
    }

    let credential: any = null

    // Method 1: FIREBASE_SERVICE_ACCOUNT_KEY JSON string or path
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        credential = admin.credential.cert(parsed)
      } catch {
        credential = admin.credential.cert(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      }
    }
    // Method 2: Individual ENV variables
    else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    }
    // Method 3: GOOGLE_APPLICATION_CREDENTIALS env path
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      credential = admin.credential.applicationDefault()
    }

    if (!credential) {
      return null
    }

    const app = admin.initializeApp({ credential })
    isFirebaseInitialized = true
    return app
  } catch (err) {
    console.warn('[FCM] Failed to initialize Firebase Admin SDK:', err instanceof Error ? err.message : err)
    return null
  }
}

export type FcmPushPayload = {
  userId: string
  title: string
  body: string
  data?: Record<string, string>
}

/**
 * Sends Firebase Push Notification to all registered devices of a given user.
 * Gracefully handles missing credentials, network failures, and stale tokens.
 */
export async function sendFcmPushToUser(payload: FcmPushPayload): Promise<void> {
  const { userId, title, body, data } = payload
  if (!userId) return

  try {
    const admin = getFirebaseAdmin()
    const app = getFirebaseAdminApp()
    if (!admin || !app) {
      console.log(`[FCM] Skipped sending notification to user ${userId}: Firebase credentials or SDK not configured.`)
      return
    }

    // 1. Fetch user FCM tokens from Supabase user_fcm_tokens table
    const res = await supabaseRest(
      `user_fcm_tokens?user_id=eq.${encodeURIComponent(userId)}&select=fcm_token`,
      { cache: 'no-store' }
    )

    if (!res.ok) {
      console.warn(`[FCM] Failed to fetch FCM tokens for user ${userId}: HTTP ${res.status}`)
      return
    }

    const rows = (await res.json()) as { fcm_token: string }[]
    if (!rows || rows.length === 0) {
      console.log(`[FCM] No registered FCM tokens for user ${userId}`)
      return
    }

    const tokens = Array.from(new Set(rows.map((r) => r.fcm_token).filter(Boolean)))
    if (tokens.length === 0) return

    // 2. Dispatch FCM Multicast Message
    const messaging = admin.messaging(app)
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    })

    console.log(`[FCM] Sent notification to user ${userId}: ${response.successCount} success, ${response.failureCount} failure.`)

    // 3. Remove expired/invalid tokens from DB
    if (response.failureCount > 0 && Array.isArray(response.responses)) {
      const tokensToDelete: string[] = []
      response.responses.forEach((resp: { success?: boolean; error?: { code?: string } }, idx: number) => {
        if (!resp.success && resp.error) {
          const errCode = resp.error.code
          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered'
          ) {
            if (tokens[idx]) {
              tokensToDelete.push(tokens[idx])
            }
          }
        }
      })

      if (tokensToDelete.length > 0) {
        for (const token of tokensToDelete) {
          await supabaseRest(
            `user_fcm_tokens?fcm_token=eq.${encodeURIComponent(token)}`,
            { method: 'DELETE' }
          ).catch((e) => console.error('[FCM] Error cleaning up stale token:', e))
        }
      }
    }
  } catch (err) {
    console.error('[FCM] Unexpected error sending push notification:', err instanceof Error ? err.message : err)
  }
}
