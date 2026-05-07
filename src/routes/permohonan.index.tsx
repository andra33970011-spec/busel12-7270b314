import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Inbox, Star, BarChart3 } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, STATUS_TONE, fmtTanggal, type StatusPermohonan } from "@/lib/permohonan";
import { RatingForm } from "@/components/warga/RatingForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";


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
  catatanAdmin?: string | null;
  rating?: { skor: number; komentar: string | null } | null;
};

function ListPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Row[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [openRatingFor, setOpenRatingFor] = useState<Row | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  async function loadData(uid: string) {
    setLoadingList(true);
    const { data } = await supabase
      .from("permohonan")
      .select("id, kode, judul, kategori, status, tanggal_masuk, opd:opd_id(singkatan)")
      .eq("pemohon_id", uid)
      .order("tanggal_masuk", { ascending: false });
    const rows = (data ?? []) as unknown as Row[];

    const finalIds = rows.filter((r) => r.status === "selesai" || r.status === "ditolak").map((r) => r.id);
    if (finalIds.length > 0) {
      const [{ data: rws }, { data: rts }] = await Promise.all([
        supabase
          .from("permohonan_riwayat")
          .select("permohonan_id, catatan, created_at")
          .in("permohonan_id", finalIds)
          .not("catatan", "is", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("permohonan_rating")
          .select("permohonan_id, skor, komentar")
          .in("permohonan_id", finalIds)
          .eq("user_id", uid),
      ]);

      const latest: Record<string, string> = {};
      ((rws ?? []) as { permohonan_id: string; catatan: string | null }[]).forEach((r) => {
        if (r.catatan && !latest[r.permohonan_id]) latest[r.permohonan_id] = r.catatan;
      });
      const ratingMap: Record<string, { skor: number; komentar: string | null }> = {};
      ((rts ?? []) as { permohonan_id: string; skor: number; komentar: string | null }[]).forEach((r) => {
        ratingMap[r.permohonan_id] = { skor: r.skor, komentar: r.komentar };
      });

      rows.forEach((r) => {
        r.catatanAdmin = latest[r.id] ?? null;
        r.rating = ratingMap[r.id] ?? null;
      });
    }

    setItems(rows);
    setLoadingList(false);
  }

  useEffect(() => {
    if (!user) return;
    loadData(user.id);
  }, [user]);

  return (
    <PageShell>
      <PageHero eyebrow="Akun Saya" title="Permohonan Saya" description="Pantau status pengajuan layanan publik Anda." />
      <section className="container-page py-12">
        <div className="mb-6">
          <TelegramLinkCard botUsername="buselmelayani_bot" />
        </div>
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
                  <th className="px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-surface/60 align-top">
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
                      {(p.status === "selesai" || p.status === "ditolak") && p.catatanAdmin && (
                        <div className={`mt-2 rounded-md border px-2 py-1.5 text-xs ${p.status === "selesai" ? "border-success/30 bg-success/5 text-success" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
                          <span className="font-semibold">Catatan Admin: </span>
                          <span className="text-foreground/80">{p.catatanAdmin}</span>
                        </div>
                      )}
                      {p.status === "selesai" && p.rating && (
                        <div className="mt-2 rounded-md border border-gold/30 bg-gold/5 p-2 text-xs">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`h-3.5 w-3.5 ${s <= p.rating!.skor ? "fill-gold text-gold" : "text-muted-foreground/40"}`} />
                            ))}
                            <span className="ml-1 font-medium text-foreground">{p.rating.skor}/5</span>
                          </div>
                          {p.rating.komentar && (
                            <div className="mt-1 italic text-muted-foreground">"{p.rating.komentar}"</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground">{p.opd?.singkatan ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_TONE[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtTanggal(p.tanggal_masuk)}</td>
                    <td className="px-4 py-3">
                      {p.status === "selesai" && !p.rating && (
                        <button
                          type="button"
                          onClick={() => setOpenRatingFor(p)}
                          className="inline-flex items-center gap-1 rounded-md bg-gold/10 px-2.5 py-1.5 text-xs font-semibold text-gold-foreground border border-gold/30 hover:bg-gold/20"
                        >
                          <Star className="h-3.5 w-3.5" /> Beri Rating
                        </button>
                      )}
                      {p.status === "selesai" && p.rating && (
                        <Link
                          to="/kinerja-opd"
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                        >
                          <BarChart3 className="h-3.5 w-3.5" /> Kinerja OPD
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Rating & ulasan Anda akan diagregasi pada halaman{" "}
          <Link to="/kinerja-opd" className="font-medium text-primary hover:underline">Kinerja OPD</Link>{" "}
          sebagai indikator kepuasan layanan publik.
        </p>
      </section>

      <Dialog open={!!openRatingFor} onOpenChange={(o) => !o && setOpenRatingFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Beri Rating Layanan</DialogTitle>
            <DialogDescription>
              {openRatingFor?.judul} · {openRatingFor?.opd?.singkatan ?? "-"}
            </DialogDescription>
          </DialogHeader>
          {openRatingFor && user && (
            <RatingForm
              permohonanId={openRatingFor.id}
              pemohonId={user.id}
              sudahRating={false}
              onRatingSubmit={() => {
                setOpenRatingFor(null);
                if (user) loadData(user.id);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
