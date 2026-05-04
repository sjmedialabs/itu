import { NextResponse } from 'next/server'
import { isSupabaseCatalogConfigured } from '@/lib/db/supabase-rest'

export function catalogNotConfiguredResponse() {
  return NextResponse.json(
    {
      error:
        'Catalog is database-backed only. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then apply supabase/catalog_schema.sql (and optional catalog_seed.sql).',
    },
    { status: 503 },
  )
}

/** Returns a 503 response if Supabase catalog env is missing; otherwise null. */
export function guardCatalog(): NextResponse | null {
  return isSupabaseCatalogConfigured() ? null : catalogNotConfiguredResponse()
}
