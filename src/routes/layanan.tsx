import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { LayananOpdPageSkeleton } from "@/components/site/Skeletons";
import { Building2, ChevronRight } from "lucide-react";
import { opdListQueryOptions, layananCountByOpdQueryOptions } from "@/lib/queries";

export const Route = createFileRoute("/layanan")({
  head: () => ({
    meta: [
      { title: "Layanan / OPD — Pemerintah Kabupaten Buton Selatan" },
      { name: "description", content: "Daftar Organisasi Perangkat Daerah (OPD) Kabupaten Buton Selatan beserta layanan publik yang dikelola." },
      { property: "og:title", content: "Daftar OPD Kabupaten Buton Selatan" },
      { property: "og:description", content: "Jelajahi layanan publik berdasarkan OPD." },
    ],
  }),
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(opdListQueryOptions());
    queryClient.ensureQueryData(layananCountByOpdQueryOptions());
  },
  pendingComponent: LayananOpdPageSkeleton,
  component: LayananOpdPage,
});

function LayananOpdPage() {
  const { data: opds } = useSuspenseQuery(opdListQueryOptions());
  const { data: counts } = useSuspenseQuery(layananCountByOpdQueryOptions());

  return (
    <PageShell>
      <PageHero
        eyebrow="Organisasi Perangkat Daerah"
        title="Jelajahi layanan berdasarkan OPD."
        description="Pilih OPD untuk melihat profil singkat dan seluruh layanan publik yang dikelolanya."
      />

      <section className="container-page py-12">
        {opds.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 font-display text-xl font-bold">Daftar OPD belum tersedia</h2>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {opds.map((o) => (
            <Link
              key={o.id}
              to="/instansi/$singkatan"
              params={{ singkatan: o.singkatan }}
              search={{ page: 1 }}
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary transition-transform group-hover:scale-110">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary">{o.singkatan}</div>
                  <h3 className="font-semibold leading-tight">{o.nama}</h3>
                </div>
              </div>
              {o.kategori.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {o.kategori.slice(0, 4).map((k) => (
                    <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{k}</span>
                  ))}
                </div>
              )}
              <div className="mt-auto pt-5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{counts[o.id] ?? 0} layanan</span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Lihat <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
