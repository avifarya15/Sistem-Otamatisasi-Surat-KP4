# Dokumentasi Teknis Sistem Otomatisasi & Verifikasi Surat KP4

Sistem informasi berbasis web untuk otomatisasi verifikasi data kepegawaian, komputasi Masa Kerja Golongan (MKG) berbasis riwayat TMT, kalkulasi gaji pokok dan tunjangan keluarga mengacu pada **PP No. 5 Tahun 2024** dan **Perpres No. 11 Tahun 2024**, manajemen Kenaikan Gaji Berkala (KGB), serta rendering dokumen kedinasan **Surat Keterangan Untuk Mendapat Pembayaran Tunjangan Keluarga (KP4)** berformat PDF standar A4.

---

## Daftar Isi
1. [Arsitektur Sistem & Spesifikasi Teknologi](#1-arsitektur-sistem--spesifikasi-teknologi)
2. [Struktur Direktori Proyek](#2-struktur-direktori-proyek)
3. [Skema & Desain Basis Data (ERD)](#3-skema--desain-basis-data-erd)
4. [Logika Bisnis & Algoritma Komputasi](#4-logika-bisnis--algoritma-komputasi)
5. [Arsitektur Backend (REST API)](#5-arsitektur-backend-rest-api)
6. [Arsitektur Frontend (SPA React)](#6-arsitektur-frontend-spa-react)
7. [Spesifikasi Lengkap REST API](#7-spesifikasi-lengkap-rest-api)
8. [Mesin Generator PDF (PDFKit)](#8-mesin-generator-pdf-pdfkit)
9. [Keamanan, Sanitasi Data & Audit Trail](#9-keamanan-sanitasi-data--audit-trail)
10. [Konfigurasi Environment & Skrip Operasional](#10-konfigurasi-environment--skrip-operasional)

---

## 1. Arsitektur Sistem & Spesifikasi Teknologi

Sistem menggunakan pola arsitektur **Client-Server terpisah (Decoupled SPA & REST API)**:

```
┌────────────────────────────────────────────────────────┐
│               Frontend Client (SPA)                    │
│   React 18.2 + Vite 5.4 + React Router DOM v6 + Axios  │
│   (Port Default: 5173 / 5174)                          │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JSON / JWT
                            ▼
┌────────────────────────────────────────────────────────┐
│               Backend Server (REST API)                │
│   Node.js v18+ + Express.js 4.18 + Sequelize ORM v6    │
│   (Port Default: 3001)                                 │
├───────────────────────────┬────────────────────────────┤
│   Modul Layanan:          │   Mesin Dokumen:           │
│   - salaryService.js      │   - pdfGenerator.js        │
│   - auth.js (JWT Guard)   │     (PDFKit Engine)        │
└───────────────────────────┬────────────────────────────┘
                            │ SQL Dialect
                            ▼
┌────────────────────────────────────────────────────────┐
│               Lapisan Basis Data                       │
│   - PostgreSQL (Cloud: Supabase / Neon / Railway)      │
│   - PostgreSQL (Localhost via pgAdmin)                 │
│   - SQLite3 (kp4.sqlite - Fallback Lokal)              │
└────────────────────────────────────────────────────────┘
```

### Tabel Spesifikasi Teknologi

| Komponen | Teknologi | Versi | Peran Teknis |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | `>= 18.0.0` | Server runtime asynchronous event-driven |
| **Backend Framework** | Express.js | `^4.18.2` | Penanganan rute HTTP, routing middleware, REST endpoints |
| **ORM** | Sequelize | `^6.37.1` | Abstraksi relasional, validasi model, migrasi skema |
| **Database Engine** | PostgreSQL / SQLite3 | `pg ^8.11.3` / `sqlite3 ^5.1.7` | Multi-dialect persistence (Cloud PostgreSQL / Local SQLite) |
| **PDF Engine** | PDFKit | `^0.13.0` | Pembuatan file PDF kedinasan A4 berbasis stream memori |
| **Enkripsi & Token** | bcryptjs / jsonwebtoken | `^2.4.3` / `^9.0.2` | Hashing password satu arah & stateless JWT authentication |
| **Frontend Framework** | React | `^18.2.0` | Deklaratif UI berbasis virtual DOM dan reactive hooks |
| **Bundler & Tooling**| Vite | `^5.4.21` | Hot Module Replacement (HMR) dan optimalisasi bundle SPA |
| **HTTP Client** | Axios | `^1.6.7` | Client HTTP berbasis Promise dengan interceptor bearer token |
| **Spreadsheet Parser**| xlsx (SheetJS) | `^0.18.5` | Ingest dan ekstraksi tabel gaji resmi dan data ASN |

---

## 2. Struktur Direktori Proyek

```text
kp4-system/
├── client/                                 # Sub-proyek Frontend (SPA React)
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js                    # Konfigurasi base URL & interceptor JWT
│   │   ├── components/
│   │   │   ├── Icon.jsx                    # Komponen SVG Icon seragam
│   │   │   └── Navbar.jsx                  # Header navigasi dinamis (Public/Admin)
│   │   ├── data/
│   │   │   └── tabel_gaji_2024.json        # Database statis tabel gaji PP 5/2024
│   │   ├── pages/
│   │   │   ├── AdminLoginPage.jsx          # Autentikasi pengelola kepegawaian
│   │   │   ├── DashboardPage.jsx           # Master data, modal profil, KGB, pengaturan
│   │   │   ├── LogAktivitasPage.jsx        # Tampilan tabel riwayat jejak audit
│   │   │   └── PegawaiPage.jsx             # Portal mandiri verifikasi, edit profil & cetak
│   │   ├── App.jsx                         # Shell aplikasi & pendaftaran rute
│   │   ├── index.css                       # Design token & utilitas antarmuka
│   │   └── main.jsx                        # Mount DOM React
│   ├── package.json
│   └── vite.config.js
│
├── server/                                 # Sub-proyek Backend (REST API Express)
│   ├── config/
│   │   └── database.js                     # Multi-dialect Sequelize instance connection
│   ├── controllers/
│   │   ├── adminController.js              # CRUD master data, evaluasi KGB, settings
│   │   ├── authController.js               # Login JWT & password matching
│   │   ├── pegawaiController.js            # Validasi mandiri, auto-MKG, profil & checklist
│   │   └── printController.js              # Controller streaming berkas PDF KP4
│   ├── data/
│   │   ├── daftar_gaji_pns_pp5_2024.xlsx   # Matriks acuan PP 5/2024 (Sheet Terstruktur)
│   │   └── tabel_gaji_2024.json            # JSON lookup terindeks golongan & MKG
│   ├── middleware/
│   │   └── auth.js                         # Middleware validasi JWT Bearer token
│   ├── migrations/
│   │   ├── migrasi_agama_kebangsaan.js     # Penambahan kolom agama & kebangsaan
│   │   ├── migrasi_panjang_jabatan.js      # Perluasan panjang VARCHAR jabatan (255)
│   │   └── migrasi_tmt_pangkat.js          # Penambahan kolom tmt_pangkat & mkg_offset
│   ├── models/
│   │   ├── Admin.js                        # Model akun admin
│   │   ├── Anak.js                         # Model anak tanggungan pegawai
│   │   ├── LogAktivitas.js                 # Model jejak audit sistem
│   │   ├── Pasangan.js                     # Model data pasangan (istri/suami)
│   │   ├── Pegawai.js                      # Model master data pegawai
│   │   ├── Pengaturan.js                   # Model parameter dinamis (KGB %, pejabat)
│   │   └── index.js                        # Definisi relasi ORM (Associations & Cascades)
│   ├── routes/
│   │   ├── adminRoutes.js                  # Rute rute terproteksi `/api/admin/*`
│   │   ├── authRoutes.js                   # Rute autentikasi `/api/auth/*`
│   │   └── printRoutes.js                  # Rute portal publik `/api/print/*`
│   ├── seeders/
│   │   ├── analyze_asn_data.js             # Skrip diagnostik parsing dataset ASN
│   │   ├── debug_system_after_migration.js # Verifikasi integritas pasca migrasi
│   │   ├── hapus_data_dummy.js             # Pembersih baris contoh uji
│   │   ├── migrasi_semua_asn.js            # Importer otomatis 5 sheet ASN ke database
│   │   └── seed.js                         # Initial seeder development
│   ├── services/
│   │   ├── pdfGenerator.js                 # Mesin penyusun tata naskah dinas KP4
│   │   └── salaryService.js                # Algoritma komputasi MKG, gaji & tunjangan
│   ├── kp4.sqlite                          # Berkas basis data lokal SQLite (fallback)
│   ├── server.js                           # Entry point server backend
│   └── package.json
│
├── dev.js                                  # Dual-process runner (Express + Vite concurrently)
├── start-dev.bat                           # Skrip bootstrap 1-klik untuk OS Windows
├── package.json                            # Root manifest & orchestrator
└── README.md                               # Dokumentasi teknis sistem
```

---

## 3. Skema & Desain Basis Data (ERD)

Relasi antar-tabel diatur secara relasional dengan integritas referensial:

```
┌─────────────────────────────────┐
│             pegawai             │
├─────────────────────────────────┤
│ PK  nip                VARCHAR  │◄────┐
│     nama               VARCHAR  │     │ 1:N (CASCADE DELETE)
│     tempat_lahir       VARCHAR  │     ├──────────────────────────┐
│     tanggal_lahir      DATE     │     │                          │
│     golongan           VARCHAR  │     │                          │
│     jabatan            VARCHAR  │     │                          │
│     agama              VARCHAR  │     │                          │
│     kebangsaan         VARCHAR  │     │                          │
│     alamat             TEXT     │     │                          │
│     unit_kerja         VARCHAR  │     │                          │
│     gaji_pokok         DECIMAL  │     │                          │
│     tmt_cpns           DATE     │     │                          │
│     tmt_kgb_terakhir   DATE     │     │                          │
│     tmt_pangkat        DATE     │     │                          │
│     mkg_tahun          INTEGER  │     │                          │
│     mkg_bulan          INTEGER  │     │                          │
│     mkg_offset         INTEGER  │     │                          │
│     status_kgb         VARCHAR  │     │                          │
└─────────────────────────────────┘     │                          │
                                        │                          │
                   ┌────────────────────┴──────────┐  ┌────────────┴──────────────────┐
                   │           pasangan            │  │             anak              │
                   ├───────────────────────────────┤  ├───────────────────────────────┤
                   │ PK  id               INTEGER  │  │ PK  id               INTEGER  │
                   │ FK  nip              VARCHAR  │  │ FK  nip              VARCHAR  │
                   │     nama             VARCHAR  │  │     nama             VARCHAR  │
                   │     tempat_lahir     VARCHAR  │  │     tempat_lahir     VARCHAR  │
                   │     tanggal_lahir    DATE     │  │     tanggal_lahir    DATE     │
                   │     pekerjaan        VARCHAR  │  │     status_anak      VARCHAR  │
                   │     tanggal_menikah  DATE     │  │     status_pendidikan VARCHAR │
                   │     penghasilan      DECIMAL  │  └───────────────────────────────┘
                   │     nama_sekolah     VARCHAR  │
                   └───────────────────────────────┘

┌─────────────────────────────────┐               ┌──────────────────────────────────┐
│              admin              │               │            pengaturan            │
├─────────────────────────────────┤               ├──────────────────────────────────┤
│ PK  id                 INTEGER  │◄───┐          │ PK  kunci              VARCHAR   │
│     username           VARCHAR  │    │ 1:N      │     nilai              VARCHAR   │
│     password_hash      VARCHAR  │    │          │     keterangan         VARCHAR   │
│     nama               VARCHAR  │    │          └──────────────────────────────────┘
│     role               VARCHAR  │    │
└─────────────────────────────────┘    │
                                       │
                   ┌───────────────────┴───────────┐
                   │         log_aktivitas         │
                   ├───────────────────────────────┤
                   │ PK  id               INTEGER  │
                   │ FK  admin_id         INTEGER  │
                   │     admin_username   VARCHAR  │
                   │     aksi             VARCHAR  │
                   │     detail           TEXT     │
                   │     ip_address       VARCHAR  │
                   │     timestamp        DATETIME │
                   └───────────────────────────────┘
```

### Rincian Kolom & Constraint Model

#### 1. Tabel `pegawai`
- `nip` (VARCHAR 18, Primary Key): Format 18 digit resmi BKN (`YYYYMMDD YYYYMM G NNN`).
- `nama` (VARCHAR 100, NOT NULL): Nama lengkap pegawai beserta gelar.
- `tempat_lahir` (VARCHAR 50): Kota/kabupaten kelahiran untuk butir 2 formulir KP4.
- `tanggal_lahir` (DATEONLY, NOT NULL): Digunakan sebagai faktor otentikasi portal mandiri.
- `golongan` (VARCHAR 10): Golongan ruang PNS (I/a s.d IV/e) atau PPPK (IX).
- `jabatan` (VARCHAR 255): Nama jabatan struktural atau fungsional.
- `agama` (VARCHAR 30, Nullable): Agama pegawai untuk butir 4 formulir KP4.
- `kebangsaan` (VARCHAR 50, Default: `'Indonesia'`): Butir 5 formulir KP4.
- `alamat` (TEXT, Nullable): Alamat tempat tinggal lengkap untuk butir 11 formulir KP4.
- `unit_kerja` (VARCHAR 150): Instansi penempatan kerja pegawai.
- `gaji_pokok` (DECIMAL 15,2): Nilai nominal gaji pokok aktif.
- `tmt_cpns` (DATEONLY): Tanggal Mulai Tugas pertama sebagai CPNS.
- `tmt_kgb_terakhir` (DATEONLY): Tanggal penetapan kenaikan gaji berkala terakhir.
- `tmt_pangkat` (DATEONLY): Tanggal SK kenaikan pangkat/golongan terakhir aktif.
- `mkg_tahun` (INTEGER, Default: 0): Masa Kerja Golongan (Tahun).
- `mkg_bulan` (INTEGER, Default: 0): Masa Kerja Golongan (Bulan).
- `mkg_offset` (INTEGER, Default: 0): Faktor koreksi tahun masa kerja (potongan golongan).
- `status_kgb` (VARCHAR 20, Default: `'Normal'`): Status evaluasi (`'Normal'` / `'Waktunya KGB'`).

#### 2. Tabel `pasangan`
- `id` (INTEGER, PK, Auto Increment).
- `nip` (VARCHAR 18, FK `pegawai.nip`, ON DELETE CASCADE).
- `nama`, `tempat_lahir`, `tanggal_lahir`, `pekerjaan`, `tanggal_menikah`.
- `penghasilan` (DECIMAL 15,0, Default: 0).
- `nama_sekolah` (VARCHAR 150, Nullable).

#### 3. Tabel `anak`
- `id` (INTEGER, PK, Auto Increment).
- `nip` (VARCHAR 18, FK `pegawai.nip`, ON DELETE CASCADE).
- `nama`, `tempat_lahir`, `tanggal_lahir` (DATEONLY, NOT NULL).
- `status_anak` (VARCHAR 20, Default: `'Kandung'`): Nilai enum: `Kandung`, `Tiri`, `Angkat`.
- `status_pendidikan` (VARCHAR 30): Jenjang pendidikan aktif anak (`Belum Sekolah`, `SD`, `SMP`, `SMA`, `Kuliah`).

#### 4. Tabel `admin` & `log_aktivitas`
- `admin.password_hash` disimpan menggunakan enkripsi *bcrypt* dengan cost factor 10.
- `log_aktivitas` merekam `aksi`, snapshot JSON pada kolom `detail`, `ip_address`, dan `timestamp`.

#### 5. Tabel `pengaturan`
- Kunci `persen_kenaikan_kgb`: Nilai persentase kenaikan KGB (default: `'3.15'`).
- Kunci pejabat penandatangan: `kepala_sub_nama`, `kepala_sub_pangkat`, `kepala_sub_nip`.

---

## 4. Logika Bisnis & Algoritma Komputasi

Seluruh aturan komputasi terpusat pada file [`server/services/salaryService.js`](file:///d:/Download%20game/kp4-system-ui-redesign/kp4-system/server/services/salaryService.js):

### A. Algoritma Komputasi Masa Kerja Golongan (MKG)
Fungsi `hitungMKGOtomatis(tmtPangkat, tmtCpns, mkgOffset = 0)` mengimplementasikan regulasi BKN:

1. **Pemilihan Titik Acuan (Reference Date):**
   - Mengutamakan `tmt_pangkat` (kenaikan pangkat efektif).
   - Jika `tmt_pangkat` kosong, fallback ke `tmt_cpns`.
2. **Kalkulasi Selisih Kalender Presisi:**
   $$\Delta \text{tahun} = \text{tahun}_{\text{kini}} - \text{tahun}_{\text{ref}}$$
   $$\Delta \text{bulan} = \text{bulan}_{\text{kini}} - \text{bulan}_{\text{ref}}$$
   Jika tanggal hari ini $<$ tanggal hari acuan, kurangi 1 bulan.
3. **Penerapan Offset Golongan:**
   $$\text{MKG}_{\text{tahun}} = \max(0, \Delta \text{tahun} + \text{mkgOffset})$$
   $$\text{MKG}_{\text{bulan}} = \max(0, \min(11, \Delta \text{bulan}))$$

### B. Komputasi Total Masa Kerja Pengabdian (TMT CPNS)
Fungsi `hitungMasaKerjaCpns(tmtCpns)` menghitung durasi kumulatif sejak pengangkatan pertama:
- Output mengembalikan objek: `{ totalBulan, tahun, bulan, hari, refDate, valid }`.

### C. Mesin Lookup Gaji Pokok (PP No. 5 Tahun 2024)
Fungsi `getGajiPokok(golongan, mkgTahun, customPersen = null)`:
1. Normalisasi string golongan (misal `3/c`, `3c`, `iii/c` $\rightarrow$ `III/c`).
2. Menghitung index masa kerja genap:
   $$\text{MKG}_{\text{floor}} = \lfloor \text{mkgTahun} / 2 \rfloor \times 2$$
3. Query ke tabel JSON matriks resmi `TABEL_GAJI_OFFICIAL[golongan][mkgTahun]`.
4. Jika tidak tercantum pada tabel resmi, fallback ke formula pertumbuhan eksponensial:
   $$\text{Gaji Pokok} = \text{round} \left( \text{Gaji Dasar}_{\text{Golongan}} \times (1 + r)^{\lfloor \text{mkgTahun} / 2 \rfloor} \right)$$
   di mana $r = 0.0315$ (atau nilai dinamis konfigurasi sistem).

### D. Kalkulasi Tunjangan Keluarga
Fungsi `hitungTunjanganKeluarga(gajiPokok, jumlahPasangan, jumlahAnakTanggungan)`:
- **Tunjangan Suami/Istri (10%):**
  $$\text{Tunjangan Pasangan} = \text{round}(\text{Gaji Pokok} \times 0.10 \times \min(1, \text{jumlahPasangan}))$$
- **Tunjangan Anak (2% per anak, maksimal 2 anak):**
  $$\text{Tunjangan Anak} = \text{round}(\text{Gaji Pokok} \times 0.02 \times \min(2, \text{jumlahAnakTanggungan}))$$
- **Total Penghasilan Bruto:**
  $$\text{Total Bruto} = \text{Gaji Pokok} + \text{Tunjangan Pasangan} + \text{Tunjangan Anak}$$

### E. Evaluasi Siklus Kenaikan Gaji Berkala (KGB)
Fungsi `hitungMasaKerjaDanGaji(golongan, tmtKgbTerakhir, ...)`:
- Menghitung jumlah bulan berjalan sejak `tmt_kgb_terakhir`.
- Jika $\text{bulanBerjalan} \ge 24$ bulan (2 tahun) atau status database bernilai `'Waktunya KGB'`, maka parameter `layakNaik = true`.
- Eksekusi KGB:
  - $\text{mkg\_tahun}_{\text{baru}} = \text{mkg\_tahun} + 2$
  - Pembaruan gaji pokok ke tingkat MKG berikutnya.
  - Reset `tmt_kgb_terakhir = CURRENT_DATE` dan `status_kgb = 'Normal'`.

---

## 5. Arsitektur Backend (REST API)

Backend diorganisasikan ke dalam beberapa lapisan:

```
Request ──► [CORS & express.json()]
                │
                ├──► /api/auth  ──► [authController] ──► [Admin Model]
                │
                ├──► /api/print ──► [pegawaiController] ──► [salaryService] ──► [Pegawai/Pasangan/Anak]
                │               └──► [printController]   ──► [pdfGenerator]   ──► Stream PDF
                │
                └──► /api/admin ──► [authMiddleware (JWT)] ──► [adminController] ──► [All Models]
```

### Middleware Kunci
1. **CORS Dynamic Matcher (`server.js`):** Memvalidasi origin request terhadap daftar `ALLOWED_ORIGINS` di environment serta whitelist localhost (`5173`, `5174`).
2. **JWT Authentication Guard (`middleware/auth.js`):** Memverifikasi header `Authorization: Bearer <token>`, mengurai payload decoded admin, dan menginjeksi objek `req.admin`.
3. **PostgreSQL Sanitizer Handlers (`cleanDate`, `cleanString`, `cleanNumber`):** Mencegah error tipe data PostgreSQL dengan mengubah string kosong `""` menjadi `null` sebelum operasi Sequelize `create` / `update`.

---

## 6. Arsitektur Frontend (SPA React)

Frontend dibangun dengan React 18 menggunakan paradigma fungsional murni (*functional components + hooks*):

### Komponen Halaman & Alur Pengguna

#### 1. `PegawaiPage.jsx` (Portal Layanan Mandiri)
- **State Verifikasi:** Memvalidasi kombinasi NIP 18 digit dan Tanggal Lahir via endpoint `/api/print/validate`.
- **Kalkulasi Reaktif Sisi Klien:** Menghitung estimasi gaji dan tunjangan keluarga menggunakan `useMemo` saat data pegawai berubah.
- **Engine Kelengkapan Data (`kelengkapanData`):**
  Memvalidasi 5 data wajib sebelum diizinkan mencetak surat:
  1. `tmt_pangkat` (TMT Pangkat Terakhir)
  2. `agama` (Agama)
  3. `kebangsaan` (Kewarganegaraan)
  4. `alamat` (Alamat Tempat Tinggal - Butir 11)
  5. `keluarga` (Data Pasangan & Anak beserta atribut wajibnya)
- **Banner Notifikasi Dinamis (`completion-reminder-banner`):**
  Tampil di bagian atas dashboard pegawai dengan gaya visual kartu kuning yang adaptif.
  - Menampilkan judul spesifik sesuai data yang belum lengkap (contoh: *"Data TMT Pangkat Belum Lengkap"* atau *"Data Keluarga Belum Lengkap"*).
  - Menyediakan tombol aksi langsung (`btn-banner-action`) untuk membuka modal pengisian.
- **Proteksi Tombol Cetak:** Tombol unduh surat KP4 dinonaktifkan (`disabled`) secara otomatis jika `!kelengkapanData.siapCetak` dengan cursor `not-allowed` dan tooltip indikator.
- **Modal Moduler:**
  - `SingleProfileEditModal`: Pengisian mandiri TMT Pangkat, Alamat, Agama, dan Kebangsaan.
  - `FamilyModal`: Pengisian dan perbaikan data pasangan dan anak.

#### 2. `DashboardPage.jsx` (Workspace Administrator)
- **Tabel Direktori Pegawai:** Paginasi data (10, 25, 50), pencarian multifilter, indikator status KGB (`Normal` / `Waktunya KGB`), serta kalkulasi MKG real-time.
- **Modal Profil Terintegrasi:** Window pop-up terstruktur untuk meninjau dan mengedit profil pegawai tanpa reload atau scroll halaman.
- **Panel Manajemen Keluarga:** CRUD pasangan dan tanggungan anak langsung dari modal admin.
- **Modul Eksekusi KGB:** Tombol 1-klik untuk memproses kenaikan gaji berkala bagi pegawai yang telah memenuhi siklus 24 bulan.
- **Modal Konfigurasi Sistem:** Pengaturan persentase KGB dan data pejabat penandatangan KP4 dengan *live preview* blok tanda tangan.

#### 3. `LogAktivitasPage.jsx` & `AdminLoginPage.jsx`
- Perekaman audit trail sistem dan form autentikasi admin dengan penyimpanan token ke `localStorage`.

---

## 7. Spesifikasi Lengkap REST API

### A. Rute Publik & Pegawai (`/api/print`)

#### 1. Validasi Identitas Pegawai
- **URL:** `POST /api/print/validate`
- **Auth:** Tidak ada (Publik)
- **Request Body:**
  ```json
  {
    "nip": "198001012005011001",
    "tanggal_lahir": "1980-01-01"
  }
  ```
- **Response (200 OK):** Mengembalikan objek data pegawai, pasangan, anak, kalkulasi `mkg_otomatis_info`, dan `masa_kerja_cpns_info`.
- **Response Error:** `400 Bad Request` (NIP/tgl lahir kosong), `404 Not Found` (Data tidak cocok).

#### 2. Melengkapi Data Profil & Keluarga
- **URL:** `POST /api/print/complete-data`
- **Auth:** Tidak ada (Terverifikasi NIP + Tanggal Lahir)
- **Request Body:**
  ```json
  {
    "nip": "198001012005011001",
    "tanggal_lahir": "1980-01-01",
    "pegawai_update": {
      "tmt_pangkat": "2020-04-01",
      "alamat": "Jl. Basuki Rahmat No. 10, Palu",
      "agama": "Islam",
      "kebangsaan": "Indonesia"
    },
    "pasangan_baru": { "nama": "...", "tanggal_menikah": "..." },
    "anak_baru": [ { "nama": "...", "tanggal_lahir": "..." } ]
  }
  ```
- **Response (200 OK):** Mengembalikan data pegawai ter-update beserta kalkulasi ulang MKG dan Gaji Pokok otomatis.

#### 3. Update Masa Kerja Golongan (Manual)
- **URL:** `POST /api/print/update-mkg`
- **Request Body:** `{ "nip": "...", "tanggal_lahir": "...", "mkg_tahun": 18, "mkg_bulan": 0 }`

#### 4. Generator Berkas PDF KP4
- **URL:** `POST /api/print/generate` atau `GET /api/print/generate?nip=198001012005011001`
- **Response Header:** `Content-Type: application/pdf`, `Content-Disposition: inline; filename=KP4_<nip>.pdf`
- **Response Body:** Binary stream PDF dokumen KP4.

---

### B. Rute Autentikasi Pengelola (`/api/auth`)

#### 1. Login Administrator
- **URL:** `POST /api/auth/login`
- **Request Body:** `{ "username": "admin", "password": "..." }`
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": { "id": 1, "username": "admin", "nama": "Administrator", "role": "super_admin" }
  }
  ```

---

### C. Rute Dashboard Administrator (`/api/admin`)
*Semua endpoint mewajibkan header:* `Authorization: Bearer <token_jwt>`

| Method | Endpoint | Fungsi Teknis |
| :--- | :--- | :--- |
| `GET` | `/api/admin/pegawai` | Query seluruh pegawai beserta array relasi `pasangan` dan `anak` |
| `GET` | `/api/admin/pegawai/:nip` | Detail lengkap satu pegawai |
| `POST` | `/api/admin/pegawai` | Tambah pegawai baru (auto-compute gaji pokok jika dikosongkan) |
| `PUT` | `/api/admin/pegawai/:nip` | Update master data pegawai (sinkronisasi MKG jika TMT diubah) |
| `DELETE` | `/api/admin/pegawai/:nip` | Hapus pegawai beserta seluruh data pasangan & anak (Cascade) |
| `POST` | `/api/admin/pasangan` | Tambah entitas pasangan baru untuk NIP bersangkutan |
| `PUT` | `/api/admin/pasangan/:id` | Update data pasangan berdasarkan ID |
| `DELETE` | `/api/admin/pasangan/:id` | Hapus data pasangan |
| `POST` | `/api/admin/anak` | Tambah entitas anak tanggungan baru |
| `PUT` | `/api/admin/anak/:id` | Update data anak |
| `DELETE` | `/api/admin/anak/:id` | Hapus data anak |
| `GET` | `/api/admin/kgb/eligible` | Query daftar pegawai dengan status KGB aktif / masa kerja $\ge 24$ bulan |
| `POST` | `/api/admin/kgb/process/:nip`| Eksekusi proses KGB (+2 tahun MKG, update gaji pokok, reset status) |
| `GET` | `/api/admin/settings` | Query parameter aktif (persen KGB & pejabat penandatangan) |
| `POST` | `/api/admin/settings` | Update persentase KGB dan/atau data pejabat penandatangan |
| `GET` | `/api/admin/logs` | Query 100 riwayat log aktivitas terbaru |

---

## 8. Mesin Generator PDF (PDFKit)

Implementasi pada [`server/services/pdfGenerator.js`](file:///d:/Download%20game/kp4-system-ui-redesign/kp4-system/server/services/pdfGenerator.js) menyusun lembar dokumen naskah dinas KP4 standar ukuran A4:

1. **Header & Garis Pembatas:**
   - Judul: *SURAT KETERANGAN PENGISIAN PENUNJANGAN PERMINTAAN PEMBAYARAN (KP4)*.
   - Garis horizontal pemisah setebal 1.5 pt.
2. **Daftar Identitas Pegawai (Poin 1–11):**
   - Nama Lengkap, NIP/NIPPPK, TTL, Jenis Kelamin, Agama, Kebangsaan, Pangkat/Golongan, Jabatan, Unit Kerja.
   - Poin 9: Rincian Masa Kerja Golongan (MKG) serta Masa Kerja Tambahan / Seluruhnya.
   - Poin 10: Ketentuan Peraturan Gaji Pokok (PP No. 5 Tahun 2024) dan rincian nominal gaji pokok.
   - Poin 11: Alamat dan tempat tinggal pegawai.
3. **Pernyataan Legalitas Pernikahan & Susunan Keluarga:**
   - Bagian **c**: Identitas istri/suami sah, tanggal lahir, tanggal perkawinan, pekerjaan, penghasilan, dan nama sekolah.
   - Bagian **d**: Jumlah total anak dan tabel daftar tanggungan anak (Nama, TTL, Status: Kandung/Tiri/Angkat, Instansi Pendidikan).
4. **Blok Tanda Tangan Ganda:**
   - Sisi Kanan: Tanda tangan Pegawai yang bersangkutan.
   - Sisi Kiri: Tanda tangan dan legalitas Pejabat yang Berwenang (Kepala Sub Bagian Kepegawaian dan Umum) yang diambil secara dinamis dari tabel `pengaturan`.

---

## 9. Keamanan, Sanitasi Data & Audit Trail

1. **Autentikasi Stateless JWT:** Token ditandatangani dengan secret key dari `JWT_SECRET`, kedaluwarsa dalam 24 jam.
2. **Enkripsi Kredensial:** Password administrator di-hash satu arah menggunakan `bcryptjs` salt rounds 10.
3. **Proteksi Parameter Profil:** Pegawai tidak dapat menimpa data yang telah terkunci di database tanpa melalui verifikasi admin; field yang diizinkan diperbarui secara mandiri dikontrol ketat (`tmt_pangkat`, data keluarga, dan kelengkapan awal).
4. **Pencegahan Error PostgreSQL:** Seluruh string kosong pada input tanggal dan numerik disaring melalui sanitizer helper (`cleanDate`, `cleanNumber`) agar terhindar dari syntax error tipe data PostgreSQL (`invalid input syntax for type date: ""`).
5. **Cascading Relational Integrity:** Constraint foreign key `ON DELETE CASCADE` menjamin pembersihan otomatis relasi anak dan pasangan saat entitas pegawai dihapus.
6. **Audit Trail Logging:** Setiap mutasi data di dashboard admin secara otomatis mengeksekusi `LogAktivitas.create` untuk mendokumentasikan aktor, aksi, payload, dan alamat IP.

---

## 10. Konfigurasi Environment & Skrip Operasional

### Berkas Konfigurasi `.env` (`server/.env`)

```ini
# Port Server Backend
PORT=3001

# Lingkungan Kerja (development / production)
NODE_ENV=development

# Rahasia Token JWT
JWT_SECRET=supersecretkp4key2024!_secure_token

# Whitelist CORS (Pisahkan dengan koma untuk domain frontend production)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

# -------------------------------------------------------------
# Opsi 1: Koneksi PostgreSQL Cloud (Supabase / Neon / Railway)
# -------------------------------------------------------------
# DATABASE_URL=postgres://user:password@host:5432/dbname
# DB_SSL=true

# -------------------------------------------------------------
# Opsi 2: Koneksi PostgreSQL Lokal (pgAdmin)
# -------------------------------------------------------------
# DB_DIALECT=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=kp4_db
# DB_USER=postgres
# DB_PASSWORD=postgres
# DB_SSL=false

# -------------------------------------------------------------
# Opsi 3: SQLite (Default jika DATABASE_URL & DB_DIALECT tidak diatur)
# Berkas otomatis dibuat pada: server/kp4.sqlite
# -------------------------------------------------------------
```

---

### Skrip Operasional & Menjalankan Sistem

#### 1. Instalasi Seluruh Dependensi
```bash
# Dari root direktori proyek:
npm run install:all
```

#### 2. Menjalankan Mode Development (Dual Runner)
```bash
# Menjalankan backend (port 3001) dan frontend (port 5173) secara bersamaan:
npm run dev
```

#### 3. Skrip Migrasi & Perawatan Basis Data (Server)
```bash
# Masuk ke direktori server:
cd server

# Migrasi kolom panjang jabatan ke VARCHAR(255):
node migrations/migrasi_panjang_jabatan.js

# Migrasi penambahan kolom TMT Pangkat & MKG Offset:
node migrations/migrasi_tmt_pangkat.js

# Migrasi kolom agama dan kebangsaan:
node migrations/migrasi_agama_kebangsaan.js

# Menjalankan migrasi massal seluruh data ASN dari file Excel:
node seeders/migrasi_semua_asn.js

# Menghapus data dummy pengujian awal:
node seeders/hapus_data_dummy.js
```

---

### Kredensial Default Sistem

| Portal | URL Akses | Kredensial Pengujian |
| :--- | :--- | :--- |
| **Portal Layanan Mandiri Pegawai** | `http://localhost:5173/` | NIP: `198001012005011001` <br> Tanggal Lahir: `1980-01-01` |
| **Dashboard Pengelola (Admin)** | `http://localhost:5173/admin/login` | Username: `admin` <br> Password: `admin123` |
