// Admin: Storage Explorer untuk bucket berkas-permohonan.
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Folder, FileIcon, Trash2, ChevronLeft, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { useAuth } from "@/lib/auth-context";
import { listStorageObjects, deleteStorageObject } from "@/lib/admin-actions.functions";

export const Route = createFileRoute("/admin/storage")({
  head: () => ({ meta: [{ title: "Storage — Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminGuard>
      <StoragePage />
    </AdminGuard>
  ),
});

type Item = { name: string; isFolder: boolean; size: number | null; mimetype: string | null; updated_at: string | null; signedUrl: string | null };

function StoragePage() {
  const { isSuperAdmin } = useAuth();
  const [prefix, setPrefix] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastPrefix, setLastPrefix] = useState("");

  async function load(p: string) {
    setLoading(true);
    setLoadError(null);
    setLastPrefix(p);
    try {
      const res = await listStorageObjects({ data: { prefix: p } });
      const safeItems = Array.isArray(res?.items)
        ? res.items.filter((it): it is Item => it != null && typeof it.name === "string")
        : [];
      setItems(safeItems);
      setPrefix(typeof res?.prefix === "string" ? res.prefix : p);
    } catch (e) {
      setItems([]);
      const msg = (e as Error)?.message || "Gagal memuat storage";
      setLoadError(msg);
      toast.error(`Gagal memuat storage: ${msg}`);
      console.error("[admin.storage] load error", e);
    }
    finally { setLoading(false); }
  }
  function retry() { load(loadError ? lastPrefix : prefix); }
  useEffect(() => { if (isSuperAdmin) load(""); }, [isSuperAdmin]);

  function enter(name: string) { load(prefix ? `${prefix}/${name}` : name); }
  function up() {
    if (!prefix) return;
    const parts = prefix.split("/"); parts.pop();
    load(parts.join("/"));
  }
  async function hapus(name: string) {
    if (!confirm(`Hapus ${name}?`)) return;
    try {
      await deleteStorageObject({ data: { path: prefix ? `${prefix}/${name}` : name } });
      toast.success("Dihapus");
      load(prefix);
    } catch (e) {
      const msg = (e as Error)?.message || "Gagal menghapus berkas";
      toast.error(`Gagal menghapus: ${msg}`);
    }
  }

  if (!isSuperAdmin) return <AdminShell breadcrumb={[{ label: "Storage" }]}><div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">Hanya Super Admin.</div></AdminShell>;

  return (
    <AdminShell breadcrumb={[{ label: "Storage" }]}>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold">File Explorer</h1>
        <p className="text-sm text-muted-foreground">Telusuri & kelola berkas pada bucket <code>berkas-permohonan</code>.</p>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <button onClick={up} disabled={!prefix} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" /> Naik
        </button>
        <button onClick={() => load(prefix)} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm">
          <RefreshCw className="h-4 w-4" /> Muat ulang
        </button>
        <div className="ml-2 truncate rounded-md bg-muted px-3 py-1.5 text-xs font-mono">/ {prefix || "(root)"}</div>
      </div>

      {loadError && (
        <div className="mb-3 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="flex-1">
            <div className="font-medium text-destructive">Gagal memuat storage</div>
            <div className="mt-0.5 text-xs text-destructive/80 break-words">{loadError}</div>
          </div>
          <button
            onClick={retry}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-destructive/40 bg-background px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Coba lagi
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Tipe</th>
              <th className="px-4 py-3 font-medium">Ukuran</th>
              <th className="px-4 py-3 font-medium">Diubah</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Memuat…</td></tr>}
            {!loading && loadError && items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center">
                <div className="text-muted-foreground">Tidak dapat menampilkan berkas.</div>
                <button onClick={retry} className="mt-3 inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
                  <RefreshCw className="h-4 w-4" /> Coba lagi
                </button>
              </td></tr>
            )}
            {!loading && !loadError && items.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Folder kosong.</td></tr>}
            {items.map((it) => {
              const name = it?.name ?? "(tanpa nama)";
              const isFolder = !!it?.isFolder;
              return (
                <tr key={name} className="border-t border-border">
                  <td className="px-4 py-3">
                    {isFolder ? (
                      <button onClick={() => enter(name)} className="inline-flex items-center gap-2 font-medium text-primary hover:underline">
                        <Folder className="h-4 w-4" /> {name}/
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-2"><FileIcon className="h-4 w-4 text-muted-foreground" /> {name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{isFolder ? "folder" : (it?.mimetype ?? "file")}</td>
                  <td className="px-4 py-3 text-xs">{it?.size != null ? formatBytes(it.size) : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{it?.updated_at ? new Date(it.updated_at).toLocaleString("id-ID") : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {!isFolder && it?.signedUrl && (
                      <a href={it.signedUrl} target="_blank" rel="noreferrer" className="mr-2 inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">
                        <ExternalLink className="h-3.5 w-3.5" /> Buka
                      </a>
                    )}
                    {!isFolder && (
                      <button onClick={() => hapus(name)} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </button>
                    )}
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

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}
