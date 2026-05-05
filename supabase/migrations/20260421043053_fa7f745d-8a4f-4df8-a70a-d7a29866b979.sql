
-- Enums
CREATE TYPE public.app_role AS ENUM ('warga', 'admin_opd', 'super_admin');
CREATE TYPE public.status_permohonan AS ENUM ('baru', 'diproses', 'selesai', 'ditolak');

-- OPD table
CREATE TABLE public.opd (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  singkatan TEXT NOT NULL,
  kategori TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.opd ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_lengkap TEXT NOT NULL DEFAULT '',
  nik TEXT,
  no_hp TEXT,
  opd_id UUID REFERENCES public.opd(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table to avoid privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function (security definer to bypass RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Permohonan
CREATE TABLE public.permohonan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT NOT NULL UNIQUE,
  pemohon_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opd_id UUID NOT NULL REFERENCES public.opd(id) ON DELETE RESTRICT,
  judul TEXT NOT NULL,
  kategori TEXT NOT NULL,
  deskripsi TEXT,
  status public.status_permohonan NOT NULL DEFAULT 'baru',
  petugas_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tanggal_masuk TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.permohonan ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_permohonan_opd ON public.permohonan(opd_id);
CREATE INDEX idx_permohonan_pemohon ON public.permohonan(pemohon_id);
CREATE INDEX idx_permohonan_status ON public.permohonan(status);

-- Riwayat
CREATE TABLE public.permohonan_riwayat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permohonan_id UUID NOT NULL REFERENCES public.permohonan(id) ON DELETE CASCADE,
  oleh UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aksi TEXT NOT NULL,
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.permohonan_riwayat ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_riwayat_permohonan ON public.permohonan_riwayat(permohonan_id);

-- Trigger: auto-create profile + assign warga role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nama_lengkap, no_hp, nik)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', ''),
    NEW.raw_user_meta_data->>'no_hp',
    NEW.raw_user_meta_data->>'nik'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'warga')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_permohonan_updated BEFORE UPDATE ON public.permohonan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== RLS POLICIES =====

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin insert profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- opd
CREATE POLICY "OPD readable by all" ON public.opd
  FOR SELECT USING (true);
CREATE POLICY "Super admin manage OPD" ON public.opd
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- permohonan
CREATE POLICY "Warga lihat permohonan sendiri" ON public.permohonan
  FOR SELECT TO authenticated
  USING (
    auth.uid() = pemohon_id
    OR public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'admin_opd') AND opd_id IN (
      SELECT opd_id FROM public.profiles WHERE id = auth.uid()
    ))
  );
CREATE POLICY "Warga buat permohonan" ON public.permohonan
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = pemohon_id);
CREATE POLICY "Admin update permohonan" ON public.permohonan
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'admin_opd') AND opd_id IN (
      SELECT opd_id FROM public.profiles WHERE id = auth.uid()
    ))
  );

-- riwayat
CREATE POLICY "Lihat riwayat sesuai permohonan" ON public.permohonan_riwayat
  FOR SELECT TO authenticated
  USING (
    permohonan_id IN (
      SELECT id FROM public.permohonan WHERE
        auth.uid() = pemohon_id
        OR public.has_role(auth.uid(), 'super_admin')
        OR (public.has_role(auth.uid(), 'admin_opd') AND opd_id IN (
          SELECT opd_id FROM public.profiles WHERE id = auth.uid()
        ))
    )
  );
CREATE POLICY "Admin tambah riwayat" ON public.permohonan_riwayat
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin_opd')
    OR auth.uid() = oleh
  );
