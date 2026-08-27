# Catatan QA UI/UX KP4

## 27 Agustus 2026

Halaman publik `/` berhasil dirender pada Vite lokal. Hero “Urus surat KP4, lebih sederhana.”, kartu verifikasi, benefit strip, footer, dan navigasi tampil tanpa error visual yang terlihat.

Halaman `/admin/login` berhasil dirender. Panel “Kelola data dengan tenang.”, form kredensial, CTA masuk, dan navigasi global tampil sesuai sistem desain Archipelago Civic.

Build frontend berhasil dengan `vite build` setelah dependensi client dipasang ulang karena binary Rollup yang ada di arsip tidak lengkap. Backend belum dapat dijalankan karena binary native `sqlite3` dari dependency membutuhkan compiler C yang belum tersedia di environment; ini tidak terkait perubahan UI.

## Pemeriksaan route admin

Route dashboard tetap dilindungi oleh token dan mengarahkan sesi yang tidak valid kembali ke login. Console hanya menunjukkan warning React Router dan respons 401 dari token QA simulasi; tidak ada error import atau error render dari komponen UI.

## Dashboard admin end-to-end

Dengan akun seed lokal `admin`, dashboard `/admin/dashboard` berhasil terbuka. Data seed menampilkan 2 pegawai, metric cards, direktori dengan pencarian, tombol buka detail, dan tombol hapus. Navigasi berubah menjadi Data Pegawai, Aktivitas, dan Keluar sesuai state autentikasi.

## Detail dan aktivitas

Panel detail Budi Santoso berhasil dirender dengan seluruh field data dasar, bagian pasangan, dan dua data anak. Halaman `/admin/logs` juga berhasil dirender dengan header audit trail, status terlindungi, dan empty state ketika tidak ada catatan.

## Verifikasi publik end-to-end

Form publik berhasil mengirim NIP `198001012005011001` dan tanggal lahir `1980-01-01`. State sukses menampilkan badge Terverifikasi, data Budi Santoso, data pasangan Dewi Lestari, dua anak, dan tombol Unduh surat KP4.
