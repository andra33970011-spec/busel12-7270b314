// Helper kirim pesan ke Telegram via Lovable Connector Gateway. Server-only.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

export async function tgSendMessage(chatId: number | string, text: string, opts?: { parse_mode?: "HTML" | "Markdown" }) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY tidak dikonfigurasi");
  if (!TELEGRAM_API_KEY) throw new Error("TELEGRAM_API_KEY tidak dikonfigurasi");

  const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: opts?.parse_mode ?? "HTML" }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Telegram sendMessage error:", res.status, data);
    return { ok: false, error: data };
  }
  return { ok: true, data };
}

export async function tgGetMe() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) return null;
  const res = await fetch(`${GATEWAY_URL}/getMe`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const data = await res.json();
  return res.ok ? data.result : null;
}

export function deriveTelegramWebhookSecret(telegramApiKey: string): string {
  // Disinkronkan dengan webhook route. Memakai SHA-256 base64url.
  // Memakai Web Crypto agar kompatibel dengan Worker runtime.
  return ""; // tidak dipakai langsung; route melakukan derivasi sendiri.
}
