import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Search, LogOut, User as UserIcon, FileText, ShieldCheck, ChevronDown } from "lucide-react";
import lambang from "@/assets/lambang.png";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/", label: "Beranda" },
  { to: "/layanan", label: "Layanan" },
  { to: "/data", label: "Data Terpadu" },
  { to: "/kinerja-opd", label: "Kinerja OPD" },   // <-- tambah ini
  { to: "/berita", label: "Berita" },
  { to: "/tentang", label: "Tentang" },
  { to: "/kontak", label: "Kontak" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAdmin, isSuperAdmin, signOut } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const [dataVisiblePublic, setDataVisiblePublic] = useState<boolean>(true);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    supabase
      .from("app_setting")
      .select("value")
      .eq("key", "data_terpadu_visible_public")
      .maybeSingle()
      .then(({ data }) => {
        const v = data?.value;
        setDataVisiblePublic(v === false || v === "false" ? false : true);
      });
  }, []);

  // Sembunyikan menu Data Terpadu jika visibility OFF dan user bukan super admin
  const visibleNavItems = navItems.filter((item) => {
    if (item.to === "/data" && !dataVisiblePublic && !isSuperAdmin) return false;
    return true;
  });

  const displayName =
    (user?.user_metadata as { nama_lengkap?: string } | undefined)?.nama_lengkap ||
    user?.email?.split("@")[0] ||
    "Akun";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      {/* Top utility bar */}
      <div className="hidden bg-primary text-primary-foreground md:block">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          <span className="opacity-90">Portal Resmi Pemerintah Kabupaten Buton Selatan</span>
          <div className="flex items-center gap-5 opacity-90">
            {user ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Masuk sebagai <strong className="font-semibold">{displayName}</strong>
                {isSuperAdmin && <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold">SUPER ADMIN</span>}
                {!isSuperAdmin && isAdmin && <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold">ADMIN OPD</span>}
              </span>
            ) : (
              <a href="#" className="hover:opacity-100">PPID</a>
            )}
            <a href="#" className="hover:opacity-100">LAPOR!</a>
            <a href="#" className="hover:opacity-100">Bahasa: ID</a>
          </div>
        </div>
      </div>

      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={lambang} alt="Lambang" width={40} height={40} className="h-10 w-10" />
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans">PEMERINTAH KABUPATEN</div>
            <div className="font-display text-base font-bold text-foreground px-px">BUTON SELATAN</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {visibleNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-md px-3 py-2 text-sm font-medium text-surface-foreground transition-colors hover:bg-primary-soft hover:text-primary"
              activeProps={{ className: "bg-primary-soft text-primary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            aria-label="Cari"
            className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-surface-foreground hover:bg-muted"
          >
            <Search className="h-4 w-4" />
          </button>

          {user ? (
            <div ref={menuRef} className="relative hidden md:block">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-muted"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-primary text-[11px] font-bold text-primary-foreground">
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[140px] truncate">{displayName}</span>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                  <div className="border-b border-border px-3 py-2.5 text-xs">
                    <div className="font-semibold text-foreground truncate">{displayName}</div>
                    <div className="truncate text-muted-foreground">{user.email}</div>
                  </div>
                  <div className="py-1 text-sm">
                    <Link to="/permohonan" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-foreground hover:bg-muted">
                      <FileText className="h-4 w-4" /> Permohonan Saya
                    </Link>
                    <Link to="/permohonan/baru" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-foreground hover:bg-muted">
                      <UserIcon className="h-4 w-4" /> Ajukan Permohonan
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-foreground hover:bg-muted">
                        <ShieldCheck className="h-4 w-4" /> Dashboard Admin
                      </Link>
                    )}
                  </div>
                  <button
                    onClick={() => { signOut(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/5"
                  >
                    <LogOut className="h-4 w-4" /> Keluar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className="hidden md:inline-flex h-10 items-center rounded-md bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-95"
            >
              Masuk Akun
            </Link>
          )}

          {/* Mobile: avatar pill (login) atau tombol Masuk */}
          {user ? (
            <Link
              to="/permohonan"
              className="md:hidden inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-foreground"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-primary text-[11px] font-bold text-primary-foreground">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-[80px] truncate">{displayName}</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="md:hidden inline-flex h-10 items-center rounded-md bg-gradient-primary px-3 text-xs font-semibold text-primary-foreground shadow-soft"
            >
              Masuk
            </Link>
          )}

          <button
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-border"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-border bg-background animate-fade-in">
          <div className="container-page flex flex-col py-2">
            {user && (
              <div className="mb-2 rounded-md bg-primary-soft px-3 py-2 text-xs">
                <div className="font-semibold text-primary">{displayName}</div>
                <div className="truncate text-muted-foreground">{user.email}</div>
                {isSuperAdmin && <span className="mt-1 inline-block rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">SUPER ADMIN</span>}
                {!isSuperAdmin && isAdmin && <span className="mt-1 inline-block rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">ADMIN OPD</span>}
              </div>
            )}
            {visibleNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-md px-3 py-3 text-sm font-medium text-surface-foreground hover:bg-muted"
                activeProps={{ className: "bg-primary-soft text-primary" }}
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <>
                <div className="my-2 h-px bg-border" />
                <Link to="/permohonan" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-surface-foreground hover:bg-muted">
                  <FileText className="h-4 w-4" /> Permohonan Saya
                </Link>
                <Link to="/permohonan/baru" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-surface-foreground hover:bg-muted">
                  <UserIcon className="h-4 w-4" /> Ajukan Permohonan
                </Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-surface-foreground hover:bg-muted">
                    <ShieldCheck className="h-4 w-4" /> Dashboard Admin
                  </Link>
                )}
              </>
            )}
            {user ? (
              <button
                onClick={() => { signOut(); setOpen(false); }}
                className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 text-sm font-semibold text-destructive"
              >
                <LogOut className="h-4 w-4" /> Keluar
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-gradient-primary text-sm font-semibold text-primary-foreground"
              >
                Masuk Akun
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
