// Server-only helper: rate limiting menggunakan tabel rate_limit (service-role).
// Window 1 menit, 10 req per window per (identifier, bucket).
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function checkRateLimit(identifier: string, bucket: string, max = 10, windowSec = 60) {
  const cutoff = new Date(Date.now() - windowSec * 1000).toISOString();
  // Hitung request user dalam window aktif
  const { count, error } = await supabaseAdmin
    .from("rate_limit")
    .select("id", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("bucket", bucket)
    .gte("window_start", cutoff);
  if (error) throw new Error("Rate limit lookup failed");
  if ((count ?? 0) >= max) {
    return { ok: false as const, remaining: 0 };
  }
  await supabaseAdmin.from("rate_limit").insert({ identifier, bucket });
  return { ok: true as const, remaining: max - (count ?? 0) - 1 };
}
