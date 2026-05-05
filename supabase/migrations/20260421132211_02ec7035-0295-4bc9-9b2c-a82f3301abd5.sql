-- Helper function: get OPD id of a given user, bypassing RLS
CREATE OR REPLACE FUNCTION public.get_user_opd(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT opd_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- ===== profiles: fix admin SELECT policy =====
DROP POLICY IF EXISTS "Admin lihat profil pemohon" ON public.profiles;
CREATE POLICY "Admin lihat profil pemohon"
ON public.profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin_opd'::app_role)
  AND id IN (
    SELECT pemohon_id FROM public.permohonan
    WHERE opd_id = public.get_user_opd(auth.uid())
  )
);

-- ===== permohonan: fix SELECT & UPDATE policies =====
DROP POLICY IF EXISTS "Warga lihat permohonan sendiri" ON public.permohonan;
CREATE POLICY "Warga lihat permohonan sendiri"
ON public.permohonan FOR SELECT
TO authenticated
USING (
  auth.uid() = pemohon_id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    has_role(auth.uid(), 'admin_opd'::app_role)
    AND opd_id = public.get_user_opd(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admin update permohonan" ON public.permohonan;
CREATE POLICY "Admin update permohonan"
ON public.permohonan FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    has_role(auth.uid(), 'admin_opd'::app_role)
    AND opd_id = public.get_user_opd(auth.uid())
  )
);

-- ===== permohonan_riwayat: fix SELECT policy (also recursed) =====
DROP POLICY IF EXISTS "Lihat riwayat sesuai permohonan" ON public.permohonan_riwayat;
CREATE POLICY "Lihat riwayat sesuai permohonan"
ON public.permohonan_riwayat FOR SELECT
TO authenticated
USING (
  permohonan_id IN (
    SELECT id FROM public.permohonan
    WHERE auth.uid() = pemohon_id
       OR has_role(auth.uid(), 'super_admin'::app_role)
       OR (
         has_role(auth.uid(), 'admin_opd'::app_role)
         AND opd_id = public.get_user_opd(auth.uid())
       )
  )
);