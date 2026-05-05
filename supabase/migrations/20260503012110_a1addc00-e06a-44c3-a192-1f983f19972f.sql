-- Tambah kolom SLA per layanan publik (default 14 hari)
ALTER TABLE public.layanan_publik
  ADD COLUMN IF NOT EXISTS sla_hari integer NOT NULL DEFAULT 14;

-- Bersihkan layanan yang sudah ada agar tidak duplikat saat seed
DELETE FROM public.layanan_publik;

-- Seed layanan nyata yang banyak dibutuhkan masyarakat Buton Selatan
INSERT INTO public.layanan_publik (judul, slug, deskripsi, ikon, opd_id, persyaratan, alur, aktif, urutan, sla_hari)
VALUES
-- Disdukcapil
('Penerbitan Kartu Keluarga (KK)', 'penerbitan-kartu-keluarga',
 'Penerbitan atau perubahan Kartu Keluarga karena pernikahan, kelahiran, kematian, perpindahan, atau pisah KK.', 'Users',
 'c8bbce05-b8b2-4b3b-8146-3421c6e97e28',
 E'Surat Pengantar RT/RW\nKK lama (asli)\nFotokopi KTP-el seluruh anggota keluarga\nDokumen pendukung perubahan (akta nikah/cerai/lahir/kematian/SKPWNI)\nSurat keterangan pindah datang (jika dari luar daerah)',
 E'Pemohon mengajukan berkas\nVerifikasi berkas oleh petugas\nPerekaman & pencetakan KK\nPenyerahan KK kepada pemohon',
 true, 1, 7),

('Penerbitan KTP Elektronik (KTP-el)', 'penerbitan-ktp-elektronik',
 'Perekaman dan pencetakan KTP elektronik untuk WNI berusia 17 tahun ke atas atau yang sudah/pernah menikah.', 'IdCard',
 'c8bbce05-b8b2-4b3b-8146-3421c6e97e28',
 E'Fotokopi Kartu Keluarga\nSurat pengantar dari kelurahan/desa\nKTP lama (jika perpanjangan/penggantian)\nSurat keterangan kehilangan dari kepolisian (jika hilang)\nPas foto 3x4 latar belakang merah (1 lembar)',
 E'Pengambilan nomor antrian\nPerekaman biometrik (sidik jari, iris, tanda tangan)\nVerifikasi data oleh petugas\nPencetakan dan penyerahan KTP-el',
 true, 2, 14),

('Penerbitan Akta Kelahiran', 'penerbitan-akta-kelahiran',
 'Pencatatan kelahiran dan penerbitan kutipan akta kelahiran untuk anak warga Kabupaten Buton Selatan.', 'Baby',
 'c8bbce05-b8b2-4b3b-8146-3421c6e97e28',
 E'Surat keterangan lahir dari bidan/dokter/RS/puskesmas\nFotokopi Kartu Keluarga orang tua\nFotokopi KTP-el kedua orang tua\nFotokopi buku/akta nikah orang tua\nFotokopi KTP-el 2 orang saksi',
 E'Pengajuan berkas ke Disdukcapil\nVerifikasi & validasi data\nPenerbitan kutipan akta kelahiran\nPenyerahan akta kepada pemohon',
 true, 3, 5),

('Penerbitan Akta Kematian', 'penerbitan-akta-kematian',
 'Pencatatan dan penerbitan akta kematian untuk warga yang telah meninggal dunia.', 'FileMinus',
 'c8bbce05-b8b2-4b3b-8146-3421c6e97e28',
 E'Surat keterangan kematian dari rumah sakit/puskesmas/dokter\nSurat keterangan kematian dari kelurahan/desa\nFotokopi KK & KTP-el almarhum/almarhumah\nFotokopi KK & KTP-el pelapor\nFotokopi KTP-el 2 orang saksi',
 E'Pelapor mengajukan berkas\nVerifikasi data oleh petugas\nPencatatan dan penerbitan akta\nPenyerahan akta dan KK terbaru',
 true, 4, 5),

-- Dinas Kesehatan
('Surat Keterangan Sehat', 'surat-keterangan-sehat',
 'Pemeriksaan kesehatan dasar dan penerbitan surat keterangan sehat untuk keperluan pendidikan, pekerjaan, atau administrasi.', 'Stethoscope',
 'a5f3e57d-0354-411f-8f8d-2c83a5b6d8b4',
 E'Fotokopi KTP-el / Kartu Pelajar\nPas foto 3x4 (1 lembar)\nBukti pembayaran retribusi (jika ada)',
 E'Pendaftaran di puskesmas/RS\nPemeriksaan tekanan darah, tinggi/berat badan\nPemeriksaan dokter\nPenerbitan surat keterangan sehat',
 true, 5, 1),

