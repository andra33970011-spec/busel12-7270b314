CREATE TABLE public.permohonan_rating (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permohonan_id uuid NOT NULL REFERENCES public.permohonan(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skor integer NOT NULL CHECK (skor BETWEEN 1 AND 5),
  komentar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(permohonan_id, user_id)
);
ALTER TABLE public.permohonan_rating ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rating publik baca" ON public.permohonan_rating FOR SELECT USING (true);
CREATE POLICY "User insert rating sendiri" ON public.permohonan_rating FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User update rating sendiri" ON public.permohonan_rating FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);