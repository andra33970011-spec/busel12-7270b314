INSERT INTO public.layanan_publik (judul, slug, deskripsi, ikon, persyaratan, alur, aktif, urutan)
VALUES
(
  'Pengaduan & Partisipasi Warga',
  'pengaduan-partisipasi-warga',
  'Sampaikan aduan, aspirasi, dan usulan pembangunan melalui kanal LAPOR! terintegrasi, survei kepuasan layanan, serta Musrenbang online.',
  'Megaphone',
  E'- KTP elektronik warga Buton Selatan\n- Nomor HP aktif untuk verifikasi\n- Deskripsi aduan/usulan yang jelas\n- Lampiran foto/dokumen pendukung (opsional)',
  E'1. Pilih kanal: LAPOR!, Survei, atau Musrenbang\n2. Isi formulir pengaduan/usulan secara lengkap\n3. Sistem memberikan nomor tiket pelacakan\n4. OPD terkait menindaklanjuti maksimal 5 hari kerja\n5. Pelapor menerima notifikasi status dan tanggapan',
  true,
  10
),
(
  'Pertanahan & Properti',
  'pertanahan-properti',
  'Layanan pengecekan status tanah, pembayaran PBB online, serta informasi tata ruang wilayah (RTRW) Kabupaten Buton Selatan.',
  'MapPin',
  E'- KTP pemilik/wajib pajak\n- NOP (Nomor Objek Pajak) untuk PBB\n- Sertifikat tanah/girik untuk pengecekan\n- Surat kuasa bila diwakilkan',
  E'1. Pilih jenis layanan: Cek Tanah / PBB / Info RTRW\n2. Masukkan NOP atau koordinat lokasi\n3. Verifikasi data oleh petugas Bapenda/ATR\n4. Pembayaran online (untuk PBB) via virtual account\n5. Bukti & dokumen digital terkirim ke email',
  true,
  11
),
(
  'Pariwisata & Budaya',
  'pariwisata-budaya',
  'Jelajahi katalog destinasi wisata, kalender event daerah, dan booking homestay/penginapan lokal di Kabupaten Buton Selatan.',
  'Palmtree',
  E'- Identitas pengunjung (KTP/Paspor)\n- Nomor HP/email aktif untuk konfirmasi booking\n- Pembayaran via transfer atau e-wallet\n- Mematuhi protokol & aturan destinasi',
  E'1. Telusuri destinasi atau event di katalog\n2. Pilih tanggal kunjungan & jumlah peserta\n3. Booking homestay/tiket masuk online\n4. Lakukan pembayaran melalui kanal resmi\n5. E-ticket/voucher dikirim, tunjukkan saat kunjungan',
  true,
  12
);