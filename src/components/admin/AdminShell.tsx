// AdminShell sekarang menampilkan OPD aktif berdasarkan profil admin yang login
// (super admin bisa pilih OPD untuk preview). Navigasi diperluas ke halaman baru.
import { type ReactNode, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Inbox, Users, FileClock, Database as DbIcon, ChevronRight, LogOut, Building2, Settings, Newspaper, FolderOpen, BarChart3, UserSquare2 } from "lucide-react";
import lambang from "@/assets/lambang.png";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

type Opd = { id: string; nama: string; singkatan: string };

const baseNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin", label: "Permohonan", icon: Inbox, hash: "tabel" },
];
const superNav = [
  { to: "/admin/users", label: "Manajemen User", icon: Users },
  { to: "/admin/opd", label: "OPD", icon: Building2 },
  { to: "/admin/config", label: "Konfigurasi", icon: Settings },
  { to: "/admin/cms", label: "CMS Konten", icon: Newspaper },
  { to: "/admin/pejabat", label: "Pejabat", icon: UserSquare2 },
  { to: "/admin/data-terpadu", label: "Data Terpadu", icon: BarChart3 },
  { to: "/admin/storage", label: "Storage", icon: FolderOpen },
  { to: "/admin/audit", label: "Audit Log", icon: FileClock },
  { to: "/admin/backup", label: "Backup Data", icon: DbIcon },
];

export function AdminShell({
  children,
  breadcrumb,
  opdAktifId,
  onChangeOpd,
}: {
  children: ReactNode;
  breadcrumb?: { label: string; to?: string }[];
  opdAktifId?: string;
  onChangeOpd?: (id: string) => void;
}) {
  const { isSuperAdmin, signOut } = useAuth();
  const [opdList, setOpdList] = useState<Opd[]>([]);

  useEffect(() => {
    supabase.from("opd").select("id,nama,singkatan").order("nama").then(({ data }) => {
      setOpdList((data ?? []) as Opd[]);
    });
  }, []);

  const opd = opdList.find((o) => o.id === opdAktifId);

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={lambang} alt="" className="h-8 w-8" />
            <div className="hidden sm:block leading-tight">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Admin</div>
              <div className="font-display text-sm font-bold">Kabupaten Buton Selatan</div>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {isSuperAdmin && opdList.length > 0 && onChangeOpd && (
              <>
                <label className="hidden sm:block text-xs text-muted-foreground">OPD aktif</label>
                <select
                  value={opdAktifId ?? ""}
                  onChange={(e) => onChangeOpd(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm font-medium"
                  aria-label="Pilih OPD"
                >
                  <option value="">Semua OPD</option>
                  {opdList.map((o) => (
                    <option key={o.id} value={o.id}>{o.singkatan}</option>
                  ))}
                </select>
              </>
            )}
            <button
              onClick={() => signOut()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
            >
              <LogOut className="h-3.5 w-3.5" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-background min-h-[calc(100vh-3.5rem)] sticky top-14">
          <div className="p-4">
            <div className="rounded-lg bg-gradient-primary p-3 text-primary-foreground shadow-soft">
              <div className="text-[10px] uppercase opacity-80">OPD</div>
              <div className="text-sm font-semibold leading-tight">{opd?.nama ?? "Semua OPD"}</div>
            </div>
          </div>
          <nav className="px-2 space-y-1">
            {baseNav.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                activeOptions={{ exact: true }}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-surface-foreground hover:bg-primary-soft hover:text-primary"
                activeProps={{ className: "bg-primary-soft text-primary" }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            {isSuperAdmin && (
              <>
                <div className="my-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">Super Admin</div>
                {superNav.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-surface-foreground hover:bg-primary-soft hover:text-primary"
                    activeProps={{ className: "bg-primary-soft text-primary" }}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </nav>
          <div className="mt-auto p-4 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">← Kembali ke Portal Warga</Link>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {breadcrumb && breadcrumb.length > 0 && (
            <div className="border-b border-border bg-background/60 px-4 py-2 md:px-6">
              <nav className="flex items-center gap-1 text-xs text-muted-foreground">
                <Link to="/admin" className="hover:text-primary">Admin</Link>
                {breadcrumb.map((b, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    {b.to ? (
                      <Link to={b.to} className="hover:text-primary">{b.label}</Link>
                    ) : (
                      <span className="text-foreground font-medium">{b.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            </div>
          )}
          <div className="p-4 md:p-6 animate-page-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  delta?: string;
  tone?: "default" | "accent" | "gold" | "success" | "destructive";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const toneClass = {
    default: "bg-primary-soft text-primary",
    accent: "bg-accent/15 text-accent",
    gold: "bg-gold/20 text-gold-foreground",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {Icon && (
          <span className={`grid h-8 w-8 place-items-center rounded-md ${toneClass}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-3 font-display text-2xl font-bold text-foreground">{value}</div>
      {delta && <div className="mt-1 text-xs text-muted-foreground">{delta}</div>}
    </div>
  );
}
