// Komponen untuk warga menautkan akun ke Telegram bot.
import { useEffect, useState } from "react";
import { Send, Copy, Unlink, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { createTelegramPairing, getTelegramLink, unlinkTelegram } from "@/server/telegram.functions";

type LinkInfo = { chat_id: number; username: string | null; linked_at: string } | null;

export function TelegramLinkCard({ botUsername }: { botUsername?: string }) {
  const [link, setLink] = useState<LinkInfo>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const r = await getTelegramLink();
      setLink((r.link as LinkInfo) ?? null);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  async function generate() {
    setBusy(true);
    try {
      const r = await createTelegramPairing();
      setCode(r.code);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    if (!confirm("Putuskan tautan Telegram? Anda tidak akan menerima notifikasi lagi.")) return;
    setBusy(true);
    try {
      await unlinkTelegram();
      setLink(null);
      setCode(null);
      toast.success("Tautan diputus");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const botLink = botUsername ? `https://t.me/${botUsername.replace(/^@/, "")}` : null;
  const startLink = code && botUsername ? `${botLink}?start=${code}` : null;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat status Telegram…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/15 text-accent">
          <Send className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold">Notifikasi Telegram</div>
          {link ? (
            <>
              <p className="text-xs text-muted-foreground mt-0.5">
                Akun tertaut{link.username ? ` sebagai @${link.username}` : ""}. Anda menerima update permohonan via Telegram.
              </p>
              <button
                onClick={unlink}
                disabled={busy}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Unlink className="h-3.5 w-3.5" /> Putuskan tautan
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hubungkan akun untuk menerima update status permohonan & cek status via chat bot.
              </p>
              {!code ? (
                <button
                  onClick={generate}
                  disabled={busy}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Buat kode pairing
                </button>
              ) : (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary-soft p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-primary/80">Kode pairing</div>
                      <div className="font-mono text-lg font-bold text-primary">{code}</div>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(code); toast.success("Disalin"); }}
                      className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-card px-2 py-1 text-xs hover:bg-primary/5"
                    >
                      <Copy className="h-3 w-3" /> Salin
                    </button>
                  </div>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
                    <li>
                      Buka bot Telegram
                      {botLink ? <> → <a className="text-primary underline" href={startLink ?? botLink} target="_blank" rel="noreferrer">{`@${botUsername}`}</a></> : " (akan disediakan admin)"}
                    </li>
                    <li>Kirim perintah: <code className="rounded bg-card px-1">/start {code}</code></li>
                    <li>Akun otomatis tertaut. Klik tombol di atas lagi untuk refresh.</li>
                  </ol>
                  <div>
                    <button
                      onClick={reload}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Check className="h-3 w-3" /> Saya sudah pairing — perbarui status
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Kode berlaku 15 menit.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
