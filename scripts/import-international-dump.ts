/**
 * Import schema + data from InternationalDump.sql into local Supabase.
 *
 *   npm run db:import-dump
 *   npm run db:import-dump -- "C:\\Users\\You\\Downloads\\InternationalDump.sql"
 */
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs'
import { createInterface } from 'readline'
import { resolve } from 'path'
import { spawnSync } from 'child_process'

const DEFAULT_DUMP = resolve('C:/Users/Adpinz/Downloads/InternationalDump.sql')
const OUTPUT = resolve(process.cwd(), 'supabase/.temp/international-import.sql')
const DB_CONTAINER = 'supabase_db_itu'

const AUTH_COPY_ORDER = ['auth.users', 'auth.identities', 'auth.sessions', 'auth.refresh_tokens'] as const

type CopyBlock = { header: string; lines: string[] }

function schemaFromCopyHeader(header: string): string | null {
  const m = header.match(/^COPY ([\w.]+) /)
  return m?.[1] ?? null
}

function isPublicPostData(line: string): boolean {
  if (line.startsWith('ALTER TABLE ONLY public.')) return true
  if (line.startsWith('CREATE INDEX ') && line.includes(' ON public.')) return true
  if (line.startsWith('CREATE UNIQUE INDEX ') && line.includes(' ON public.')) return true
  if (line.startsWith('CREATE TRIGGER ') && line.includes(' ON public.')) return true
  if (line.startsWith('ALTER TABLE public.') && line.includes(' ENABLE ROW LEVEL SECURITY')) return true
  if (line.startsWith('GRANT ') && line.includes(' ON TABLE public.')) return true
  return false
}

function ddlComplete(line: string, first: string): boolean {
  const t = line.trim()
  if (first.startsWith('CREATE FUNCTION public.')) return t === '$$;' || t.endsWith('$$;')
  if (first.startsWith('CREATE TABLE public.')) return t === ');'
  if (first.startsWith('CREATE VIEW public.')) return t.endsWith(';')
  if (first.startsWith('COMMENT ON ')) return t.endsWith(';')
  return false
}

function startsPublicDdl(line: string): boolean {
  return (
    line.startsWith('CREATE FUNCTION public.') ||
    line.startsWith('CREATE TABLE public.') ||
    line.startsWith('CREATE VIEW public.') ||
    line.startsWith('COMMENT ON COLUMN public.') ||
    line.startsWith('COMMENT ON TABLE public.')
  )
}

