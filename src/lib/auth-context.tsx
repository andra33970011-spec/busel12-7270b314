import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "warga" | "admin_opd" | "super_admin";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRoles(uid: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r) => r.role as AppRole));
  }

  useEffect(() => {
    // Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer to avoid deadlock
        setTimeout(() => loadRoles(sess.user.id), 0);
      } else {
        setRoles([]);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadRoles(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Inject Bearer token ke setiap pemanggilan TanStack Server Function
  // (header `x-tsr-serverfn: true`) agar middleware requireSupabaseAuth menerima sesi user.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { __origFetch?: typeof fetch };
    if (!w.__origFetch) w.__origFetch = window.fetch.bind(window);
    const orig = w.__origFetch;
    window.fetch = async (input, init) => {
      try {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        const isServerFn = headers.get("x-tsr-serverfn") === "true";
        if (isServerFn && !headers.has("authorization")) {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) {
            headers.set("authorization", `Bearer ${token}`);
            return orig(input, { ...init, headers });
          }
        }
      } catch {
        // fall-through ke fetch asli
      }
      return orig(input, init);
    };
    return () => {
      if (w.__origFetch) window.fetch = w.__origFetch;
    };
  }, []);

  const value: AuthCtx = {
    user,
    session,
    roles,
    loading,
    isAdmin: roles.includes("admin_opd") || roles.includes("super_admin"),
    isSuperAdmin: roles.includes("super_admin"),
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshRoles: async () => {
      if (user) await loadRoles(user.id);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