('Pendaftaran BPJS Kesehatan PBI Daerah', 'pendaftaran-bpjs-pbi-daerah',
 'Pendaftaran masyarakat tidak mampu sebagai Penerima Bantuan Iuran (PBI) jaminan kesehatan yang dibiayai APBD.', 'HeartHandshake',
 'a5f3e57d-0354-411f-8f8d-2c83a5b6d8b4',
 E'Fotokopi Kartu Keluarga\nFotokopi KTP-el seluruh anggota keluarga\nSurat keterangan tidak mampu (SKTM) dari desa/kelurahan\nSurat pengantar dari RT/RW\nFoto rumah tampak depan & dalam',
 E'Pengajuan berkas ke Dinas Kesehatan\nVerifikasi data & survey lapangan\nPenetapan sebagai peserta PBI Daerah\nAktivasi kartu BPJS',
 true, 6, 21),

-- DPMPTSP
('Nomor Induk Berusaha (NIB) UMKM', 'nomor-induk-berusaha-umkm',
 'Pendampingan penerbitan NIB melalui sistem OSS-RBA untuk pelaku UMKM agar usaha legal dan dapat akses pembiayaan.', 'Briefcase',
 '77de9e98-4f44-4a9c-bbbd-00cd76b86de6',
 E'Fotokopi KTP-el pemilik usaha\nFotokopi NPWP (jika ada)\nNomor HP & email aktif\nData usaha (alamat, jenis, modal)\nFoto lokasi usaha',
 E'Konsultasi & pendampingan di MPP/DPMPTSP\nPengisian data di sistem OSS-RBA\nPenerbitan NIB elektronik\nPenyerahan dokumen NIB ke pelaku usaha',
 true, 7, 3),

('Izin Mendirikan Bangunan / PBG', 'izin-pbg',
 'Persetujuan Bangunan Gedung (PBG) untuk pembangunan, renovasi, atau perubahan fungsi bangunan.', 'Building',
 '77de9e98-4f44-4a9c-bbbd-00cd76b86de6',
 E'Fotokopi KTP-el pemohon\nFotokopi sertifikat tanah / bukti kepemilikan\nGambar rencana bangunan (denah, tampak, potongan)\nPerhitungan struktur (untuk bangunan >2 lantai)\nSurat pernyataan tidak sengketa\nIMB/PBG lama (jika renovasi)',
 E'Pendaftaran di SIMBG\nVerifikasi dokumen teknis\nPenilaian oleh tim teknis (TPA/TPT)\nPenerbitan PBG dan SLF',
 true, 8, 28),

-- Dinas Perhubungan
('Uji KIR Kendaraan Bermotor', 'uji-kir-kendaraan',
 'Pengujian berkala kendaraan bermotor wajib uji (angkutan barang/penumpang) untuk memastikan laik jalan.', 'Truck',
 'ee2bc5b7-3ccc-4487-bb49-9e1b2cfef475',
 E'Fotokopi STNK & BPKB\nFotokopi KTP pemilik\nBuku uji (KIR) lama\nKendaraan dibawa ke lokasi pengujian',
 E'Pendaftaran & pembayaran retribusi\nPemeriksaan administrasi\nPengujian teknis kendaraan\nPenerbitan buku uji & tanda samping',
 true, 9, 2),

-- Dinas Pariwisata
('Pendaftaran Usaha Pariwisata (TDUP)', 'pendaftaran-usaha-pariwisata',
 'Pendaftaran Tanda Daftar Usaha Pariwisata untuk hotel, homestay, restoran, agen wisata, dan usaha terkait.', 'Palmtree',
 '12d270cc-ecb1-44e5-b603-90b8c382e8c6',
 E'Fotokopi KTP-el pemilik / penanggung jawab\nNIB dari sistem OSS\nDokumen legalitas usaha (akta pendirian jika badan usaha)\nFoto lokasi usaha (luar & dalam)\nDenah lokasi usaha',
 E'Pengajuan berkas ke Dinas Pariwisata\nVerifikasi & survey lokasi\nPenerbitan TDUP\nPembinaan dan pengawasan berkala',
 true, 10, 14);
