import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageShell } from "@/components/site/PageShell";

type AuthSearch = { redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: typeof search.redirect === "string" && search.redirect.startsWith("/") ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Masuk / Daftar — Portal Buton Selatan" },
      { name: "description", content: "Masuk atau daftar akun warga untuk mengajukan layanan publik Kabupaten Buton Selatan." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(6, "Password minimal 6 karakter").max(72),
});
const signUpSchema = signInSchema.extend({
  nama_lengkap: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "NIK harus 16 digit angka"),
  no_hp: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor HP tidak valid (contoh: 08xxxxxxxxxx)"),
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nama_lengkap: "", nik: "", no_hp: "" });

  const goAfterAuth = () => {
    if (redirect) window.location.assign(redirect);
    else navigate({ to: "/" });
  };

  useEffect(() => {
    if (!loading && user) goAfterAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const parsed = signInSchema.parse(form);
        const { error } = await supabase.auth.signInWithPassword(parsed);
        if (error) throw error;
        toast.success("Berhasil masuk");
        goAfterAuth();
      } else if (mode === "signup") {
        const parsed = signUpSchema.parse(form);
        const { error } = await supabase.auth.signUp({
          email: parsed.email,
          password: parsed.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { nama_lengkap: parsed.nama_lengkap, no_hp: parsed.no_hp, nik: parsed.nik },
          },
        });
        if (error) throw error;
        toast.success("Akun dibuat. Anda sudah masuk.");
        goAfterAuth();
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Email reset password telah dikirim.");
        setMode("signin");
      }
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues[0].message : (err as Error).message;
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <section className="container-page py-16">
        <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 shadow-soft">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {mode === "signin" && "Masuk Akun"}
            {mode === "signup" && "Daftar Akun Warga"}
            {mode === "forgot" && "Reset Password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Portal layanan Kabupaten Buton Selatan.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <Field label="Nama Lengkap" required>
                  <input
                    required
                    value={form.nama_lengkap}
                    onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="NIK" required>
                  <input
                    required
                    inputMode="numeric"
                    pattern="\d{16}"
                    maxLength={16}
                    value={form.nik}
                    onChange={(e) => setForm({ ...form, nik: e.target.value.replace(/\D/g, "") })}
                    className="input"
                    placeholder="16 digit NIK"
                  />
                </Field>
                <Field label="Nomor HP" required>
                  <input
                    required
                    inputMode="tel"
                    value={form.no_hp}
                    onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
                    className="input"
                    placeholder="08xxxxxxxxxx"
                  />
                </Field>
              </>
            )}
            <Field label="Email" required>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
              />
            </Field>
            {mode !== "forgot" && (
              <Field label="Password" required>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input"
                  minLength={6}
                />
              </Field>
            )}

            <button
              disabled={busy}
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-95 disabled:opacity-60"
            >
              {busy
                ? "Memproses…"
                : mode === "signin"
                ? "Masuk"
                : mode === "signup"
                ? "Daftar"
                : "Kirim Email Reset"}
            </button>
          </form>

          <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
            {mode === "signin" && (
              <>
                <button onClick={() => setMode("signup")} className="text-primary hover:underline text-left">
                  Belum punya akun? Daftar di sini
                </button>
                <button onClick={() => setMode("forgot")} className="text-primary hover:underline text-left">
                  Lupa password?
                </button>
              </>
            )}
            {mode !== "signin" && (
              <button onClick={() => setMode("signin")} className="text-primary hover:underline text-left">
                ← Kembali ke Masuk
              </button>
            )}
            <Link to="/" className="hover:underline">← Kembali ke Beranda</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}