async function buildImportSql(dumpPath: string, outPath: string): Promise<void> {
  mkdirSync(resolve(outPath, '..'), { recursive: true })

  const ddlParts: string[] = []
  const authCopies = new Map<string, CopyBlock>()
  const publicCopies: CopyBlock[] = []
  const postDataParts: string[] = []

  let inDataSection = false
  let inPostData = false
  let collectingDdl = false
  let ddlBuffer: string[] = []
  let ddlFirst = ''
  let currentCopy: CopyBlock | null = null

  const flushDdl = () => {
    if (ddlBuffer.length) ddlParts.push(ddlBuffer.join('\n'))
    ddlBuffer = []
    collectingDdl = false
    ddlFirst = ''
  }

  const finishCopy = () => {
    if (!currentCopy) return
    const schema = schemaFromCopyHeader(currentCopy.header)
    if (schema?.startsWith('auth.')) authCopies.set(schema, currentCopy)
    else publicCopies.push(currentCopy)
    currentCopy = null
  }

  const rl = createInterface({ input: createReadStream(dumpPath, { encoding: 'utf8' }), crlfDelay: Infinity })

  for await (const rawLine of rl) {
    const line = rawLine.replace(/\r$/, '')
    if (line.startsWith('\\restrict') || line.startsWith('\\unrestrict')) continue

    if (line.startsWith('-- Data for Name:')) {
      inDataSection = true
      flushDdl()
      continue
    }

    if (inDataSection && line.startsWith('-- Name:') && line.includes('Type: CONSTRAINT')) {
      inPostData = true
      finishCopy()
    }

    if (currentCopy) {
      if (line === '\\.') {
        currentCopy.lines.push('\\.')
        finishCopy()
      } else {
        currentCopy.lines.push(line)
      }
      continue
    }

    if (inDataSection && !inPostData && line.startsWith('COPY ')) {
      const schema = schemaFromCopyHeader(line)
      if (schema?.startsWith('public.') || schema?.startsWith('auth.')) {
        currentCopy = { header: line, lines: [] }
      }
      continue
    }

    if (inPostData) {
      if (line.startsWith('ALTER TABLE ONLY public.')) {
        postDataParts.push(`__ALTER__:${line}`)
      } else if (line.startsWith('    ADD CONSTRAINT')) {
        const last = postDataParts[postDataParts.length - 1]
        if (last?.startsWith('__ALTER__:')) {
          postDataParts.pop()
          postDataParts.push(last.slice('__ALTER__:'.length))
          postDataParts.push(line)
        }
      } else if (isPublicPostData(line)) {
        postDataParts.push(line)
      }
      continue
    }

    if (collectingDdl) {
      ddlBuffer.push(line)
      if (ddlComplete(line, ddlFirst)) flushDdl()
      continue
    }

    if (!inDataSection && startsPublicDdl(line)) {
      ddlFirst = line
      ddlBuffer = [line]
      collectingDdl = true
      if (ddlComplete(line, ddlFirst)) flushDdl()
    }
  }

  flushDdl()
  finishCopy()

  const out = createWriteStream(outPath, { encoding: 'utf8' })
  out.write(`-- Generated from ${dumpPath}\n`)
  out.write('BEGIN;\nSET client_min_messages = warning;\nSET session_replication_role = replica;\n\n')
  out.write('DROP SCHEMA IF EXISTS public CASCADE;\nCREATE SCHEMA public;\n')
  out.write('GRANT ALL ON SCHEMA public TO postgres;\nGRANT ALL ON SCHEMA public TO public;\n')
  out.write('GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;\n\n')
  out.write('CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;\n\n')
  out.write('TRUNCATE auth.refresh_tokens, auth.sessions, auth.identities, auth.users CASCADE;\n\n')

  for (const ddl of ddlParts) out.write(ddl + '\n\n')

  for (const key of AUTH_COPY_ORDER) {
    const block = authCopies.get(key)
    if (!block) continue
    out.write(block.header + '\n')
    for (const l of block.lines) out.write(l + '\n')
    out.write('\n')
  }

  for (const block of publicCopies) {
    out.write(block.header + '\n')
    for (const l of block.lines) out.write(l + '\n')
    out.write('\n')
  }

  out.write(postDataParts.join('\n') + '\n\n')
  out.write('SET session_replication_role = origin;\nNOTIFY pgrst, \'reload schema\';\nCOMMIT;\n')
  out.end()

  await new Promise<void>((res, rej) => {
    out.on('finish', () => res())
    out.on('error', rej)
  })

  console.log(`Built import SQL (${ddlParts.length} DDL blocks, ${publicCopies.length} public data tables)`)
  console.log(`Output: ${outPath}`)
}

function runImport(outPath: string): void {
  console.log('Copying SQL into database container...')
  const copy = spawnSync('docker', ['cp', outPath, `${DB_CONTAINER}:/tmp/international-import.sql`], {
    stdio: 'inherit',
    shell: true,
  })
  if (copy.status !== 0) process.exit(copy.status ?? 1)

  console.log('Importing (this may take several minutes)...')
  const exec = spawnSync(
    'docker',
    ['exec', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', '/tmp/international-import.sql'],
    { stdio: 'inherit', shell: true },
  )
  if (exec.status !== 0) process.exit(exec.status ?? 1)
}

async function main() {
  const dumpPath = resolve(process.argv[2] ?? DEFAULT_DUMP)
  if (!existsSync(dumpPath)) {
    console.error(`Dump not found: ${dumpPath}`)
    process.exit(1)
  }

  console.log(`Source dump: ${dumpPath}`)
  await buildImportSql(dumpPath, OUTPUT)
  runImport(OUTPUT)

  console.log('Import complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
