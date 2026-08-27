# KP4 · UI/UX Redesign

Redesain ini menggunakan arah visual **Archipelago Civic**: biru malam, putih gading, teal, dan terracotta dengan tipografi Plus Jakarta Sans + DM Sans. Tujuannya adalah membuat layanan KP4 terasa lebih modern, tenang, mudah dipindai, dan tetap formal.

## Perubahan utama

Halaman publik sekarang memiliki hero yang lebih komunikatif, kartu verifikasi yang fokus, indikator keamanan, benefit strip, dan hasil data yang dikelompokkan dengan jelas. Halaman admin memiliki shell navigasi responsif, metric cards, direktori pegawai dengan pencarian, detail pegawai, serta pengelolaan pasangan dan anak dengan pola kartu/form yang konsisten. Halaman login dan log aktivitas juga mengikuti sistem visual yang sama.

Logika API dan route bisnis dipertahankan. Perubahan utama berada di `client/src/index.css`, `client/src/components/Icon.jsx`, `client/src/components/Navbar.jsx`, dan halaman di `client/src/pages/`.

## Menjalankan lokal

```bash
cd client
npm install
npm run dev
```

Backend dijalankan di terminal lain:

```bash
cd server
npm install
node server.js
```

Frontend mengarah ke API `http://localhost:3001/api`, sesuai konfigurasi awal proyek.
