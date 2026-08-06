-- Migration: Create operator_logos table and storage bucket for Operator Logo Sync using Brandfetch

CREATE TABLE IF NOT EXISTS public.operator_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_operator_id UUID NOT NULL UNIQUE REFERENCES public.system_operators(id) ON DELETE CASCADE,
  logo_url TEXT,
  brandfetch_domain TEXT,
  logo_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (logo_status IN ('PENDING', 'FOUND', 'NOT_FOUND', 'FAILED')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for FK and status lookups
CREATE INDEX IF NOT EXISTS idx_operator_logos_system_operator_id ON public.operator_logos(system_operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_logos_logo_status ON public.operator_logos(logo_status);

-- Enable RLS and set policies
ALTER TABLE public.operator_logos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read operator_logos" ON public.operator_logos;
CREATE POLICY "Public read operator_logos"
  ON public.operator_logos
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role full access operator_logos" ON public.operator_logos;
CREATE POLICY "Service role full access operator_logos"
  ON public.operator_logos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT ALL ON public.operator_logos TO authenticated;
GRANT ALL ON public.operator_logos TO service_role;
GRANT ALL ON public.operator_logos TO postgres;
GRANT SELECT ON public.operator_logos TO anon;

-- Ensure public storage bucket 'operator-logos' exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('operator-logos', 'operator-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read operator-logos storage" ON storage.objects;
CREATE POLICY "Public read operator-logos storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'operator-logos');

DROP POLICY IF EXISTS "Service insert operator-logos storage" ON storage.objects;
CREATE POLICY "Service insert operator-logos storage"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'operator-logos');

DROP POLICY IF EXISTS "Service update operator-logos storage" ON storage.objects;
CREATE POLICY "Service update operator-logos storage"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'operator-logos');
