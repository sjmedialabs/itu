/**
 * Read env vars via dynamic lookup so deploy-time secrets are visible after `next build`.
 * Plain `process.env.SUPABASE_URL` can be inlined as empty when missing at build time.
 */
export function runtimeEnv(name: string): string | undefined {
  const v = process.env[name]
  return typeof v === 'string' ? v.trim() || undefined : undefined
}
