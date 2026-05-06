import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { LayananOpdPageSkeleton } from "@/components/site/Skeletons";
import { FileText, Search, LayoutGrid } from "lucide-react";
import { layananAllWithOpdQueryOptions } from "@/lib/queries";

export const Route = createFileRoute("/layanan/")({
  head: () => ({
    meta: [
      { title: "Layanan Publik — Pemerintah Kabupaten Buton Selatan" },
      { name: "description", content: "Katalog layanan publik Kabupaten Buton Selatan dari seluruh OPD." },
      { property: "og:title", content: "Katalog Layanan Publik Buton Selatan" },
      { property: "og:description", content: "Telusuri layanan berdasarkan kategori dan dinas pengelola." },
    ],
  }),
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(layananAllWithOpdQueryOptions());
  },
  pendingComponent: LayananOpdPageSkeleton,
  component: LayananPage,
});

function LayananPage() {
  const { data: layanan } = useSuspenseQuery(layananAllWithOpdQueryOptions());
  const [q, setQ] = useState("");
  const [kategoriAktif, setKategoriAktif] = useState<string>("__all__");

  // kumpulkan semua kategori unik dari OPD
  const kategoriList = useMemo(() => {
    const set = new Set<string>();
    for (const l of layanan) {
      l.opd?.kategori?.forEach((k) => set.add(k));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [layanan]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return layanan.filter((l) => {
      if (kategoriAktif !== "__all__") {
        if (!l.opd?.kategori?.includes(kategoriAktif)) return false;
      }
      if (!kw) return true;
      return `${l.judul} ${l.deskripsi ?? ""} ${l.opd?.singkatan ?? ""} ${l.opd?.nama ?? ""}`
        .toLowerCase()
        .includes(kw);
    });
  }, [layanan, q, kategoriAktif]);

  return (
    <PageShell>
      <PageHero
        eyebrow="Katalog Layanan"
        title="Layanan publik per dinas."
        description="Telusuri layanan berdasarkan kategori atau cari langsung dengan kata kunci."
      />

      <section className="container-page py-10">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cari
              </h3>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 shadow-soft">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Kata kunci..."
                  className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Kategori
              </h3>
              <ul className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                <li>
                  <button
                    onClick={() => setKategoriAktif("__all__")}
                    className={`block w-full px-4 py-2.5 text-left text-sm transition-colors ${
                      kategoriAktif === "__all__"
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    Semua kategori
                  </button>
                </li>
                {kategoriList.map((k) => (
                  <li key={k} className="border-t border-border">
                    <button
                      onClick={() => setKategoriAktif(k)}
                      className={`block w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        kategoriAktif === k
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      {k}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Grid kartu layanan */}
          <div>
            <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Menampilkan <span className="font-semibold text-foreground">{filtered.length}</span> layanan
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                <LayoutGrid className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 font-medium">Tidak ada layanan yang cocok</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filtered.map((l) => (
                  <Link
                    key={l.id}
                    to="/layanan/$slug"
                    params={{ slug: l.slug }}
                    className="group flex gap-4 rounded-xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary-soft group-hover:text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold leading-snug text-foreground">{l.judul}</h3>
                      {l.deskripsi && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {l.deskripsi}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {l.opd && (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {l.opd.singkatan}
                          </span>
                        )}
                        <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                          SLA {l.sla_hari} hari
                        </span>
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                          Unggulan
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
