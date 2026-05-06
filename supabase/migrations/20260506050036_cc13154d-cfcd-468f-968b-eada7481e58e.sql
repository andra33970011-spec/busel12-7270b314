CREATE OR REPLACE FUNCTION public.count_permohonan_bulan_ini()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.permohonan
  WHERE tanggal_masuk >= date_trunc('month', now());
$$;

GRANT EXECUTE ON FUNCTION public.count_permohonan_bulan_ini() TO anon, authenticated;