// src/lib/kinerja-queries.ts
import { supabase } from "@/integrations/supabase/client";
import type { StatusPermohonan } from "./permohonan";

export type OpdKinerja = {
  opd_id: string;
  opd_nama: string;
  opd_singkatan: string;
  total_permohonan: number;
  status_counts: Record<StatusPermohonan, number>;
  rata_hari_selesai: number | null;
  rata_rating: number | null;
  tepat_waktu_persen: number | null;
};

export async function fetchAllOpdKinerja(): Promise<OpdKinerja[]> {
  // 1. Ambil semua OPD
  const { data: opds, error: opdError } = await supabase
    .from("opd")
    .select("id, nama, singkatan");
  if (opdError) throw opdError;

  // 2. Ambil semua permohonan dengan tenggat (SLA aktual yang dihitung saat pengajuan)
  const { data: permohonan, error: pError } = await supabase
    .from("permohonan")
    .select(`
      id,
      opd_id,
      status,
      tanggal_masuk,
      updated_at,
      tenggat
    `)
    .limit(10000);
  if (pError) throw pError;

  // 3. Ambil semua rating
  const { data: ratings, error: rError } = await supabase
    .from("permohonan_rating")
    .select("permohonan_id, skor");
  if (rError && rError.code !== "PGRST116") {
    console.warn("Tabel permohonan_rating belum ada, rating diabaikan");
  }

  const ratingsMap = new Map<string, number>();
  if (ratings) {
    for (const r of ratings) {
      ratingsMap.set(r.permohonan_id, r.skor);
    }
  }

  // 4. Proses per OPD
  const result: OpdKinerja[] = opds.map((opd) => {
    const permohonanOpd = permohonan?.filter((p) => p.opd_id === opd.id) || [];

    const status_counts: Record<StatusPermohonan, number> = {
      baru: 0,
      diproses: 0,
      selesai: 0,
      ditolak: 0,
    };
    let totalHariSelesai = 0;
    let jumlahSelesai = 0;
    let totalRating = 0;
    let jumlahRating = 0;
    let tepatWaktu = 0;
    let selesaiDenganSLA = 0;

    for (const p of permohonanOpd) {
      if (p.status in status_counts) status_counts[p.status as StatusPermohonan]++;

      const skor = ratingsMap.get(p.id);
      if (skor) {
        totalRating += skor;
        jumlahRating++;
      }

      if (p.status === "selesai" && p.tanggal_masuk && p.updated_at) {
        const ms = new Date(p.updated_at).getTime() - new Date(p.tanggal_masuk).getTime();
        const hari = ms / (1000 * 3600 * 24);
        if (!isNaN(hari) && hari >= 0) {
          totalHariSelesai += hari;
          jumlahSelesai++;

          // Tepat waktu = selesai (updated_at) tidak melewati tenggat permohonan
          if (p.tenggat) {
            const selesaiTs = new Date(p.updated_at).getTime();
            const tenggatTs = new Date(p.tenggat).getTime();
            if (selesaiTs <= tenggatTs) tepatWaktu++;
            selesaiDenganSLA++;
          }
        }
      }
    }

    const rata_hari_selesai = jumlahSelesai > 0 ? totalHariSelesai / jumlahSelesai : null;
    const rata_rating = jumlahRating > 0 ? totalRating / jumlahRating : null;
    const tepat_waktu_persen = selesaiDenganSLA > 0 ? (tepatWaktu / selesaiDenganSLA) * 100 : null;

    return {
      opd_id: opd.id,
      opd_nama: opd.nama,
      opd_singkatan: opd.singkatan,
      total_permohonan: permohonanOpd.length,
      status_counts,
      rata_hari_selesai,
      rata_rating,
      tepat_waktu_persen,
    };
  });

  return result;
}
