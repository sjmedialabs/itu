/**
 * Server-side Supabase PostgREST access (service role).
 * Used for catalog reads/writes; bypasses RLS when service role is configured.
 */

export function isSupabaseCatalogConfigured(): boolean {
  return !!(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
}

function normalizeSupabaseBaseUrl(raw: string): string {
  // Accept either:
  // - https://xyz.supabase.co
  // - https://xyz.supabase.co/
  // - https://xyz.supabase.co/rest/v1
  // - https://xyz.supabase.co/rest/v1/
  return raw
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/$/, '')
}

export async function supabaseRest(pathWithQuery: string, init?: RequestInit): Promise<Response> {
  const baseRaw = process.env.SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!baseRaw || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for database-backed catalog')
  }
  const base = normalizeSupabaseBaseUrl(baseRaw)
  const url = `${base}/rest/v1/${pathWithQuery.replace(/^\//, '')}`
  return fetch(url, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>),
    },
    cache: 'no-store',
  })
}
