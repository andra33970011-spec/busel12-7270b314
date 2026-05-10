-- ===== 4. RATING 1..10 =====
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.permohonan_rating'::regclass AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.permohonan_rating DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.permohonan_rating
  ADD CONSTRAINT permohonan_rating_skor_1_10 CHECK (skor BETWEEN 1 AND 10);

-- ===== 7. TABEL LAPORAN MASYARAKAT =====
CREATE TABLE IF NOT EXISTS public.laporan_masyarakat (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama         text NOT NULL,
  nik          text,
  email        text NOT NULL,
  no_hp        text,
  kategori     text NOT NULL,
  lokasi       text,
  uraian       text NOT NULL,
  status       text NOT NULL DEFAULT 'baru',
  opd_id       uuid REFERENCES public.opd(id) ON DELETE SET NULL,
  tindak_lanjut text,
  ditangani_oleh uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_laporan_status   ON public.laporan_masyarakat (status);
CREATE INDEX IF NOT EXISTS idx_laporan_opd      ON public.laporan_masyarakat (opd_id);
CREATE INDEX IF NOT EXISTS idx_laporan_created  ON public.laporan_masyarakat (created_at DESC);

DROP TRIGGER IF EXISTS trg_laporan_updated ON public.laporan_masyarakat;
CREATE TRIGGER trg_laporan_updated
  BEFORE UPDATE ON public.laporan_masyarakat
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.laporan_masyarakat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Publik kirim laporan" ON public.laporan_masyarakat;
CREATE POLICY "Publik kirim laporan"
  ON public.laporan_masyarakat FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Super admin kelola laporan" ON public.laporan_masyarakat;
CREATE POLICY "Super admin kelola laporan"
  ON public.laporan_masyarakat FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admin OPD lihat laporan" ON public.laporan_masyarakat;
CREATE POLICY "Admin OPD lihat laporan"
  ON public.laporan_masyarakat FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_opd'::app_role));

DROP POLICY IF EXISTS "Admin OPD update laporan" ON public.laporan_masyarakat;
CREATE POLICY "Admin OPD update laporan"
  ON public.laporan_masyarakat FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_opd'::app_role)
    AND (opd_id IS NULL OR opd_id = public.get_user_opd(auth.uid()))
  );

-- ===== 8. ADMIN OPD KELOLA LAYANAN =====
DROP POLICY IF EXISTS "Admin OPD kelola layanan" ON public.layanan_publik;
CREATE POLICY "Admin OPD kelola layanan"
  ON public.layanan_publik FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_opd'::app_role)
    AND opd_id = public.get_user_opd(auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_opd'::app_role)
    AND opd_id = public.get_user_opd(auth.uid())
  );

-- ===== 2. RPC RIWAYAT DENGAN INFO PETUGAS =====
CREATE OR REPLACE FUNCTION public.riwayat_dengan_petugas(_permohonan_id uuid)
RETURNS TABLE (
  id           uuid,
  created_at   timestamptz,
  aksi         text,
  catatan      text,
  oleh         uuid,
  nama_petugas text,
  email_petugas text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _opd uuid;
  _pemohon uuid;
BEGIN
  SELECT opd_id, pemohon_id INTO _opd, _pemohon
  FROM public.permohonan WHERE id = _permohonan_id;

  IF _opd IS NULL THEN RETURN; END IF;

  IF NOT (
    auth.uid() = _pemohon
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR (public.has_role(auth.uid(), 'admin_opd'::app_role)
        AND _opd = public.get_user_opd(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    r.id, r.created_at, r.aksi, r.catatan, r.oleh,
    COALESCE(p.nama_lengkap, '') AS nama_petugas,
    COALESCE(u.email, '')        AS email_petugas
  FROM public.permohonan_riwayat r
  LEFT JOIN public.profiles p ON p.id = r.oleh
  LEFT JOIN auth.users u      ON u.id = r.oleh
  WHERE r.permohonan_id = _permohonan_id
  ORDER BY r.created_at ASC;
END $$;

GRANT EXECUTE ON FUNCTION public.riwayat_dengan_petugas(uuid)
  TO authenticated, anon;