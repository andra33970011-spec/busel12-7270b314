-- ========== AUDIT LOG ==========
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  aksi text NOT NULL,
  entitas text NOT NULL,
  entitas_id text,
  data_sebelum jsonb,
  data_sesudah jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_entitas ON public.audit_log(entitas, entitas_id);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin lihat audit log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated insert audit log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_opd'));

-- ========== JOB QUEUE ==========
CREATE TYPE public.job_status AS ENUM ('pending', 'running', 'success', 'failed', 'dead');

CREATE TABLE public.job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.job_status NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  result jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_queue_status_scheduled ON public.job_queue(status, scheduled_at) WHERE status IN ('pending','failed');
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin lihat semua job" ON public.job_queue
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ========== RATE LIMIT ==========
CREATE TABLE public.rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count int NOT NULL DEFAULT 1
);
CREATE INDEX idx_rate_limit_lookup ON public.rate_limit(identifier, bucket, window_start DESC);
ALTER TABLE public.rate_limit ENABLE ROW LEVEL SECURITY;
-- No policies = locked down to service_role only.

-- ========== PERMOHONAN: kolom tambahan ==========
ALTER TABLE public.permohonan
  ADD COLUMN IF NOT EXISTS prioritas text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS tenggat timestamptz,
  ADD COLUMN IF NOT EXISTS ringkasan text;

ALTER TABLE public.permohonan
  ADD CONSTRAINT permohonan_prioritas_check CHECK (prioritas IN ('rendah','normal','tinggi'));

-- Super admin bisa hapus permohonan
CREATE POLICY "Super admin hapus permohonan" ON public.permohonan
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ========== PROFIL: admin lihat profil pemohon ==========
CREATE POLICY "Admin lihat profil pemohon" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_opd')
    AND id IN (SELECT pemohon_id FROM public.permohonan WHERE opd_id IN (
      SELECT opd_id FROM public.profiles WHERE id = auth.uid()
    ))
  );

-- ========== TRIGGER updated_at ==========
DROP TRIGGER IF EXISTS trg_permohonan_updated ON public.permohonan;
CREATE TRIGGER trg_permohonan_updated
  BEFORE UPDATE ON public.permohonan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== STORAGE: bucket berkas-permohonan ==========
INSERT INTO storage.buckets (id, name, public)
VALUES ('berkas-permohonan', 'berkas-permohonan', false)
ON CONFLICT (id) DO NOTHING;

-- Warga upload ke folder yang diawali dengan user-id mereka
CREATE POLICY "Warga upload berkas sendiri" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'berkas-permohonan'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Warga lihat berkas sendiri" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'berkas-permohonan'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin_opd')
    )
  );

CREATE POLICY "Warga hapus berkas sendiri" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'berkas-permohonan'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ========== HELPER: catat audit log dari client (security definer not needed; RLS sudah benar) ==========
-- Sudah cukup via INSERT policy di atas.

-- ========== HELPER: log permohonan otomatis ==========
CREATE OR REPLACE FUNCTION public.log_permohonan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_log (user_id, aksi, entitas, entitas_id, data_sebelum, data_sesudah)
    VALUES (
      auth.uid(),
      'permohonan.status_changed',
      'permohonan',
      NEW.id::text,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_permohonan_audit ON public.permohonan;
CREATE TRIGGER trg_permohonan_audit
  AFTER UPDATE ON public.permohonan
  FOR EACH ROW EXECUTE FUNCTION public.log_permohonan_change();