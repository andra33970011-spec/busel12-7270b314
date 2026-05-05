-- Kategori layanan + SLA
CREATE TABLE public.kategori_layanan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  sla_hari integer NOT NULL DEFAULT 7 CHECK (sla_hari > 0 AND sla_hari <= 365),
  deskripsi text,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kategori_layanan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kategori publik baca" ON public.kategori_layanan FOR SELECT USING (true);
CREATE POLICY "Super admin kelola kategori" ON public.kategori_layanan FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE TRIGGER trg_kategori_updated BEFORE UPDATE ON public.kategori_layanan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Berita
CREATE TABLE public.berita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul text NOT NULL,
  slug text NOT NULL UNIQUE,
  ringkasan text,
  isi text NOT NULL DEFAULT '',
  gambar_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','terbit')),
  published_at timestamptz,
  penulis_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.berita ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Berita terbit publik" ON public.berita FOR SELECT USING (status = 'terbit');
CREATE POLICY "Super admin kelola berita" ON public.berita FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE TRIGGER trg_berita_updated BEFORE UPDATE ON public.berita
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_berita_status_pub ON public.berita(status, published_at DESC);

-- Layanan publik
CREATE TABLE public.layanan_publik (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul text NOT NULL,
  slug text NOT NULL UNIQUE,
  deskripsi text,
  ikon text,
  opd_id uuid REFERENCES public.opd(id) ON DELETE SET NULL,
  persyaratan text,
  alur text,
  aktif boolean NOT NULL DEFAULT true,
  urutan integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.layanan_publik ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Layanan aktif publik" ON public.layanan_publik FOR SELECT USING (aktif = true);
CREATE POLICY "Super admin kelola layanan" ON public.layanan_publik FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE TRIGGER trg_layanan_updated BEFORE UPDATE ON public.layanan_publik
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Status profil (untuk suspend akun)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended'));
