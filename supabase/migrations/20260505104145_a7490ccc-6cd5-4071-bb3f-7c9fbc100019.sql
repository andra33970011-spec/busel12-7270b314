
-- Tabel untuk menyimpan log update Telegram (idempotency)
CREATE TABLE public.telegram_messages (
  update_id BIGINT PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  user_id BIGINT,
  text TEXT,
  raw_update JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_telegram_messages_chat_id ON public.telegram_messages (chat_id);
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin lihat telegram messages" ON public.telegram_messages
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Tabel link akun warga ke Telegram chat
CREATE TABLE public.telegram_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  chat_id BIGINT NOT NULL UNIQUE,
  username TEXT,
  link_code TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_link ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User lihat link sendiri" ON public.telegram_link
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "User hapus link sendiri" ON public.telegram_link
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Tabel chat Telegram per OPD (untuk notifikasi admin OPD)
CREATE TABLE public.telegram_opd_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opd_id UUID NOT NULL,
  chat_id BIGINT NOT NULL,
  label TEXT,
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(opd_id, chat_id)
);
ALTER TABLE public.telegram_opd_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin kelola opd chat" ON public.telegram_opd_chat
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admin OPD lihat chat OPD nya" ON public.telegram_opd_chat
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin_opd'::app_role) AND opd_id = get_user_opd(auth.uid())
  );

-- Kode pairing sementara untuk linking warga via /start <code>
CREATE TABLE public.telegram_pairing (
  code TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_pairing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User kelola pairing sendiri" ON public.telegram_pairing
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
