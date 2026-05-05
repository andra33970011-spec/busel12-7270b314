-- 1) Storage SELECT: batasi admin_opd hanya pada berkas pemohon di OPD-nya
DROP POLICY IF EXISTS "Warga lihat berkas sendiri" ON storage.objects;
CREATE POLICY "Warga lihat berkas sendiri" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'berkas-permohonan'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'super_admin')
      OR (
        public.has_role(auth.uid(), 'admin_opd')
        AND (storage.foldername(name))[1] IN (
          SELECT pemohon_id::text FROM public.permohonan
          WHERE opd_id = public.get_user_opd(auth.uid())
        )
      )
    )
  );

-- 2) Storage UPDATE: hanya pemilik berkas atau super admin
DROP POLICY IF EXISTS "Warga update berkas sendiri" ON storage.objects;
CREATE POLICY "Warga update berkas sendiri" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'berkas-permohonan'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'super_admin')
    )
  )
  WITH CHECK (
    bucket_id = 'berkas-permohonan'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- 3) Audit log INSERT: hapus bypass admin_opd untuk mencegah pemalsuan user_id
DROP POLICY IF EXISTS "Authenticated insert audit log" ON public.audit_log;
CREATE POLICY "Authenticated insert audit log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'super_admin')
  );