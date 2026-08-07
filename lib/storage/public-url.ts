/**
 * Browser-reachable Supabase storage URLs.
 * Keep this module free of server-only imports so client components can use it.
 *
 * IMPORTANT: read env via dynamic key access (`process.env[name]`), never
 * `process.env.NEXT_PUBLIC_SUPABASE_URL`. Next.js inlines the static form at
 * build time, which can bake an old host/port (e.g. :54421) into the image.
 */

function trimBase(raw: string): string {
  return raw.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '')
}

/** Dynamic lookup so server runtime picks up deploy-time .env / K8s secrets. */
function readEnv(name: string): string {
  if (typeof process === 'undefined') return ''
  const v = process.env[name]
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Prefer browser-reachable public URL, then CDN, then internal SUPABASE_URL.
 * Used when persisting storage object URLs (avatars, tickets, ads, logos).
 */
export function publicSupabaseBaseUrl(): string {
  const pub = readEnv('NEXT_PUBLIC_SUPABASE_URL')
  if (pub) return trimBase(pub)
  const cdn = readEnv('CDN_BASE_URL')
  if (cdn) return trimBase(cdn)
  const internal = readEnv('SUPABASE_URL')
  if (internal) return trimBase(internal)
  return ''
}

/**
 * Rewrite storage object URLs so browsers can load them.
 * Uploads often store URLs built from internal SUPABASE_URL (e.g. http://supabase-kong:8000).
 */
export function toPublicStorageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  const publicBase = publicSupabaseBaseUrl()
  if (!publicBase) return url

  try {
    const parsed = new URL(url)
    if (!parsed.pathname.includes('/storage/v1/object/')) return url
    const publicOrigin = new URL(publicBase).origin
    if (parsed.origin === publicOrigin) return url
    return `${publicBase}${parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}

/** Alias for client components. */
export function toBrowserStorageUrl(url: string | null | undefined): string {
  return toPublicStorageUrl(url) || ''
}

export function isImageAttachmentUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(url)
}
