import { createFileRoute } from "@tanstack/react-router";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { MapPin, Phone, Mail, Clock, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/kontak")({
  head: () => ({
    meta: [
      { title: "Kontak & LAPOR! — Pemerintah Kabupaten Buton Selatan" },
      { name: "description", content: "Hubungi Pemerintah Kabupaten Buton Selatan atau sampaikan laporan & aspirasi melalui kanal LAPOR!." },
      { property: "og:title", content: "Kontak Pemerintah Kabupaten Buton Selatan" },
      { property: "og:description", content: "Saluran resmi pengaduan dan kontak Pemerintah Kabupaten Buton Selatan." },
    ],
  }),
  component: KontakPage,
});

function KontakPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Kontak & Aspirasi"
        title="Kami mendengar. Kami menindaklanjuti."
        description="Sampaikan laporan, pertanyaan, atau aspirasi Anda. Setiap pesan tercatat dan ditindaklanjuti OPD terkait."
      />

      <section className="container-page py-14">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Info */}
          <div className="space-y-4">
            {[
              { icon: MapPin, title: "Alamat", value: "Balai Kota, Jl. Merdeka No. 1\nKabupaten Buton Selatan 16110" },
              { icon: Phone, title: "Telepon", value: "(021) 555-0100\nHotline: 112" },
              { icon: Mail, title: "Email", value: "info@butonselatan.go.id\npengaduan@butonselatan.go.id" },
              { icon: Clock, title: "Jam Pelayanan", value: "Senin–Jumat: 08.00–16.00\nSabtu: 08.00–12.00" },
            ].map((it) => (
              <div key={it.title} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <it.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{it.title}</div>
                    <div className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{it.value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Form LAPOR! */}
          <form
            onSubmit={(e) => { e.preventDefault(); alert("Laporan terkirim! Tim kami akan menindaklanjuti."); }}
            className="rounded-3xl border border-border bg-card p-8 shadow-elevated lg:col-span-2"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Kanal LAPOR!</h2>
                <p className="text-sm text-muted-foreground">Layanan Aspirasi dan Pengaduan Online Rakyat</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Nama Lengkap"><input required className="input" placeholder="Nama sesuai KTP" /></Field>
              <Field label="NIK"><input required className="input" placeholder="16 digit NIK" /></Field>
              <Field label="Email"><input required type="email" className="input" placeholder="email@contoh.com" /></Field>
              <Field label="No. Telepon"><input required className="input" placeholder="08xx-xxxx-xxxx" /></Field>
              <Field label="Kategori" className="md:col-span-2">
                <select className="input">
                  <option>Infrastruktur & Jalan</option>
                  <option>Kebersihan & Sampah</option>
                  <option>Pelayanan Publik</option>
                  <option>Kesehatan</option>
                  <option>Pendidikan</option>
                  <option>Lainnya</option>
                </select>
              </Field>
              <Field label="Lokasi Kejadian" className="md:col-span-2">
                <input className="input" placeholder="Kelurahan, kecamatan, atau alamat" />
              </Field>
              <Field label="Uraian Laporan" className="md:col-span-2">
                <textarea required rows={5} className="input resize-none" placeholder="Jelaskan secara rinci…" />
              </Field>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Data Anda dilindungi sesuai UU Perlindungan Data Pribadi.</p>
              <button className="inline-flex h-12 items-center rounded-md bg-gradient-primary px-7 text-sm font-semibold text-primary-foreground shadow-soft">
                Kirim Laporan
              </button>
            </div>
          </form>
        </div>
      </section>

      <style>{`
        .input {
          width: 100%;
          border: 1px solid var(--color-border);
          background: var(--color-background);
          border-radius: 0.625rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: var(--color-foreground);
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .input:focus { border-color: var(--color-ring); box-shadow: 0 0 0 3px oklch(0.55 0.16 258 / 0.18); }
      `}</style>
    </PageShell>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
