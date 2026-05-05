
-- Enums
CREATE TYPE public.app_role AS ENUM ('warga', 'admin_opd', 'super_admin');
CREATE TYPE public.status_permohonan AS ENUM ('baru', 'diproses', 'selesai', 'ditolak');

CREATE TABLE public.opd (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  singkatan TEXT NOT NULL,
  kategori TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.opd ENABLE ROW LEVEL SECURITY;

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

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  prioritas text NOT NULL DEFAULT 'normal' CHECK (prioritas IN ('rendah','normal','tinggi')),
  tenggat timestamptz,
  ringkasan text
);
ALTER TABLE public.permohonan ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_permohonan_opd ON public.permohonan(opd_id);
CREATE INDEX idx_permohonan_pemohon ON public.permohonan(pemohon_id);
CREATE INDEX idx_permohonan_status ON public.permohonan(status);

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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nama_lengkap, no_hp, nik) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', ''),
    NEW.raw_user_meta_data->>'no_hp',
    NEW.raw_user_meta_data->>'nik'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'warga') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_permohonan_updated BEFORE UPDATE ON public.permohonan FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_user_opd(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT opd_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- Profiles policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin insert profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin lihat profil pemohon" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin_opd') AND id IN (SELECT pemohon_id FROM public.permohonan WHERE opd_id = public.get_user_opd(auth.uid())));

-- user_roles policies (no self-escalation)
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') AND user_id <> auth.uid());
CREATE POLICY "Super admin update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') AND user_id <> auth.uid());
CREATE POLICY "Super admin delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') AND user_id <> auth.uid());

CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Pengguna tidak diizinkan mengubah perannya sendiri';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_prevent_self_role_change BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();

-- OPD policies
CREATE POLICY "OPD readable by all" ON public.opd FOR SELECT USING (true);
CREATE POLICY "Super admin manage OPD" ON public.opd FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Permohonan policies
CREATE POLICY "Warga lihat permohonan sendiri" ON public.permohonan FOR SELECT TO authenticated
  USING (auth.uid() = pemohon_id OR public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'admin_opd') AND opd_id = public.get_user_opd(auth.uid())));
CREATE POLICY "Warga buat permohonan" ON public.permohonan FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = pemohon_id);
CREATE POLICY "Admin update permohonan" ON public.permohonan FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'admin_opd') AND opd_id = public.get_user_opd(auth.uid())));
CREATE POLICY "Super admin hapus permohonan" ON public.permohonan FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Riwayat policies
CREATE POLICY "Lihat riwayat sesuai permohonan" ON public.permohonan_riwayat FOR SELECT TO authenticated
  USING (permohonan_id IN (SELECT id FROM public.permohonan WHERE auth.uid() = pemohon_id
      OR public.has_role(auth.uid(), 'super_admin')
      OR (public.has_role(auth.uid(), 'admin_opd') AND opd_id = public.get_user_opd(auth.uid()))));
CREATE POLICY "Admin tambah riwayat" ON public.permohonan_riwayat FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_opd') OR auth.uid() = oleh);

-- Status profil
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended'));

-- AUDIT LOG
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, user_email text,
  aksi text NOT NULL, entitas text NOT NULL, entitas_id text,
  data_sebelum jsonb, data_sesudah jsonb,
  ip_address text, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_entitas ON public.audit_log(entitas, entitas_id);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin lihat audit log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "User insert own audit log" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.log_permohonan_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_log (user_id, aksi, entitas, entitas_id, data_sebelum, data_sesudah)
    VALUES (auth.uid(), 'permohonan.status_changed', 'permohonan', NEW.id::text,
      jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_permohonan_audit AFTER UPDATE ON public.permohonan
  FOR EACH ROW EXECUTE FUNCTION public.log_permohonan_change();

-- JOB QUEUE
CREATE TYPE public.job_status AS ENUM ('pending','running','success','failed','dead');
CREATE TABLE public.job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.job_status NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0, max_attempts int NOT NULL DEFAULT 3,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz, finished_at timestamptz,
  error text, result jsonb, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_queue_status_scheduled ON public.job_queue(status, scheduled_at) WHERE status IN ('pending','failed');
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin lihat semua job" ON public.job_queue FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- RATE LIMIT
CREATE TABLE public.rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, bucket text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count int NOT NULL DEFAULT 1
);
CREATE INDEX idx_rate_limit_lookup ON public.rate_limit(identifier, bucket, window_start DESC);
ALTER TABLE public.rate_limit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all rate_limit" ON public.rate_limit FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- KATEGORI LAYANAN
CREATE TABLE public.kategori_layanan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL UNIQUE, slug text NOT NULL UNIQUE,
  sla_hari integer NOT NULL DEFAULT 7 CHECK (sla_hari > 0 AND sla_hari <= 365),
  deskripsi text, aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kategori_layanan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kategori publik baca" ON public.kategori_layanan FOR SELECT USING (true);
