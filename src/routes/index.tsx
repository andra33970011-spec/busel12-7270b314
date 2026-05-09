import { useState, Suspense } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight, ShieldCheck, Database, Users, Megaphone, Search, Building2,
} from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { HomeLayananSkeleton } from "@/components/site/Skeletons";
import { homeStatsQueryOptions, opdListQueryOptions, layananCountByOpdQueryOptions } from "@/lib/queries";
import heroImg from "@/assets/hero-city.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pemerintah Kabupaten Buton Selatan — Portal Resmi & Satu Data" },
      { name: "description", content: "Portal resmi pelayanan publik dan satu data Kabupaten Buton Selatan. Ajukan layanan, lihat statistik, dan pantau kinerja pemerintah." },
      { property: "og:title", content: "Pemerintah Kabupaten Buton Selatan — Portal Resmi" },
      { property: "og:description", content: "Sentralisasi data dan pelayanan publik kota dalam satu portal." },
    ],
  }),
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(opdListQueryOptions());
    queryClient.prefetchQuery(layananCountByOpdQueryOptions());
    queryClient.prefetchQuery(homeStatsQueryOptions());
  },
  component: HomePage,
});

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString("id-ID");
}

function StatsGrid() {
  const { data } = useSuspenseQuery(homeStatsQueryOptions());
  const stats = [
    { label: "Layanan Online", value: formatNumber(data.layananOnline) },
    { label: "Permohonan/bulan", value: formatNumber(data.permohonanBulanIni) },
    { label: "Dataset Terbuka", value: formatNumber(data.datasetTerbuka) },
    { label: "Kepuasan Warga", value: data.kepuasanPersen !== null ? `${data.kepuasanPersen.toFixed(0)}%` : "—" },
  ];
  return (
    <>
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl bg-white/10 p-4">
          <div className="font-display text-2xl font-bold md:text-3xl">{s.value}</div>
          <div className="mt-1 text-xs text-white/80">{s.label}</div>
        </div>
      ))}
    </>
  );
}

function inisial(s: string) {
  const t = s.replace(/[^A-Za-z0-9 ]/g, "").trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function DirektoriOpdGrid() {
  const { data: opdList } = useSuspenseQuery(opdListQueryOptions());
  const { data: counts } = useSuspenseQuery(layananCountByOpdQueryOptions());

  if (opdList.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
        Belum ada OPD yang terdaftar.
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {opdList.map((o) => {
        const jml = counts[o.id] ?? 0;
        return (
          <motion.div key={o.id} whileHover={{ y: -4 }}>
            <Link
              to="/instansi/$singkatan"
              params={{ singkatan: o.singkatan }}
              className="group flex h-full gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground font-display text-lg font-bold shadow-soft">
                {inisial(o.singkatan)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {o.singkatan}
                </div>
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                  {o.nama}
                </h3>
                <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <Building2 className="h-3 w-3" />
                  {jml} layanan
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

function HomePage() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/layanan", search: { q: q.trim() || undefined } as never });
  };

  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div
          className="absolute inset-0 opacity-25 mix-blend-overlay"
          style={{ backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" aria-hidden />
        <div className="container-page relative grid gap-10 py-16 md:py-24 lg:grid-cols-12 lg:gap-12">
          <motion.div initial={false} className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" /> Portal Resmi Pemerintah
            </span>
            <h1 className="mt-5 text-balance text-4xl font-bold leading-tight md:text-6xl">
              Satu Pintu,<br />Satu Data,<br /><span className="text-gold">Satu Pelayanan.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/85 md:text-lg">
              Akses seluruh layanan publik Kabupaten Buton Selatan dan data pemerintah terpadu dalam satu tempat — cepat, transparan, dan terverifikasi.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/layanan" className="inline-flex h-12 items-center gap-2 rounded-md bg-white px-6 text-sm font-semibold text-primary shadow-elevated hover:bg-white/95">
                Mulai Layanan <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/data" className="inline-flex h-12 items-center gap-2 rounded-md border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur hover:bg-white/15">
                Lihat Satu Data
              </Link>
            </div>

            {/* Search bar */}
            <form onSubmit={submitSearch} className="mt-8 flex max-w-xl items-center gap-2 rounded-xl border border-white/20 bg-white/95 p-2 shadow-elevated">
              <Search className="ml-2 h-5 w-5 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari layanan: KTP, IMB, beasiswa…"
                className="flex-1 bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button type="submit" className="rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Cari
              </button>
            </form>
          </motion.div>

          <motion.div initial={false} className="lg:col-span-5">
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <Suspense fallback={<>{Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-white/10 p-4 animate-pulse">
                  <div className="h-7 w-16 bg-white/20 rounded" />
                  <div className="mt-2 h-3 w-20 bg-white/15 rounded" />
                </div>
              ))}</>}>
                <StatsGrid />
              </Suspense>
            </div>
          </motion.div>
        </div>
      </section>

      {/* DIREKTORI OPD — sinkron dengan database */}
      <section className="container-page py-16 md:py-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-accent">Direktori OPD</div>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Dinas & Perangkat Daerah</h2>
            <p className="mt-2 text-sm text-muted-foreground">Kenali setiap OPD dan layanan yang dikelolanya.</p>
          </div>
          <Link to="/layanan" className="hidden text-sm font-medium text-primary hover:underline md:inline-flex">
            Lihat semua layanan →
          </Link>
        </div>

        <Suspense fallback={<HomeLayananSkeleton />}>
          <DirektoriOpdGrid />
        </Suspense>

        <div className="mt-8 text-center md:hidden">
          <Link to="/layanan" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Lihat semua layanan <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      {/* PILAR */}
      <section className="bg-surface py-16 md:py-24">
        <div className="container-page grid gap-10 lg:grid-cols-3">
          {[
            { icon: Database, title: "Satu Data Terpadu", desc: "Semua dataset pemerintah dalam satu standar — terbuka, terverifikasi, dan dapat diunduh." },
            { icon: Users, title: "Pelayanan Sentralistik", desc: "Warga cukup satu akun untuk seluruh layanan: adminduk, perizinan, kesehatan, hingga pajak." },
            { icon: Megaphone, title: "Transparansi Real-time", desc: "Dashboard kinerja, anggaran, dan capaian program publik dapat dipantau langsung." },
          ].map((p) => (
            <div key={p.title} className="rounded-2xl border border-border bg-card p-7 shadow-soft">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-16 md:py-24">
        <div className="overflow-hidden rounded-3xl bg-gradient-primary p-10 text-primary-foreground shadow-elevated md:p-14">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold md:text-4xl">Punya keluhan atau aspirasi?</h2>
              <p className="mt-3 text-white/85">
                Sampaikan langsung melalui kanal LAPOR! Setiap laporan dipantau dan ditindaklanjuti oleh OPD terkait.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link to="/kontak" className="inline-flex h-12 items-center rounded-md bg-white px-6 text-sm font-semibold text-primary hover:bg-white/95">
                Lapor Sekarang
              </Link>
              <Link to="/tentang" className="inline-flex h-12 items-center rounded-md border border-white/40 px-6 text-sm font-semibold text-white hover:bg-white/10">
                Tentang Pemerintah
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
