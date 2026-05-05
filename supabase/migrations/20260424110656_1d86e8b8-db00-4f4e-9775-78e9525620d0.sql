-- ===== app_setting =====
CREATE TABLE public.app_setting (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_setting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App setting publik baca"
  ON public.app_setting FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Super admin kelola app setting"
  ON public.app_setting FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_app_setting_updated_at
BEFORE UPDATE ON public.app_setting
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Default: Data Terpadu visible publik = true
INSERT INTO public.app_setting (key, value)
VALUES ('data_terpadu_visible_public', 'true'::jsonb);

-- ===== data_terpadu_item =====
-- kategori: 'kpi' | 'chart_layanan' | 'penduduk' | 'anggaran' | 'dataset'
CREATE TABLE public.data_terpadu_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kategori text NOT NULL CHECK (kategori IN ('kpi','chart_layanan','penduduk','anggaran','dataset')),
  label text NOT NULL,
  nilai_teks text,
  nilai_num numeric,
  nilai_num2 numeric,
  satuan text,
  trend text,
  ikon text,
  format text,
  ukuran text,
  url text,
  opd text,
  aktif boolean NOT NULL DEFAULT true,
  urutan integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_terpadu_kat_urut ON public.data_terpadu_item (kategori, urutan);

ALTER TABLE public.data_terpadu_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Item aktif publik baca"
  ON public.data_terpadu_item FOR SELECT
  TO public
  USING (aktif = true OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin kelola item"
  ON public.data_terpadu_item FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_data_terpadu_updated_at
BEFORE UPDATE ON public.data_terpadu_item
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Seed data sesuai konten saat ini =====
-- KPI
INSERT INTO public.data_terpadu_item (kategori, label, nilai_teks, trend, ikon, urutan) VALUES
  ('kpi', 'Total Penduduk', '1.42 Juta', '+1.2% YoY', 'Users', 1),
  ('kpi', 'Dataset Publik', '312', '+18 bulan ini', 'Database', 2),
  ('kpi', 'Realisasi APBD', '67.8%', 'Triwulan II', 'Wallet', 3),
  ('kpi', 'Pertumbuhan Ekonomi', '5.4%', '+0.3% QoQ', 'TrendingUp', 4);

-- Chart layanan bulanan: nilai_num = permohonan, nilai_num2 = selesai
INSERT INTO public.data_terpadu_item (kategori, label, nilai_num, nilai_num2, urutan) VALUES
  ('chart_layanan', 'Jan', 32500, 30100, 1),
  ('chart_layanan', 'Feb', 35200, 33700, 2),
  ('chart_layanan', 'Mar', 41200, 39800, 3),
  ('chart_layanan', 'Apr', 38900, 37200, 4),
  ('chart_layanan', 'Mei', 44100, 42500, 5),
  ('chart_layanan', 'Jun', 48200, 46900, 6);

-- Komposisi penduduk
INSERT INTO public.data_terpadu_item (kategori, label, nilai_num, urutan) VALUES
  ('penduduk', '0-17', 28, 1),
  ('penduduk', '18-35', 32, 2),
  ('penduduk', '36-55', 26, 3),
  ('penduduk', '56+', 14, 4);

-- Alokasi anggaran (miliar rupiah)
INSERT INTO public.data_terpadu_item (kategori, label, nilai_num, urutan) VALUES
  ('anggaran', 'Pendidikan', 1240, 1),
  ('anggaran', 'Kesehatan', 980, 2),
  ('anggaran', 'Infrastruktur', 1530, 3),
  ('anggaran', 'Sosial', 720, 4),
  ('anggaran', 'Ekonomi', 640, 5),
  ('anggaran', 'Lingkungan', 410, 6);

-- Dataset terbuka
INSERT INTO public.data_terpadu_item (kategori, label, opd, format, ukuran, url, urutan) VALUES
  ('dataset', 'Data Penduduk per Kelurahan 2024', 'Disdukcapil', 'CSV', '2.4 MB', '#', 1),
  ('dataset', 'Realisasi APBD Triwulan II 2024', 'BPKAD', 'XLSX', '1.1 MB', '#', 2),
  ('dataset', 'Indeks Kepuasan Masyarakat', 'Bag. Organisasi', 'CSV', '320 KB', '#', 3),
  ('dataset', 'Data Sekolah & Guru', 'Disdik', 'JSON', '780 KB', '#', 4),
  ('dataset', 'Faskes & Kapasitas Tempat Tidur', 'Dinkes', 'CSV', '640 KB', '#', 5),
  ('dataset', 'Titik Banjir & Drainase', 'DPUPR', 'GeoJSON', '3.2 MB', '#', 6);