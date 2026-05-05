-- Tabel pejabat
CREATE TABLE public.pejabat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  jabatan TEXT NOT NULL,
  foto_url TEXT,
  urutan INTEGER NOT NULL DEFAULT 0,
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pejabat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pejabat aktif publik baca"
  ON public.pejabat FOR SELECT TO public
  USING (aktif = true OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin kelola pejabat"
  ON public.pejabat FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER pejabat_set_updated_at
  BEFORE UPDATE ON public.pejabat
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket publik untuk foto pejabat
INSERT INTO storage.buckets (id, name, public)
VALUES ('pejabat-foto', 'pejabat-foto', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Foto pejabat publik baca"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'pejabat-foto');

CREATE POLICY "Super admin upload foto pejabat"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pejabat-foto' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin update foto pejabat"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pejabat-foto' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin hapus foto pejabat"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pejabat-foto' AND has_role(auth.uid(), 'super_admin'::app_role));

-- Seed data awal
INSERT INTO public.pejabat (nama, jabatan, urutan, aktif) VALUES
  ('Adios', 'Bupati', 1, true),
  ('La Ode Risawal', 'Wakil Bupati', 2, true);
