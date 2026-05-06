CREATE OR REPLACE FUNCTION public.opd_kinerja_agg()
RETURNS TABLE (
  opd_id uuid,
  status text,
  total bigint,
  total_hari_selesai numeric,
  jumlah_selesai bigint,
  tepat_waktu bigint,
  selesai_dengan_sla bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.opd_id,
    p.status::text,
    COUNT(*)::bigint AS total,
    COALESCE(SUM(
      CASE WHEN p.status = 'selesai' AND p.tanggal_masuk IS NOT NULL AND p.updated_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (p.updated_at - p.tanggal_masuk)) / 86400.0
        ELSE 0 END
    ), 0)::numeric AS total_hari_selesai,
    COUNT(*) FILTER (WHERE p.status = 'selesai' AND p.tanggal_masuk IS NOT NULL AND p.updated_at IS NOT NULL)::bigint AS jumlah_selesai,
    COUNT(*) FILTER (WHERE p.status = 'selesai' AND p.tenggat IS NOT NULL AND p.updated_at <= p.tenggat)::bigint AS tepat_waktu,
    COUNT(*) FILTER (WHERE p.status = 'selesai' AND p.tenggat IS NOT NULL)::bigint AS selesai_dengan_sla
  FROM public.permohonan p
  GROUP BY p.opd_id, p.status;
$$;

GRANT EXECUTE ON FUNCTION public.opd_kinerja_agg() TO anon, authenticated;