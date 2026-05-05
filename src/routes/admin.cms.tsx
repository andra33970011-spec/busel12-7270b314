// Admin CMS: kelola Berita & Layanan Publik untuk halaman /berita & /layanan.
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, FileText, LayoutGrid } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { invalidateBerita, invalidateLayanan } from "@/lib/queries";
import {
  upsertBerita, deleteBerita, upsertLayanan, deleteLayanan,
} from "@/lib/admin-actions.functions";

export const Route = createFileRoute("/admin/cms")({
  head: () => ({ meta: [{ title: "CMS — Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminGuard>
      <CmsPage />
    </AdminGuard>
  ),
});

type Berita = { id: string; judul: string; ringkasan: string | null; isi: string; gambar_url: string | null; status: "draft" | "terbit"; published_at: string | null };
type Layanan = { id: string; judul: string; deskripsi: string | null; ikon: string | null; opd_id: string | null; persyaratan: string | null; alur: string | null; aktif: boolean; urutan: number; sla_hari: number };
type Opd = { id: string; nama: string; singkatan: string };

function CmsPage() {
  const { isSuperAdmin } = useAuth();
  const [tab, setTab] = useState<"berita" | "layanan">("berita");

  if (!isSuperAdmin) return <AdminShell breadcrumb={[{ label: "CMS" }]}><div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">Hanya Super Admin.</div></AdminShell>;

  return (
    <AdminShell breadcrumb={[{ label: "CMS" }]}>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold">Manajemen Konten</h1>
        <p className="text-sm text-muted-foreground">Editor untuk halaman publik Berita & Layanan.</p>
      </div>
      <div className="mb-5 inline-flex rounded-lg border border-border bg-card p-1">
        <button onClick={() => setTab("berita")} className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ${tab === "berita" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          <FileText className="h-4 w-4" /> Berita
        </button>
        <button onClick={() => setTab("layanan")} className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ${tab === "layanan" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          <LayoutGrid className="h-4 w-4" /> Layanan
        </button>
      </div>
      {tab === "berita" ? <BeritaTab /> : <LayananTab />}
    </AdminShell>
  );
}

function BeritaTab() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Berita[]>([]);
  const [editing, setEditing] = useState<Partial<Berita> | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("berita").select("id,judul,ringkasan,isi,gambar_url,status,published_at").order("created_at", { ascending: false });
    setRows((data ?? []) as Berita[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.judul) { toast.error("Judul wajib"); return; }
    try {
      await upsertBerita({ data: {
        id: editing.id, judul: editing.judul,
        ringkasan: editing.ringkasan ?? null, isi: editing.isi ?? "",
        gambar_url: editing.gambar_url ?? null, status: (editing.status ?? "draft") as "draft" | "terbit",
      }});
      await invalidateBerita(qc);
      toast.success("Tersimpan"); setEditing(null); load();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function hapus(id: string) {
    if (!confirm("Hapus berita?")) return;
    try {
      await deleteBerita({ data: { id } });
      await invalidateBerita(qc);
      toast.success("Dihapus"); load();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setEditing({ status: "draft" })} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Berita Baru
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Judul</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Diterbitkan</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Memuat…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Belum ada berita.</td></tr>}
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{b.judul}</div>
                  {b.ringkasan && <div className="line-clamp-1 text-xs text-muted-foreground">{b.ringkasan}</div>}
                </td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${b.status === "terbit" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{b.status}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{b.published_at ? new Date(b.published_at).toLocaleDateString("id-ID") : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditing(b)} className="mr-2 inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                  <button onClick={() => hapus(b.id)} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? "Edit Berita" : "Berita Baru"} onClose={() => setEditing(null)} onSave={save} maxW="max-w-2xl">
          <Input label="Judul" value={editing.judul ?? ""} onChange={(v) => setEditing({ ...editing, judul: v })} />
          <Input label="Ringkasan" value={editing.ringkasan ?? ""} onChange={(v) => setEditing({ ...editing, ringkasan: v })} />
          <TextArea label="Isi (mendukung paragraf)" rows={8} value={editing.isi ?? ""} onChange={(v) => setEditing({ ...editing, isi: v })} />
          <Input label="URL Gambar Sampul" value={editing.gambar_url ?? ""} onChange={(v) => setEditing({ ...editing, gambar_url: v })} placeholder="https://..." />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select value={editing.status ?? "draft"} onChange={(e) => setEditing({ ...editing, status: e.target.value as "draft" | "terbit" })} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
              <option value="draft">Draft</option>
              <option value="terbit">Terbit</option>
            </select>
          </div>
        </Modal>
      )}
    </>
  );
}

function LayananTab() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Layanan[]>([]);
  const [opds, setOpds] = useState<Opd[]>([]);
  const [editing, setEditing] = useState<Partial<Layanan> | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: l }, { data: o }] = await Promise.all([
      supabase.from("layanan_publik").select("*").order("urutan"),
      supabase.from("opd").select("id,nama,singkatan").order("nama"),
    ]);
    setRows((l ?? []) as Layanan[]);
    setOpds((o ?? []) as Opd[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.judul) { toast.error("Judul wajib"); return; }
    try {
      await upsertLayanan({ data: {
        id: editing.id, judul: editing.judul,
        deskripsi: editing.deskripsi ?? null, ikon: editing.ikon ?? null,
        opd_id: editing.opd_id ?? null, persyaratan: editing.persyaratan ?? null,
        alur: editing.alur ?? null, aktif: editing.aktif ?? true,
        urutan: editing.urutan ?? 0,
        sla_hari: editing.sla_hari ?? 14,
      }});
      await invalidateLayanan(qc);
      toast.success("Tersimpan"); setEditing(null); load();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function hapus(id: string) {
    if (!confirm("Hapus layanan?")) return;
    try {
      await deleteLayanan({ data: { id } });
      await invalidateLayanan(qc);
      toast.success("Dihapus"); load();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setEditing({ aktif: true, urutan: 0 })} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Layanan Baru
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Judul</th>
              <th className="px-4 py-3 font-medium">OPD</th>
              <th className="px-4 py-3 font-medium">SLA</th>
              <th className="px-4 py-3 font-medium">Urutan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Memuat…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Belum ada layanan.</td></tr>}
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{l.judul}</td>
                <td className="px-4 py-3 text-muted-foreground">{opds.find((o) => o.id === l.opd_id)?.singkatan ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.sla_hari} hari</td>
                <td className="px-4 py-3 font-mono">{l.urutan}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${l.aktif ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{l.aktif ? "Aktif" : "Nonaktif"}</span></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditing(l)} className="mr-2 inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                  <button onClick={() => hapus(l.id)} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? "Edit Layanan" : "Layanan Baru"} onClose={() => setEditing(null)} onSave={save} maxW="max-w-2xl">
          <Input label="Judul" value={editing.judul ?? ""} onChange={(v) => setEditing({ ...editing, judul: v })} />
          <TextArea label="Deskripsi" rows={2} value={editing.deskripsi ?? ""} onChange={(v) => setEditing({ ...editing, deskripsi: v })} />
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">OPD penanggung jawab</label>
              <select value={editing.opd_id ?? ""} onChange={(e) => setEditing({ ...editing, opd_id: e.target.value || null })} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                <option value="">— Pilih OPD —</option>
                {opds.map((o) => <option key={o.id} value={o.id}>{o.singkatan} — {o.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Urutan tampil</label>
              <input type="number" value={editing.urutan ?? 0} onChange={(e) => setEditing({ ...editing, urutan: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">SLA / Tenggat penyelesaian (hari kerja)</label>
            <input type="number" min={1} max={365} value={editing.sla_hari ?? 14} onChange={(e) => setEditing({ ...editing, sla_hari: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
            <p className="mt-1 text-[11px] text-muted-foreground">Tenggat permohonan akan dihitung otomatis sebesar nilai ini sejak diajukan.</p>
          </div>
          <Input label="Ikon (nama lucide opsional, mis. IdCard)" value={editing.ikon ?? ""} onChange={(v) => setEditing({ ...editing, ikon: v })} />
          <TextArea label="Persyaratan" rows={4} value={editing.persyaratan ?? ""} onChange={(v) => setEditing({ ...editing, persyaratan: v })} />
          <TextArea label="Alur layanan" rows={4} value={editing.alur ?? ""} onChange={(v) => setEditing({ ...editing, alur: v })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editing.aktif ?? true} onChange={(e) => setEditing({ ...editing, aktif: e.target.checked })} />
            Tampilkan di halaman publik
          </label>
        </Modal>
      )}
    </>
  );
}

// ---- Helpers UI ----
function Modal({ title, children, onClose, onSave, maxW = "max-w-lg" }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void; maxW?: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className={`w-full ${maxW} rounded-xl border border-border bg-card p-6 shadow-elevated max-h-[90vh] overflow-y-auto`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="h-9 rounded-md border border-border px-3 text-sm">Batal</button>
          <button onClick={onSave} className="h-9 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">Simpan</button>
        </div>
      </div>
    </div>
  );
}
function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
    </div>
  );
}
function TextArea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
    </div>
  );
}
