// Admin: System Config — kelola kategori layanan + SLA hari.
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { upsertKategori, deleteKategori } from "@/lib/admin-actions.functions";

export const Route = createFileRoute("/admin/config")({
  head: () => ({ meta: [{ title: "Konfigurasi Sistem — Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminGuard>
      <ConfigPage />
    </AdminGuard>
  ),
});

type Kategori = { id: string; nama: string; sla_hari: number; deskripsi: string | null; aktif: boolean };

function ConfigPage() {
  const { isSuperAdmin } = useAuth();
  const [rows, setRows] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Kategori> | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("kategori_layanan").select("id,nama,sla_hari,deskripsi,aktif").order("nama");
    setRows((data ?? []) as Kategori[]);
    setLoading(false);
  }
  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  async function save() {
    if (!editing?.nama || !editing?.sla_hari) { toast.error("Nama & SLA wajib"); return; }
    try {
      await upsertKategori({ data: {
        id: editing.id, nama: editing.nama, sla_hari: Number(editing.sla_hari),
        deskripsi: editing.deskripsi ?? null, aktif: editing.aktif ?? true,
      }});
      toast.success("Tersimpan"); setEditing(null); load();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function hapus(id: string) {
    if (!confirm("Hapus kategori?")) return;
    try { await deleteKategori({ data: { id } }); toast.success("Dihapus"); load(); }
    catch (e) { toast.error((e as Error).message); }
  }

  if (!isSuperAdmin) return <AdminShell breadcrumb={[{ label: "Konfigurasi" }]}><div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">Hanya Super Admin.</div></AdminShell>;

  return (
    <AdminShell breadcrumb={[{ label: "Konfigurasi" }]}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Konfigurasi Sistem</h1>
          <p className="text-sm text-muted-foreground">Master kategori layanan dan SLA tenggat (hari).</p>
        </div>
        <button onClick={() => setEditing({ sla_hari: 7, aktif: true })} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Tambah Kategori
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nama Kategori</th>
              <th className="px-4 py-3 font-medium">SLA (hari)</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Memuat…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Belum ada kategori. Tambahkan satu untuk mulai.</td></tr>}
            {rows.map((k) => (
              <tr key={k.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{k.nama}</div>
                  {k.deskripsi && <div className="text-xs text-muted-foreground">{k.deskripsi}</div>}
                </td>
                <td className="px-4 py-3 font-mono">{k.sla_hari}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${k.aktif ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {k.aktif ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditing(k)} className="mr-2 inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                  <button onClick={() => hapus(k.id)} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-elevated">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{editing.id ? "Edit Kategori" : "Tambah Kategori"}</h2>
              <button onClick={() => setEditing(null)}><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nama</label>
                <input value={editing.nama ?? ""} onChange={(e) => setEditing({ ...editing, nama: e.target.value })} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">SLA (hari)</label>
                <input type="number" min={1} max={365} value={editing.sla_hari ?? 7} onChange={(e) => setEditing({ ...editing, sla_hari: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Deskripsi</label>
                <textarea value={editing.deskripsi ?? ""} onChange={(e) => setEditing({ ...editing, deskripsi: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" rows={3} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.aktif ?? true} onChange={(e) => setEditing({ ...editing, aktif: e.target.checked })} />
                Aktif
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="h-9 rounded-md border border-border px-3 text-sm">Batal</button>
              <button onClick={save} className="h-9 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
