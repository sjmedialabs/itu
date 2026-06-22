/**
 * Write local Supabase connection vars from `supabase status -o env` into .env.
 *
 *   npm run supabase:sync-env
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { spawnSync } from 'child_process'

const ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
] as const

function parseEnvOutput(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return out
}

function upsertEnvLines(existing: string, updates: Record<string, string>): string {
  const lines = existing.split('\n')
  const seen = new Set<string>()
  const result: string[] = []

  for (const line of lines) {
    const t = line.trim()
    if (!t || t.startsWith('#')) {
      result.push(line)
      continue
    }
    const i = key0(t)
    if (i >= 0 && updates[t.slice(0, i).trim()]) {
      const key = t.slice(0, i).trim()
      result.push(`${key}=${updates[key]}`)
      seen.add(key)
    } else {
      result.push(line)
    }
  }

  for (const key of ENV_KEYS) {
    if (!seen.has(key) && updates[key]) {
      result.push(`${key}=${updates[key]}`)
    }
  }

  return result.join('\n')
}

function key0(line: string): number {
  return line.indexOf('=')
}

function main() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) {
    console.error('.env not found — copy .env.example first')
    process.exit(1)
  }

  const result = spawnSync('npx', ['supabase', 'status', '-o', 'env'], {
    encoding: 'utf8',
    shell: true,
    cwd: process.cwd(),
  })

  if (result.status !== 0) {
    console.error(result.stderr || 'supabase status failed — is local Supabase running?')
    process.exit(result.status ?? 1)
  }

  const status = parseEnvOutput(result.stdout)
  const updates: Record<string, string> = {}

  if (status.API_URL) updates.SUPABASE_URL = status.API_URL
  if (status.ANON_KEY) updates.SUPABASE_ANON_KEY = status.ANON_KEY
  if (status.SERVICE_ROLE_KEY) updates.SUPABASE_SERVICE_ROLE_KEY = status.SERVICE_ROLE_KEY
  if (status.DB_URL) {
    updates.DATABASE_URL = status.DB_URL
    updates.DIRECT_URL = status.DB_URL
  }
  if (status.API_URL) updates.NEXT_PUBLIC_SUPABASE_URL = status.API_URL
  if (status.ANON_KEY) updates.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = status.ANON_KEY

  const existing = readFileSync(envPath, 'utf8')
  writeFileSync(envPath, upsertEnvLines(existing, updates), 'utf8')
  console.log('Updated .env with local Supabase URLs and keys.')
  console.log(`  SUPABASE_URL=${updates.SUPABASE_URL ?? '(unchanged)'}`)
  console.log(`  DATABASE_URL=${updates.DATABASE_URL ?? '(unchanged)'}`)
}

main()
