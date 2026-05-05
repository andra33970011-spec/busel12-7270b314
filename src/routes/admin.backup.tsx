// Backup & disaster recovery — Super Admin.
// Satu tombol untuk backup semua tabel sekaligus (file JSON gabungan)
// dan fitur upload restore yang mendistribusikan kembali datanya per tabel.
import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Loader2, Database, AlertTriangle, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { useAuth } from "@/lib/auth-context";
import { exportTable, enqueueJob, importBackup } from "@/lib/admin-actions.functions";

export const Route = createFileRoute("/admin/backup")({
  head: () => ({ meta: [{ title: "Backup Data — Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminGuard>
      <BackupPage />
    </AdminGuard>
  ),
});

const TABLES = [
  "profiles",
  "user_roles",
  "opd",
  "kategori_layanan",
  "layanan_publik",
  "berita",
  "permohonan",
  "permohonan_riwayat",
  "audit_log",
  "job_queue",
] as const;

type TableId = (typeof TABLES)[number];

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type BackupFile = {
  version: 1;
  exported_at: string;
  tables: Record<string, Record<string, unknown>[]>;
};

function BackupPage() {
  const { isSuperAdmin } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [lastReport, setLastReport] = useState<Record<string, { inserted: number; error?: string }> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleBackupAll() {
    setExporting(true);
    setProgress({ done: 0, total: TABLES.length, current: TABLES[0] });
    try {
      const tables: Record<string, Record<string, unknown>[]> = {};
      let totalRows = 0;
      for (let i = 0; i < TABLES.length; i++) {
        const t = TABLES[i];
        setProgress({ done: i, total: TABLES.length, current: t });
        const res = await exportTable({ data: { tabel: t } });
        tables[t] = res.rows as Record<string, unknown>[];
        totalRows += res.rows.length;
      }
      const payload: BackupFile = {
        version: 1,
        exported_at: new Date().toISOString(),
        tables,
      };
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      download(`backup-lengkap_${stamp}.json`, JSON.stringify(payload, null, 2), "application/json");
      toast.success(`Backup selesai: ${totalRows} baris dari ${TABLES.length} tabel`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
      setProgress(null);
    }
  }

  async function handleRestoreFile(file: File) {
    setImporting(true);
    setLastReport(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<BackupFile>;
      if (!parsed || typeof parsed !== "object" || !parsed.tables) {
        throw new Error("Format file tidak valid (butuh field 'tables').");
      }
      // Hanya kirim tabel yang dikenali untuk menghindari error.
      const filtered: Record<string, Record<string, unknown>[]> = {};
      for (const t of TABLES) {
        if (Array.isArray(parsed.tables[t])) filtered[t] = parsed.tables[t] as Record<string, unknown>[];
      }
      if (Object.keys(filtered).length === 0) throw new Error("Tidak ada tabel yang bisa direstore di dalam file.");

      const res = await importBackup({ data: { tables: filtered } });
      setLastReport(res.summary);
      const errors = Object.values(res.summary).filter((s) => s.error).length;
      if (errors > 0) toast.warning(`Restore selesai dengan ${errors} tabel bermasalah`);
      else toast.success("Restore selesai untuk semua tabel");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function runMaintenance(jobType: string) {
    try {
      await enqueueJob({ data: { job_type: jobType, payload: {} } });
      toast.success("Job dijadwalkan, akan dijalankan dalam 1 menit");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!isSuperAdmin) {
    return (
      <AdminShell breadcrumb={[{ label: "Backup" }]}>
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">Hanya Super Admin.</div>
      </AdminShell>
    );
  }

  const busy = exporting || importing;

  return (
    <AdminShell breadcrumb={[{ label: "Backup Data" }]}>
      <h1 className="mb-1 font-display text-2xl font-bold">Backup &amp; Disaster Recovery</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Unduh seluruh data sebagai satu file JSON, atau unggah file backup untuk mengembalikan data ke tabel masing-masing.
      </p>

      <div className="mb-6 flex gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
        <AlertTriangle className="h-5 w-5 shrink-0 text-gold-foreground" />
        <div>
          <div className="font-semibold text-foreground">Catatan</div>
          <p className="mt-1 text-muted-foreground">
            Restore dilakukan dengan <strong>upsert berdasarkan ID</strong>: data yang sudah ada akan ditimpa, data baru akan ditambahkan.
            Untuk perlindungan menyeluruh, aktifkan <strong>Point-in-Time Recovery</strong> di pengaturan database.
          </p>
        </div>
      </div>

      {/* BACKUP ALL */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary-soft text-primary">
            <Database className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold">Backup Seluruh Data</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mengekspor {TABLES.length} tabel inti ke dalam satu file JSON yang bisa diunggah kembali kapan saja.
            </p>
            {progress && (
              <p className="mt-2 text-xs text-muted-foreground">
                Memproses <span className="font-mono">{progress.current}</span> ({progress.done}/{progress.total})…
              </p>
            )}
          </div>
          <button
            onClick={handleBackupAll}
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? "Mem-backup…" : "Backup Sekarang"}
          </button>
        </div>
      </div>

      {/* UPLOAD RESTORE */}
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary-soft text-primary">
            <Upload className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold">Upload Backup (Restore)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pilih file backup JSON. Data otomatis didistribusikan ke tabelnya masing-masing mengikuti urutan dependensi.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleRestoreFile(f);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? "Mengembalikan…" : "Pilih File Backup"}
          </button>
        </div>

        {lastReport && (
          <div className="mt-4 overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Tabel</th>
                  <th className="px-3 py-2 text-right">Baris Diproses</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(lastReport).map(([tabel, info]) => (
                  <tr key={tabel} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{tabel}</td>
                    <td className="px-3 py-2 text-right">{info.inserted}</td>
                    <td className="px-3 py-2">
                      {info.error ? (
                        <span className="text-destructive">{info.error}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Sukses
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MAINTENANCE */}
      <div className="mt-8 rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-base font-semibold">Pemeliharaan</h2>
        <p className="mt-1 text-sm text-muted-foreground">Jadwalkan job pembersihan latar belakang.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => runMaintenance("audit.cleanup")} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
            Bersihkan Audit Log &gt;180 hari
          </button>
          <button onClick={() => runMaintenance("ratelimit.cleanup")} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
            Bersihkan Rate Limit &gt;1 jam
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
