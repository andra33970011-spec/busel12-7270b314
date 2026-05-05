import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

async function deriveSecret(apiKey: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(`telegram-webhook:${apiKey}`));
  // base64url
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function tgSend(chatId: number | string, text: string) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY!;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY!;
  await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
        if (!TELEGRAM_API_KEY) return new Response("Not configured", { status: 500 });

        const expected = await deriveSecret(TELEGRAM_API_KEY);
        const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(got, expected)) return new Response("Unauthorized", { status: 401 });

        const update: any = await request.json();
        const message = update.message ?? update.edited_message;
        if (!message?.chat?.id || typeof update.update_id !== "number") {
          return Response.json({ ok: true, ignored: true });
        }

        const chatId = message.chat.id;
        const text: string = message.text ?? "";
        const fromId = message.from?.id;

        // Log
        await supabaseAdmin.from("telegram_messages").upsert(
          {
            update_id: update.update_id,
            chat_id: chatId,
            user_id: fromId ?? null,
            text,
            raw_update: update,
          },
          { onConflict: "update_id" },
        );

        try {
          // === COMMANDS ===
          if (text.startsWith("/start")) {
            const arg = text.slice(6).trim().toUpperCase();
            if (arg) {
              // Pairing dengan akun warga
              const { data: pair } = await supabaseAdmin
                .from("telegram_pairing")
                .select("user_id, expires_at")
                .eq("code", arg)
                .maybeSingle();
              if (!pair) {
                await tgSend(chatId, "❌ Kode pairing tidak valid atau sudah kedaluwarsa. Buat kode baru dari portal.");
              } else if (new Date(pair.expires_at) < new Date()) {
                await tgSend(chatId, "❌ Kode pairing sudah kedaluwarsa. Buat kode baru dari portal.");
              } else {
                // Hapus link lama dengan chat_id yg sama
                await supabaseAdmin.from("telegram_link").delete().eq("chat_id", chatId);
                await supabaseAdmin.from("telegram_link").upsert(
                  {
                    user_id: pair.user_id,
                    chat_id: chatId,
                    username: message.from?.username ?? null,
                    link_code: arg,
                  },
                  { onConflict: "user_id" },
                );
                await supabaseAdmin.from("telegram_pairing").delete().eq("code", arg);
                await tgSend(
                  chatId,
                  "✅ <b>Akun berhasil ditautkan!</b>\nAnda akan menerima notifikasi update permohonan di sini.\n\nKetik <code>/status KODE</code> untuk cek status permohonan.\nKetik <code>/help</code> untuk bantuan.",
                );
              }
            } else {
              await tgSend(
                chatId,
                "👋 <b>Selamat datang di Bot Portal Buton Selatan</b>\n\nPerintah:\n• <code>/status KODE</code> — cek status permohonan\n• <code>/help</code> — bantuan\n\nUntuk menerima notifikasi otomatis, buka portal → Profil/Permohonan → Hubungkan Telegram.",
              );
            }
          } else if (text.startsWith("/help")) {
            await tgSend(
              chatId,
              "ℹ️ <b>Bantuan</b>\n\n• <code>/status PRM-2026-XXXXXX</code> — cek status permohonan\n• <code>/unlink</code> — putuskan tautan akun\n\nNotifikasi otomatis aktif setelah Anda menautkan akun dari portal.",
            );
          } else if (text.startsWith("/status")) {
            const kode = text.slice(7).trim().toUpperCase();
            if (!kode) {
              await tgSend(chatId, "Format: <code>/status PRM-2026-XXXXXX</code>");
            } else {
              const { data: p } = await supabaseAdmin
                .from("permohonan")
                .select("kode, judul, status, kategori, tanggal_masuk, tenggat, opd_id, pemohon_id")
                .eq("kode", kode)
                .maybeSingle();
              if (!p) {
                await tgSend(chatId, `❌ Permohonan dengan kode <code>${escapeHtml(kode)}</code> tidak ditemukan.`);
              } else {
                // Cek bahwa pengirim adalah pemohonnya (jika sudah terlink)
                const { data: link } = await supabaseAdmin
                  .from("telegram_link")
                  .select("user_id")
                  .eq("chat_id", chatId)
                  .maybeSingle();
                if (!link || link.user_id !== p.pemohon_id) {
                  await tgSend(chatId, "❌ Anda tidak berhak melihat permohonan ini. Tautkan akun terlebih dulu dari portal.");
                } else {
                  const { data: opd } = await supabaseAdmin.from("opd").select("nama").eq("id", p.opd_id).maybeSingle();
                  const statusLabel: Record<string, string> = { baru: "Baru", diproses: "Diproses", selesai: "Selesai ✅", ditolak: "Ditolak ❌" };
                  const out = [
                    `📋 <b>${escapeHtml(p.kode)}</b>`,
                    `<b>Judul:</b> ${escapeHtml(p.judul)}`,
                    `<b>Status:</b> ${escapeHtml(statusLabel[p.status] ?? p.status)}`,
                    `<b>Kategori:</b> ${escapeHtml(p.kategori)}`,
                    opd ? `<b>OPD:</b> ${escapeHtml(opd.nama)}` : "",
                    `<b>Diajukan:</b> ${new Date(p.tanggal_masuk).toLocaleDateString("id-ID")}`,
                    p.tenggat ? `<b>Tenggat:</b> ${new Date(p.tenggat).toLocaleDateString("id-ID")}` : "",
                  ].filter(Boolean).join("\n");
                  await tgSend(chatId, out);
                }
              }
            }
          } else if (text.startsWith("/unlink")) {
            const { data: del } = await supabaseAdmin
              .from("telegram_link")
              .delete()
              .eq("chat_id", chatId)
              .select("id");
            if (del && del.length > 0) {
              await tgSend(chatId, "✅ Tautan akun telah diputus. Anda tidak akan menerima notifikasi lagi.");
            } else {
              await tgSend(chatId, "Tidak ada akun yang tertaut dengan chat ini.");
            }
          } else if (text) {
            await tgSend(chatId, "Perintah tidak dikenal. Ketik <code>/help</code> untuk bantuan.");
          }
        } catch (e) {
          console.error("Telegram webhook handler error:", e);
        }

        return Response.json({ ok: true });
      },
    },
  },
});
