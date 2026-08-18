import { supabaseRest } from '@/lib/db/supabase-rest'
import { cacheGetJson, cacheSetJson } from '@/lib/cache/redis'

export type UserNotificationType =
  | 'support_ticket_reply'
  | 'support_ticket_status'
  | 'recharge_completed'
  | 'recharge_failed'
  | 'scheduled_recharge'
  | 'amount_refunded'
  | 'general'

export type UserNotificationItem = {
  id: string
  userId: string
  title: string
  message: string
  type: UserNotificationType
  details?: Record<string, any>
  isRead: boolean
  createdAt: string
}

const MEMORY_USER_NOTIFICATIONS: UserNotificationItem[] = []

export async function createUserNotification(params: {
  userId: string
  title: string
  message: string
  type: UserNotificationType
  details?: Record<string, any>
}): Promise<void> {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  const item: UserNotificationItem = {
    id,
    userId: params.userId,
    title: params.title,
    message: params.message,
    type: params.type,
    details: params.details || {},
    isRead: false,
    createdAt,
  }

  // 1. Memory backup
  MEMORY_USER_NOTIFICATIONS.unshift(item)
  if (MEMORY_USER_NOTIFICATIONS.length > 500) {
    MEMORY_USER_NOTIFICATIONS.pop()
  }

  // 2. Redis backup cache
  try {
    const key = `user_notifications:${params.userId}`
    const existing = (await cacheGetJson<UserNotificationItem[]>(key)) || []
    existing.unshift(item)
    await cacheSetJson(key, existing.slice(0, 100), 30 * 24 * 60 * 60) // 30 days
  } catch (err) {
    console.warn('Redis user notification cache error:', err)
  }

  // 3. Supabase REST table write
  try {
    const res = await supabaseRest('user_notifications', {
      method: 'POST',
      body: JSON.stringify({
        id,
        user_id: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        details: params.details || {},
        is_read: false,
        created_at: createdAt,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn('Supabase user_notifications table missing or failed, using cache:', text)
    }
  } catch (err) {
    console.warn('Error saving user notification to Supabase:', err)
  }
}

export async function listNotificationsForUser(userId: string): Promise<UserNotificationItem[]> {
  // 1. Try Supabase REST table first
  try {
    const res = await supabaseRest(
      `user_notifications?user_id=eq.${encodeURIComponent(userId)}&select=id,user_id,title,message,type,details,is_read,created_at&order=created_at.desc&limit=100`,
      { cache: 'no-store' }
    )
    if (res.ok) {
      const rows = await res.json().catch(() => [])
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.map((r: any) => ({
          id: r.id,
          userId: r.user_id || userId,
          title: r.title || 'Notification',
          message: r.message || '',
          type: r.type || 'general',
          details: r.details || {},
          isRead: Boolean(r.is_read),
          createdAt: r.created_at || new Date().toISOString(),
        }))
      }
    }
  } catch {
    /* fallback to redis / memory */
  }

  // 2. Try Redis cache
  try {
    const redisList = await cacheGetJson<UserNotificationItem[]>(`user_notifications:${userId}`)
    if (Array.isArray(redisList) && redisList.length > 0) {
      return redisList
    }
  } catch {
    /* fallback to memory */
  }

  // 3. Memory fallback
  return MEMORY_USER_NOTIFICATIONS.filter((n) => n.userId === userId)
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  // Update memory
  const mem = MEMORY_USER_NOTIFICATIONS.find((n) => n.id === notificationId && n.userId === userId)
  if (mem) mem.isRead = true

  // Update redis
  try {
    const key = `user_notifications:${userId}`
    const list = (await cacheGetJson<UserNotificationItem[]>(key)) || []
    const updated = list.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item))
    await cacheSetJson(key, updated, 30 * 24 * 60 * 60)
  } catch {
    /* ignore */
  }

  // Update Supabase
  try {
    await supabaseRest(`user_notifications?id=eq.${encodeURIComponent(notificationId)}&user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_read: true }),
    })
  } catch {
    /* ignore */
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  // Update memory
  for (const n of MEMORY_USER_NOTIFICATIONS) {
    if (n.userId === userId) n.isRead = true
  }

  // Update redis
  try {
    const key = `user_notifications:${userId}`
    const list = (await cacheGetJson<UserNotificationItem[]>(key)) || []
    const updated = list.map((item) => ({ ...item, isRead: true }))
    await cacheSetJson(key, updated, 30 * 24 * 60 * 60)
  } catch {
    /* ignore */
  }

  // Update Supabase
  try {
    await supabaseRest(`user_notifications?user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_read: true }),
    })
  } catch {
    /* ignore */
  }
}
