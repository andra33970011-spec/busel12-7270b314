
-- 1. RPC agregat rating per OPD (publik, bypass RLS)
CREATE OR REPLACE FUNCTION public.opd_rating_agg()
RETURNS TABLE(opd_id uuid, total_rating bigint, jumlah_rating bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.opd_id,
    COALESCE(SUM(r.skor), 0)::bigint AS total_rating,
    COUNT(r.id)::bigint AS jumlah_rating
  FROM public.permohonan p
  JOIN public.permohonan_rating r ON r.permohonan_id = p.id
  WHERE p.opd_id IS NOT NULL
  GROUP BY p.opd_id;
$$;

GRANT EXECUTE ON FUNCTION public.opd_rating_agg() TO anon, authenticated;

-- 2. RPC daftar lengkap rating untuk super admin
CREATE OR REPLACE FUNCTION public.rating_list_admin()
RETURNS TABLE(
  rating_id uuid,
  skor integer,
  komentar text,
  created_at timestamptz,
  user_id uuid,
  pemohon_nama text,
  permohonan_id uuid,
  permohonan_kode text,
  permohonan_judul text,
  opd_id uuid,
  opd_singkatan text,
  opd_nama text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id AS rating_id,
    r.skor,
    r.komentar,
    r.created_at,
    r.user_id,
    pr.nama_lengkap AS pemohon_nama,
    p.id AS permohonan_id,
    p.kode AS permohonan_kode,
    p.judul AS permohonan_judul,
    p.opd_id,
    o.singkatan AS opd_singkatan,
    o.nama AS opd_nama
  FROM public.permohonan_rating r
  LEFT JOIN public.permohonan p ON p.id = r.permohonan_id
  LEFT JOIN public.opd o ON o.id = p.opd_id
  LEFT JOIN public.profiles pr ON pr.id = r.user_id
  WHERE public.has_role(auth.uid(), 'super_admin'::app_role)
  ORDER BY r.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.rating_list_admin() TO authenticated;

-- 3. Allow super admin delete rating (untuk moderasi komentar)
DROP POLICY IF EXISTS "Super admin hapus rating" ON public.permohonan_rating;
CREATE POLICY "Super admin hapus rating"
ON public.permohonan_rating
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 4. Seed default app_setting keys yang baru (tidak override jika sudah ada)
INSERT INTO public.app_setting (key, value)
VALUES
  ('kinerja_opd_visible_public', 'true'::jsonb),
  ('gdrive_backup_config', '{"enabled":false,"folder_id":"","schedule":"daily","last_run":null,"last_status":null,"last_file":null}'::jsonb)
ON CONFLICT (key) DO NOTHING;
