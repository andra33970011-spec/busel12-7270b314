// Admin super: kelola chat Telegram per OPD untuk notifikasi permohonan baru.
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Send, ExternalLink, Power } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/telegram")({
  head: () => ({ meta: [{ title: "Telegram — Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminGuard>
      <TelegramAdminPage />
    </AdminGuard>
  ),
});

type Opd = { id: string; nama: string; singkatan: string };
type Chat = { id: string; opd_id: string; chat_id: number; label: string | null; aktif: boolean };

const BOT_USERNAME = "buselmelayani_bot";

function TelegramAdminPage() {
  const { isSuperAdmin } = useAuth();
  const [opds, setOpds] = useState<Opd[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [opdId, setOpdId] = useState("");
  const [chatId, setChatId] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: o }, { data: c }] = await Promise.all([
      supabase.from("opd").select("id, nama, singkatan").order("nama"),
      supabase.from("telegram_opd_chat").select("id, opd_id, chat_id, label, aktif").order("created_at", { ascending: false }),
    ]);
    setOpds((o ?? []) as Opd[]);
    setChats((c ?? []) as Chat[]);
    setLoading(false);
  }
  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  async function tambah() {
    if (!opdId) return toast.error("Pilih OPD");
    const cid = Number(chatId.trim());
    if (!Number.isFinite(cid) || cid === 0) return toast.error("Chat ID harus angka");
    setBusy(true);
    try {
      const { error } = await supabase.from("telegram_opd_chat").insert({
        opd_id: opdId, chat_id: cid, label: label.trim() || null, aktif: true,
      });
      if (error) throw error;
      toast.success("Chat ditambahkan");
      setChatId(""); setLabel("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  async function toggle(id: string, aktif: boolean) {
    await supabase.from("telegram_opd_chat").update({ aktif: !aktif }).eq("id", id);
    await load();
  }

  async function hapus(id: string) {
    if (!confirm("Hapus chat ini?")) return;
    await supabase.from("telegram_opd_chat").delete().eq("id", id);
    await load();
  }

  return (
    <AdminShell breadcrumb={[{ label: "Telegram" }]}>
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/15 text-accent">
              <Send className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-lg font-bold">Integrasi Telegram</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Bot: <a className="text-primary underline inline-flex items-center gap-1" target="_blank" rel="noreferrer" href={`https://t.me/${BOT_USERNAME}`}>@{BOT_USERNAME} <ExternalLink className="h-3 w-3" /></a>
                . Tambahkan bot ke grup OPD lalu daftarkan <b>chat_id</b> grup di sini agar admin OPD menerima notifikasi permohonan baru otomatis.
              </p>
              <details className="mt-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer font-medium text-foreground">Cara mendapatkan chat_id grup</summary>
                <ol className="list-decimal pl-5 mt-2 space-y-1">
                  <li>Tambahkan <b>@{BOT_USERNAME}</b> ke grup Telegram OPD.</li>
                  <li>Kirim pesan apa saja di grup (contoh: <code>/help</code>).</li>
                  <li>Di tab ini, log pesan masuk akan tercatat. Atau gunakan bot <code>@RawDataBot</code> di grup untuk melihat <code>chat.id</code> (biasanya negatif untuk grup).</li>
                </ol>
              </details>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display font-semibold">Tambah Chat OPD</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <select value={opdId} onChange={(e) => setOpdId(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm md:col-span-2">
              <option value="">— Pilih OPD —</option>
              {opds.map((o) => <option key={o.id} value={o.id}>{o.nama}</option>)}
            </select>
            <input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="Chat ID (mis: -1001234567890)" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (opsional)" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          </div>
          <button onClick={tambah} disabled={busy} className="mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Tambah
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display font-semibold mb-3">Daftar Chat Terdaftar</h2>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground"><Loader2 className="inline h-5 w-5 animate-spin" /></div>
          ) : chats.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada chat terdaftar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                  <tr><th className="py-2 pr-3">OPD</th><th className="py-2 pr-3">Chat ID</th><th className="py-2 pr-3">Label</th><th className="py-2 pr-3">Status</th><th className="py-2"></th></tr>
                </thead>
                <tbody>
                  {chats.map((c) => {
                    const opd = opds.find((o) => o.id === c.opd_id);
                    return (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">{opd?.nama ?? "—"}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{c.chat_id}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{c.label ?? "—"}</td>
                        <td className="py-2 pr-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${c.aktif ? "border-success/30 bg-success/15 text-success" : "border-muted bg-muted text-muted-foreground"}`}>
                            {c.aktif ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <button onClick={() => toggle(c.id, c.aktif)} className="mr-2 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                            <Power className="h-3 w-3" /> {c.aktif ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                          <button onClick={() => hapus(c.id)} className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3 w-3" /> Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
