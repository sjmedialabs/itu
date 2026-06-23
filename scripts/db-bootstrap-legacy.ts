/**
 * Apply legacy SQL schema files from supabase/*.sql via the local Supabase DB container.
 *
 *   npm run supabase:start
 *   npm run db:bootstrap
 *   npm run db:migrate
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { spawnSync } from 'child_process'

function loadDotEnv() {
  const path = resolve(process.cwd(), '.env')
  if (!existsSync(path)) return
  const text = readFileSync(path, 'utf8')
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

const LEGACY_ORDER = [
  'profiles_schema.sql',
  'profiles_admin_roles.sql',
  'catalog_schema.sql',
  'cms_schema.sql',
  'uti_lcr_schema.sql',
  'uti_lcr_v2_transactions.sql',
  'multi_provider_aggregator_schema.sql',
  'aggregator_catalog_schema.sql',
  'app_operational_schema.sql',
  'payment_checkout_schema.sql',
  'trusted_devices_schema.sql',
  'dynamic_telecom_catalog_schema.sql',
  'filtered_operators_schema.sql',
  'routing_engine_schema.sql',
  'aggregator_reporting.sql',
]

const DB_CONTAINER = 'supabase_db_itu'

function runPsqlViaDocker(sqlFile: string): number {
  const containerPath = '/tmp/bootstrap.sql'
  const copy = spawnSync(
    'docker',
    ['cp', sqlFile, `${DB_CONTAINER}:${containerPath}`],
    { stdio: 'inherit', shell: true },
  )
  if (copy.status !== 0) return copy.status ?? 1

  const exec = spawnSync(
    'docker',
    [
      'exec',
      DB_CONTAINER,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-f',
      containerPath,
    ],
    { stdio: 'inherit', shell: true },
  )
  return exec.status ?? 1
}

async function main() {
  loadDotEnv()

  const supabaseDir = resolve(process.cwd(), 'supabase')
  console.log('Applying legacy Supabase schema files via Docker...')

  for (const name of LEGACY_ORDER) {
    const filePath = resolve(supabaseDir, name)
    if (!existsSync(filePath)) {
      console.warn(`  skip (missing): ${name}`)
      continue
    }
    console.log(`  -> ${name}`)
    const status = runPsqlViaDocker(filePath)
    if (status !== 0) {
      console.error(`Failed applying ${name}`)
      process.exit(status)
    }
  }

  const seedPath = resolve(supabaseDir, 'catalog_seed.sql')
  if (existsSync(seedPath)) {
    console.log('  -> catalog_seed.sql (optional legacy seed)')
    const status = runPsqlViaDocker(seedPath)
    if (status !== 0) {
      console.warn('  catalog_seed.sql skipped (schema mismatch — use npm run db:seed-countries instead)')
    }
  }

  console.log('Legacy schema bootstrap completed. Run `npm run db:migrate` next.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