CREATE POLICY "Super admin kelola kategori" ON public.kategori_layanan FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_kategori_updated BEFORE UPDATE ON public.kategori_layanan FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- BERITA
CREATE TABLE public.berita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul text NOT NULL, slug text NOT NULL UNIQUE,
  ringkasan text, isi text NOT NULL DEFAULT '',
  gambar_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','terbit')),
  published_at timestamptz, penulis_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.berita ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Berita terbit publik" ON public.berita FOR SELECT USING (status = 'terbit');
CREATE POLICY "Super admin kelola berita" ON public.berita FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_berita_updated BEFORE UPDATE ON public.berita FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_berita_status_pub ON public.berita(status, published_at DESC);

-- LAYANAN PUBLIK
CREATE TABLE public.layanan_publik (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul text NOT NULL, slug text NOT NULL UNIQUE,
  deskripsi text, ikon text,
  opd_id uuid REFERENCES public.opd(id) ON DELETE SET NULL,
  persyaratan text, alur text,
  aktif boolean NOT NULL DEFAULT true,
  urutan integer NOT NULL DEFAULT 0,
  sla_hari integer NOT NULL DEFAULT 14,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.layanan_publik ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Layanan aktif publik" ON public.layanan_publik FOR SELECT USING (aktif = true);
CREATE POLICY "Super admin kelola layanan" ON public.layanan_publik FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_layanan_updated BEFORE UPDATE ON public.layanan_publik FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- APP SETTING
CREATE TABLE public.app_setting (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_setting ENABLE ROW LEVEL SECURITY;
CREATE POLICY "App setting publik baca" ON public.app_setting FOR SELECT TO public USING (true);
CREATE POLICY "Super admin kelola app setting" ON public.app_setting FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_app_setting_updated_at BEFORE UPDATE ON public.app_setting FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.app_setting (key, value) VALUES ('data_terpadu_visible_public', 'true'::jsonb);

-- DATA TERPADU
CREATE TABLE public.data_terpadu_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kategori text NOT NULL CHECK (kategori IN ('kpi','chart_layanan','penduduk','anggaran','dataset')),
  label text NOT NULL,
  nilai_teks text, nilai_num numeric, nilai_num2 numeric,
  satuan text, trend text, ikon text, format text, ukuran text, url text, opd text,
  aktif boolean NOT NULL DEFAULT true,
  urutan integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_data_terpadu_kat_urut ON public.data_terpadu_item (kategori, urutan);
ALTER TABLE public.data_terpadu_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Item aktif publik baca" ON public.data_terpadu_item FOR SELECT TO public
  USING (aktif = true OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin kelola item" ON public.data_terpadu_item FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_data_terpadu_updated_at BEFORE UPDATE ON public.data_terpadu_item FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PEJABAT
CREATE TABLE public.pejabat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL, jabatan TEXT NOT NULL,
  foto_url TEXT, urutan INTEGER NOT NULL DEFAULT 0,
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pejabat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pejabat aktif publik baca" ON public.pejabat FOR SELECT TO public
  USING (aktif = true OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin kelola pejabat" ON public.pejabat FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER pejabat_set_updated_at BEFORE UPDATE ON public.pejabat FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('berkas-permohonan', 'berkas-permohonan', false, 10485760,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('pejabat-foto', 'pejabat-foto', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Berkas: user upload ke folder sendiri" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'berkas-permohonan'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND lower(coalesce(metadata->>'mimetype','')) IN ('application/pdf','image/jpeg','image/png','image/webp')
    AND coalesce((metadata->>'size')::bigint, 0) <= 10485760);

CREATE POLICY "Berkas: user baca berkas sendiri" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'berkas-permohonan' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Warga update berkas sendiri" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'berkas-permohonan' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'super_admin')))
  WITH CHECK (bucket_id = 'berkas-permohonan' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'super_admin')));

CREATE POLICY "Warga hapus berkas sendiri" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'berkas-permohonan' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Foto pejabat publik baca" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'pejabat-foto');
CREATE POLICY "Super admin upload foto pejabat" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pejabat-foto' AND public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin update foto pejabat" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pejabat-foto' AND public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin hapus foto pejabat" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pejabat-foto' AND public.has_role(auth.uid(), 'super_admin'));

-- SEED OPD (UUID dipakai oleh seed layanan)
INSERT INTO public.opd (id, nama, singkatan, kategori) VALUES
  ('c8bbce05-b8b2-4b3b-8146-3421c6e97e28', 'Dinas Kependudukan dan Pencatatan Sipil', 'Disdukcapil', ARRAY['Kependudukan']),
  ('a5f3e57d-0354-411f-8f8d-2c83a5b6d8b4', 'Dinas Kesehatan', 'Dinkes', ARRAY['Kesehatan']),
  ('77de9e98-4f44-4a9c-bbbd-00cd76b86de6', 'Dinas Penanaman Modal dan PTSP', 'DPMPTSP', ARRAY['Perizinan']),
  ('ee2bc5b7-3ccc-4487-bb49-9e1b2cfef475', 'Dinas Perhubungan', 'Dishub', ARRAY['Perhubungan']),
  ('12d270cc-ecb1-44e5-b603-90b8c382e8c6', 'Dinas Pariwisata', 'Dispar', ARRAY['Pariwisata']);

-- SEED PEJABAT
INSERT INTO public.pejabat (nama, jabatan, urutan, aktif) VALUES
  ('Adios', 'Bupati', 1, true),
  ('La Ode Risawal', 'Wakil Bupati', 2, true);

-- SEED DATA TERPADU
INSERT INTO public.data_terpadu_item (kategori, label, nilai_teks, trend, ikon, urutan) VALUES
  ('kpi', 'Total Penduduk', '1.42 Juta', '+1.2% YoY', 'Users', 1),
  ('kpi', 'Dataset Publik', '312', '+18 bulan ini', 'Database', 2),
  ('kpi', 'Realisasi APBD', '67.8%', 'Triwulan II', 'Wallet', 3),
  ('kpi', 'Pertumbuhan Ekonomi', '5.4%', '+0.3% QoQ', 'TrendingUp', 4);
INSERT INTO public.data_terpadu_item (kategori, label, nilai_num, nilai_num2, urutan) VALUES
  ('chart_layanan', 'Jan', 32500, 30100, 1),
  ('chart_layanan', 'Feb', 35200, 33700, 2),
  ('chart_layanan', 'Mar', 41200, 39800, 3),
  ('chart_layanan', 'Apr', 38900, 37200, 4),
  ('chart_layanan', 'Mei', 44100, 42500, 5),
  ('chart_layanan', 'Jun', 48200, 46900, 6);
INSERT INTO public.data_terpadu_item (kategori, label, nilai_num, urutan) VALUES
  ('penduduk', '0-17', 28, 1), ('penduduk', '18-35', 32, 2),
  ('penduduk', '36-55', 26, 3), ('penduduk', '56+', 14, 4);
INSERT INTO public.data_terpadu_item (kategori, label, nilai_num, urutan) VALUES
  ('anggaran', 'Pendidikan', 1240, 1), ('anggaran', 'Kesehatan', 980, 2),
  ('anggaran', 'Infrastruktur', 1530, 3), ('anggaran', 'Sosial', 720, 4),
  ('anggaran', 'Ekonomi', 640, 5), ('anggaran', 'Lingkungan', 410, 6);
INSERT INTO public.data_terpadu_item (kategori, label, opd, format, ukuran, url, urutan) VALUES
  ('dataset', 'Data Penduduk per Kelurahan 2024', 'Disdukcapil', 'CSV', '2.4 MB', '#', 1),
  ('dataset', 'Realisasi APBD Triwulan II 2024', 'BPKAD', 'XLSX', '1.1 MB', '#', 2),
  ('dataset', 'Indeks Kepuasan Masyarakat', 'Bag. Organisasi', 'CSV', '320 KB', '#', 3),
  ('dataset', 'Data Sekolah & Guru', 'Disdik', 'JSON', '780 KB', '#', 4),
  ('dataset', 'Faskes & Kapasitas Tempat Tidur', 'Dinkes', 'CSV', '640 KB', '#', 5),
  ('dataset', 'Titik Banjir & Drainase', 'DPUPR', 'GeoJSON', '3.2 MB', '#', 6);

-- SEED LAYANAN PUBLIK
INSERT INTO public.layanan_publik (judul, slug, deskripsi, ikon, opd_id, persyaratan, alur, aktif, urutan, sla_hari) VALUES
('Penerbitan Kartu Keluarga (KK)', 'penerbitan-kartu-keluarga',
 'Penerbitan atau perubahan Kartu Keluarga karena pernikahan, kelahiran, kematian, perpindahan, atau pisah KK.', 'Users',
 'c8bbce05-b8b2-4b3b-8146-3421c6e97e28',
 E'Surat Pengantar RT/RW\nKK lama (asli)\nFotokopi KTP-el seluruh anggota keluarga\nDokumen pendukung perubahan',
 E'Pemohon mengajukan berkas\nVerifikasi berkas\nPerekaman & pencetakan KK\nPenyerahan KK',
 true, 1, 7),
('Penerbitan KTP Elektronik (KTP-el)', 'penerbitan-ktp-elektronik',
 'Perekaman dan pencetakan KTP elektronik untuk WNI berusia 17 tahun ke atas.', 'IdCard',
 'c8bbce05-b8b2-4b3b-8146-3421c6e97e28',
 E'Fotokopi KK\nSurat pengantar dari kelurahan/desa\nKTP lama (jika perpanjangan)\nPas foto 3x4',
 E'Pengambilan nomor antrian\nPerekaman biometrik\nVerifikasi data\nPencetakan dan penyerahan KTP-el',
 true, 2, 14),
('Penerbitan Akta Kelahiran', 'penerbitan-akta-kelahiran',
 'Pencatatan kelahiran dan penerbitan kutipan akta kelahiran.', 'Baby',
 'c8bbce05-b8b2-4b3b-8146-3421c6e97e28',
 E'Surat keterangan lahir\nFotokopi KK orang tua\nFotokopi KTP-el orang tua\nFotokopi buku nikah',
 E'Pengajuan berkas\nVerifikasi data\nPenerbitan kutipan akta\nPenyerahan akta',
 true, 3, 5),
('Surat Keterangan Sehat', 'surat-keterangan-sehat',
 'Pemeriksaan kesehatan dasar dan penerbitan surat keterangan sehat.', 'Stethoscope',
 'a5f3e57d-0354-411f-8f8d-2c83a5b6d8b4',
 E'Fotokopi KTP-el\nPas foto 3x4\nBukti pembayaran retribusi',
 E'Pendaftaran di puskesmas/RS\nPemeriksaan dokter\nPenerbitan surat keterangan',
 true, 5, 1),
('Nomor Induk Berusaha (NIB) UMKM', 'nomor-induk-berusaha-umkm',
 'Pendampingan penerbitan NIB melalui sistem OSS-RBA untuk pelaku UMKM.', 'Briefcase',
 '77de9e98-4f44-4a9c-bbbd-00cd76b86de6',
 E'Fotokopi KTP-el\nNPWP (jika ada)\nNomor HP & email aktif\nData usaha',
 E'Konsultasi di MPP\nPengisian data OSS-RBA\nPenerbitan NIB elektronik',
 true, 7, 3),
('Uji KIR Kendaraan Bermotor', 'uji-kir-kendaraan',
 'Pengujian berkala kendaraan bermotor wajib uji untuk memastikan laik jalan.', 'Truck',
 'ee2bc5b7-3ccc-4487-bb49-9e1b2cfef475',
 E'Fotokopi STNK & BPKB\nFotokopi KTP pemilik\nBuku uji lama\nKendaraan dibawa ke lokasi',
 E'Pendaftaran & pembayaran retribusi\nPemeriksaan administrasi\nPengujian teknis\nPenerbitan buku uji',
 true, 9, 2),
('Pendaftaran Usaha Pariwisata (TDUP)', 'pendaftaran-usaha-pariwisata',
 'Pendaftaran TDUP untuk hotel, homestay, restoran, agen wisata.', 'Palmtree',
 '12d270cc-ecb1-44e5-b603-90b8c382e8c6',
 E'Fotokopi KTP-el\nNIB dari OSS\nDokumen legalitas usaha\nFoto lokasi usaha',
 E'Pengajuan berkas\nVerifikasi & survey lokasi\nPenerbitan TDUP',
 true, 10, 14);
