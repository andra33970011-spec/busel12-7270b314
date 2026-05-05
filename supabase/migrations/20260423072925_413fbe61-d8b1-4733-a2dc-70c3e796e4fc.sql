
-- =========================================================
-- 1) AUDIT LOG: cegah insert atas nama user lain
-- =========================================================
DROP POLICY IF EXISTS "Authenticated insert audit log" ON public.audit_log;

CREATE POLICY "User insert own audit log"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
-- Super admin operasi server-side memakai service_role yang bypass RLS,
-- sehingga kita tidak perlu memberi celah "OR has_role(super_admin)" yang
-- bisa disalahgunakan dari client untuk memalsukan user_id orang lain.

-- =========================================================
-- 2) USER_ROLES: pisahkan policy & cegah self-escalation
-- =========================================================
DROP POLICY IF EXISTS "Super admin manage roles" ON public.user_roles;

-- Hanya super admin yang bisa menulis, DAN tidak boleh untuk dirinya sendiri
-- (mencegah seseorang yang somehow mendapat akses tetap dapat mempertahankan
--  super_admin tanpa jejak; perubahan role super_admin harus dilakukan via
--  service_role / migration).
CREATE POLICY "Super admin insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  AND user_id <> auth.uid()
);

CREATE POLICY "Super admin update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  AND user_id <> auth.uid()
);

CREATE POLICY "Super admin delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  AND user_id <> auth.uid()
);

-- Trigger pelindung tambahan: tolak INSERT/UPDATE role untuk diri sendiri
-- pada koneksi dengan auth.uid() (client). Bypass otomatis untuk service_role
-- karena auth.uid() = NULL.
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Pengguna tidak diizinkan mengubah perannya sendiri';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_change ON public.user_roles;
CREATE TRIGGER trg_prevent_self_role_change
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_role_change();

-- =========================================================
-- 3) STORAGE: validasi MIME & ukuran di server
-- =========================================================
-- Set batas pada bucket itu sendiri (file_size_limit & allowed_mime_types).
UPDATE storage.buckets
SET
  file_size_limit = 10485760, -- 10 MB
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
WHERE id = 'berkas-permohonan';

-- Policy upload: hanya user terotentikasi, ke folder miliknya, dengan
-- mime type yang diizinkan dan ukuran <= 10 MB.
DROP POLICY IF EXISTS "Berkas: user upload ke folder sendiri" ON storage.objects;
CREATE POLICY "Berkas: user upload ke folder sendiri"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'berkas-permohonan'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (lower(coalesce(metadata->>'mimetype', '')) IN (
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp'
  ))
  AND coalesce((metadata->>'size')::bigint, 0) <= 10485760
);

-- Policy baca: user lihat berkas miliknya, super_admin & admin_opd dibatasi
-- sesuai permohonan akan tetap memakai signed URL via service role.
DROP POLICY IF EXISTS "Berkas: user baca berkas sendiri" ON storage.objects;
CREATE POLICY "Berkas: user baca berkas sendiri"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'berkas-permohonan'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
