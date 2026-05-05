import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";
import lambang from "@/assets/lambang.png";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <img src={lambang} alt="Lambang" width={44} height={44} className="h-11 w-11" loading="lazy" />
            <div>
              <div className="font-display text-lg font-bold">Pemerintah Kabupaten Buton Selatan</div>
              <div className="text-xs text-muted-foreground">Melayani dengan integritas & data</div>
            </div>
          </div>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Situs resmi pemusatan pelayanan publik dan data terintegrasi Kabupaten Buton Selatan. Transparan, terpadu, dan dapat diakses kapan saja.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-foreground">Tautan</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/layanan" className="hover:text-primary">Layanan Publik</Link></li>
            <li><Link to="/data" className="hover:text-primary">Satu Data</Link></li>
            <li><Link to="/berita" className="hover:text-primary">Berita & Pengumuman</Link></li>
            <li><Link to="/tentang" className="hover:text-primary">Profil Pemerintah</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-foreground">Kontak</h4>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2"><MapPin className="h-4 w-4 mt-0.5 text-primary" /><span>Jl. Gajah Mada, Kabupaten Buton Selatan</span></li>
            <li className="flex gap-2"><Phone className="h-4 w-4 mt-0.5 text-primary" /><span>(021) 555-0100</span></li>
            <li className="flex gap-2"><Mail className="h-4 w-4 mt-0.5 text-primary" /><span>info@butonselatankab.go.id</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page py-5 text-center text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Pemerintah Kabupaten Buton Selatan. Hak Cipta Dilindungi.</span>
        </div>
      </div>
    </footer>
  );
}
