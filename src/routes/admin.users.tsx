// Manajemen User — hanya super admin.
// Fitur: ubah role/OPD, suspend/aktifkan, force logout, kirim reset password.
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Save, Search, Ban, CheckCircle2, LogOut, KeyRound } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  setUserRole, listUsers, setUserSuspended, forceSignOut, sendPasswordReset,
} from "@/lib/admin-actions.functions";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Manajemen User — Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminGuard>
      <UsersPage />
    </AdminGuard>
  ),
});

type Opd = { id: string; nama: string; singkatan: string };
type Row = {
  id: string; email: string; nama_lengkap: string; nik: string | null; no_hp: string | null;
  opd_id: string | null; status: string; role: "warga" | "admin_opd" | "super_admin";
  last_sign_in_at: string | null;
  pendingRole?: "warga" | "admin_opd" | "super_admin"; pendingOpd?: string | null;
};

function UsersPage() {
  const { isSuperAdmin, user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [opds, setOpds] = useState<Opd[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actId, setActId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const opdResPromise = supabase.from("opd").select("id,nama,singkatan").order("nama");
      let usersRes: { users: Row[] } = { users: [] };
      try {
        usersRes = (await listUsers()) as { users: Row[] };
      } catch (e) {
        const msg = (e as Error).message || "Gagal memuat daftar user";
        setLoadError(msg);
        toast.error(msg);
      }
      const opdRes = await opdResPromise;
      setRows((usersRes?.users ?? []) as Row[]);
      setOpds((opdRes?.data ?? []) as Opd[]);
    } catch (e) {
      const msg = (e as Error).message;
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  async function saveRole(row: Row) {
    setActId(row.id);
    try {
      const role = row.pendingRole ?? row.role;
      const opd_id = role === "admin_opd" ? (row.pendingOpd ?? row.opd_id ?? null) : null;
      await setUserRole({ data: { user_id: row.id, role, opd_id } });
      toast.success("Role diperbarui"); await load();
    } catch (e) { toast.error((e as Error).message); } finally { setActId(null); }
  }
  async function toggleSuspend(row: Row) {
    if (row.id === user?.id) { toast.error("Tidak dapat menonaktifkan akun sendiri"); return; }
    const suspend = row.status !== "suspended";
    if (!confirm(suspend ? `Suspend akun ${row.email}?` : `Aktifkan kembali ${row.email}?`)) return;
    setActId(row.id);
    try { await setUserSuspended({ data: { user_id: row.id, suspend } }); toast.success("Berhasil"); await load(); }
    catch (e) { toast.error((e as Error).message); } finally { setActId(null); }
  }
  async function logout(row: Row) {
    if (!confirm(`Force logout semua sesi ${row.email}?`)) return;
    setActId(row.id);
    try { await forceSignOut({ data: { user_id: row.id } }); toast.success("Sesi diakhiri"); }
    catch (e) { toast.error((e as Error).message); } finally { setActId(null); }
  }
  async function reset(row: Row) {
    if (!row.email) { toast.error("Email tidak tersedia"); return; }
    setActId(row.id);
    try { await sendPasswordReset({ data: { email: row.email } }); toast.success("Link reset password dikirim"); }
    catch (e) { toast.error((e as Error).message); } finally { setActId(null); }
  }

  if (!isSuperAdmin) {
    return <AdminShell breadcrumb={[{ label: "Manajemen User" }]}><div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">Halaman ini hanya untuk Super Admin.</div></AdminShell>;
  }

  const filtered = rows.filter((r) =>
    !q.trim() ||
    r.nama_lengkap.toLowerCase().includes(q.toLowerCase()) ||
    r.email.toLowerCase().includes(q.toLowerCase()) ||
    (r.nik ?? "").includes(q),
  );

  return (
    <AdminShell breadcrumb={[{ label: "Manajemen User" }]}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Manajemen User</h1>
          <p className="text-sm text-muted-foreground">Kelola peran, OPD, status akun, sesi, dan reset password.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / email / NIK…" className="h-9 w-72 rounded-md border border-border bg-background pl-8 pr-3 text-sm" />
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <div className="font-semibold text-destructive">Gagal memuat daftar user</div>
          <div className="mt-1 text-destructive/90 break-words">{loadError}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            Jika website ini di-hosting di Cloudflare Workers, pastikan environment variables berikut sudah diset di
            <span className="font-medium"> Cloudflare Dashboard → Workers → Project → Settings → Variables and Secrets</span>:
            <ul className="mt-1 list-disc pl-5">
              <li><code>SUPABASE_URL</code></li>
              <li><code>SUPABASE_PUBLISHABLE_KEY</code></li>
              <li><code>SUPABASE_SERVICE_ROLE_KEY</code> (sebagai <em>Secret</em>)</li>
              <li><code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, <code>VITE_SUPABASE_PROJECT_ID</code></li>
            </ul>
            Setelah menambahkan, lakukan <em>redeploy</em> ulang.
          </div>
          <button onClick={() => load()} className="mt-3 inline-flex h-8 items-center rounded-md bg-destructive px-3 text-xs font-semibold text-destructive-foreground">
            Coba lagi
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">OPD</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Login Terakhir</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Memuat…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Tidak ada user.</td></tr>}
            {filtered.map((r) => {
              const role = r.pendingRole ?? r.role;
              const opd = r.pendingOpd ?? r.opd_id;
              const dirty = (r.pendingRole && r.pendingRole !== r.role) || (role === "admin_opd" && (r.pendingOpd ?? r.opd_id) !== r.opd_id);
              const busy = actId === r.id;
              const suspended = r.status === "suspended";
              return (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{r.nama_lengkap || "(tanpa nama)"}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                    <div className="text-xs text-muted-foreground">NIK: {r.nik ?? "—"} · HP: {r.no_hp ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={role} onChange={(e) => setRows((prev) => prev.map((p) => p.id === r.id ? { ...p, pendingRole: e.target.value as Row["role"] } : p))} className="h-9 rounded-md border border-border bg-background px-2 text-sm">
                      <option value="warga">Warga</option>
                      <option value="admin_opd">Admin OPD</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select disabled={role !== "admin_opd"} value={opd ?? ""} onChange={(e) => setRows((prev) => prev.map((p) => p.id === r.id ? { ...p, pendingOpd: e.target.value || null } : p))} className="h-9 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-50">
                      <option value="">— Pilih OPD —</option>
                      {opds.map((o) => (<option key={o.id} value={o.id}>{o.singkatan}</option>))}
                    </select>
                    {dirty && (
                      <button onClick={() => saveRole(r)} disabled={busy || (role === "admin_opd" && !opd)} className="ml-2 inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">
                        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Simpan
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${suspended ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
                      {suspended ? "Suspended" : "Aktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleString("id-ID") : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button onClick={() => toggleSuspend(r)} disabled={busy || r.id === user?.id} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${suspended ? "border-success/40 text-success hover:bg-success/10" : "border-destructive/40 text-destructive hover:bg-destructive/10"} disabled:opacity-40`}>
                        {suspended ? <><CheckCircle2 className="h-3 w-3" /> Aktifkan</> : <><Ban className="h-3 w-3" /> Suspend</>}
                      </button>
                      <button onClick={() => logout(r)} disabled={busy} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                        <LogOut className="h-3 w-3" /> Logout
                      </button>
                      <button onClick={() => reset(r)} disabled={busy} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                        <KeyRound className="h-3 w-3" /> Reset PW
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
