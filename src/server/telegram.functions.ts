import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { tgSendMessage } from "./telegram.server";

// --- Pairing: warga generate kode untuk dimasukkan ke bot Telegram ---
export const createTelegramPairing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    // Hapus kode lama milik user ini
    await supabaseAdmin.from("telegram_pairing").delete().eq("user_id", userId);
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabaseAdmin.from("telegram_pairing").insert({ code, user_id: userId });
    if (error) throw new Error(error.message);
    return { code };
  });

export const getTelegramLink = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("telegram_link").select("chat_id, username, linked_at").eq("user_id", userId).maybeSingle();
    return { link: data ?? null };
  });

export const unlinkTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("telegram_link").delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Notifikasi: dipanggil setelah insert/update permohonan ---
export const notifyPermohonanBaru = createServerFn({ method: "POST" })
  .inputValidator(z.object({ permohonanId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { data: p } = await supabaseAdmin
      .from("permohonan")
      .select("id, kode, judul, kategori, opd_id, prioritas, tenggat")
      .eq("id", data.permohonanId)
      .maybeSingle();
    if (!p) return { ok: false, reason: "permohonan_not_found" };

    const { data: opd } = await supabaseAdmin.from("opd").select("nama, singkatan").eq("id", p.opd_id).maybeSingle();
    const { data: chats } = await supabaseAdmin
      .from("telegram_opd_chat")
      .select("chat_id")
      .eq("opd_id", p.opd_id)
      .eq("aktif", true);

    if (!chats || chats.length === 0) return { ok: true, sent: 0 };

    const text = [
      `🆕 <b>Permohonan Baru</b>`,
      `<b>Kode:</b> ${escapeHtml(p.kode)}`,
      `<b>Judul:</b> ${escapeHtml(p.judul)}`,
      `<b>Kategori:</b> ${escapeHtml(p.kategori)}`,
      `<b>Prioritas:</b> ${escapeHtml(p.prioritas)}`,
      opd ? `<b>OPD:</b> ${escapeHtml(opd.nama)}` : "",
      p.tenggat ? `<b>Tenggat:</b> ${new Date(p.tenggat).toLocaleDateString("id-ID")}` : "",
    ].filter(Boolean).join("\n");

    let sent = 0;
    for (const c of chats) {
      const r = await tgSendMessage(c.chat_id, text);
      if (r.ok) sent++;
    }
    return { ok: true, sent };
  });

export const notifyStatusChange = createServerFn({ method: "POST" })
  .inputValidator(z.object({ permohonanId: z.string().uuid(), catatan: z.string().optional() }))
  .handler(async ({ data }) => {
    const { data: p } = await supabaseAdmin
      .from("permohonan")
      .select("id, kode, judul, status, pemohon_id")
      .eq("id", data.permohonanId)
      .maybeSingle();
    if (!p) return { ok: false };

    const { data: link } = await supabaseAdmin
      .from("telegram_link")
      .select("chat_id")
      .eq("user_id", p.pemohon_id)
      .maybeSingle();
    if (!link) return { ok: true, sent: 0 };

    const statusLabel: Record<string, string> = { baru: "Baru", diproses: "Diproses", selesai: "Selesai ✅", ditolak: "Ditolak ❌" };
    const text = [
      `📩 <b>Update Permohonan</b>`,
      `<b>Kode:</b> ${escapeHtml(p.kode)}`,
      `<b>Judul:</b> ${escapeHtml(p.judul)}`,
      `<b>Status:</b> ${escapeHtml(statusLabel[p.status] ?? p.status)}`,
      data.catatan ? `\n<i>Catatan petugas:</i>\n${escapeHtml(data.catatan)}` : "",
    ].filter(Boolean).join("\n");

    const r = await tgSendMessage(link.chat_id, text);
    return { ok: r.ok, sent: r.ok ? 1 : 0 };
  });

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
