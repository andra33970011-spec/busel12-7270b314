import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Inbox } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, STATUS_TONE, fmtTanggal, type StatusPermohonan } from "@/lib/permohonan";

export const Route = createFileRoute("/permohonan/")({
  head: () => ({
    meta: [
      { title: "Permohonan Saya — Portal Buton Selatan" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ListPage,
});

type Row = {
  id: string;
  kode: string;
  judul: string;
  kategori: string;
  status: StatusPermohonan;
  tanggal_masuk: string;
  opd: { singkatan: string } | null;
};

function ListPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Row[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoadingList(true);
    supabase
      .from("permohonan")
      .select("id, kode, judul, kategori, status, tanggal_masuk, opd:opd_id(singkatan)")
      .eq("pemohon_id", user.id)
      .order("tanggal_masuk", { ascending: false })
      .then(({ data }) => {
        setItems((data ?? []) as unknown as Row[]);
        setLoadingList(false);
      });
  }, [user]);

  return (
    <PageShell>
      <PageHero eyebrow="Akun Saya" title="Permohonan Saya" description="Pantau status pengajuan layanan publik Anda." />
      <section className="container-page py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Daftar Permohonan</h2>
          <Link
            to="/permohonan/baru"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            <Plus className="h-4 w-4" /> Ajukan Baru
          </Link>
        </div>

        {loadingList ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">Memuat…</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-display text-lg font-semibold">Belum ada permohonan</h3>
            <p className="mt-1 text-sm text-muted-foreground">Mulai ajukan permohonan layanan publik pertama Anda.</p>
            <Link to="/permohonan/baru" className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> Ajukan Baru
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Kode</th>
                  <th className="px-4 py-3 font-medium">Judul</th>
                  <th className="px-4 py-3 font-medium">OPD</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-surface/60">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        to="/permohonan/$id"
                        params={{ id: p.id }}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {p.kode}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{p.judul}</div>
                      <div className="text-xs text-muted-foreground">{p.kategori}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{p.opd?.singkatan ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_TONE[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtTanggal(p.tanggal_masuk)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}
