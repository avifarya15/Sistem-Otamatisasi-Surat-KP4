# 🏛️ Sistem Otomatisasi & Verifikasi Surat KP4 PNS

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PDFKit](https://img.shields.io/badge/PDFKit-0.13-E72424?logo=adobe-acrobat-reader&logoColor=white)](https://pdfkit.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Aplikasi web modern untuk layanan mandiri verifikasi data kepegawaian, simulasi masa kerja & tunjangan keluarga, serta pencetakan otomatis **Surat Keterangan Untuk Mendapat Pembayaran Tunjangan Keluarga (KP4)** Pegawai Negeri Sipil (PNS) berdasarkan regulasi **PP No. 5 Tahun 2024** dan **Perpres No. 11 Tahun 2024**.

Dilengkapi dengan portal publik untuk pegawai melakukan pengecekan data mandiri dan unduh dokumen resmi format PDF, serta portal dashboard admin terproteksi dengan modul evaluasi **Kenaikan Gaji Berkala (KGB)** otomatis, manajemen keluarga, dan audit trail aktivitas.

---

## 📑 Dokumentasi Resmi Proyek

| Dokumen | Tautan | Deskripsi |
| :--- | :--- | :--- |
| **Software Requirements Specification (SRS)** | [📄 **SRS.md**](./SRS.md) | Dokumen spesifikasi kebutuhan perangkat lunak komprehensif mengacu pada standar IEEE 830 / ISO 29148. |
| **Panduan Redesain UI/UX** | [🎨 **UI-REDESIGN.md**](./UI-REDESIGN.md) | Penjelasan filosofi desain *Archipelago Civic*, tipografi, token warna, dan ergonomi visual antarmuka. |
| **Catatan QA & Pengujian** | [🧪 **QA-notes.md**](./QA-notes.md) | Catatan verifikasi pengujian fungsional dan peninjauan kualitas tampilan sistem. |

---

## 🌟 Fitur Utama Sistem

### 1. 🌐 Portal Publik (Layanan Mandiri Pegawai)
- **Verifikasi Cepat & Presisi:** Validasi identitas pegawai menggunakan kombinasi aman **NIP (18 Digit)** dan **Tanggal Lahir**.
- **Penyesuaian Interaktif Masa Kerja (MKG):** Pegawai dapat menyesuaikan masa kerja golongan (tahun & bulan) dengan pembaruan kalkulasi gaji pokok seketika dan opsi simpan langsung ke database.
- **Kalkulasi Tunjangan Keluarga Otomatis:**
  - **Gaji Pokok:** Dihitung otomatis berdasarkan golongan ruang (I/a s.d IV/e dan IX) dan masa kerja (PP No. 5/2024).
  - **Tunjangan Pasangan:** 10% dari gaji pokok (maksimal 1 pasangan sah).
  - **Tunjangan Anak:** 2% dari gaji pokok per anak (maksimal 2 anak tanggungan).
  - **Penghasilan Bruto:** Total komputasi gaji pokok ditambah seluruh tunjangan keluarga.
- **Preview Data Terintegrasi:** Menampilkan rincian data kepegawaian, susunan pasangan, dan tabel tanggungan anak beserta status pendidikan.
- **Unduh Dokumen PDF Instan:** Generator PDF satu klik untuk mengunduh dokumen resmi KP4 yang telah terisi lengkap dan siap ditandatangani.

### 2. 🛡️ Portal Administrator (Workspace Pengelola Kepegawaian)
- **Sistem Autentikasi Terproteksi:** Login admin berbasis token JWT (*JSON Web Token*) dengan enkripsi password *bcrypt*.
- **Metrik & Ringkasan Data:** Indikator total pegawai terdaftar dan notifikasi pegawai yang memasuki periode KGB.
- **Direktori & Pencarian Cepat:** Pencarian instan multifilter berdasarkan Nama, NIP, atau Unit Kerja.
- **Manajemen Pegawai (CRUD):** Tambah pegawai baru, ubah rincian kepegawaian (NIP, nama, TTL, golongan, jabatan, unit kerja, gaji pokok, TMT CPNS, TMT KGB, MKG), dan hapus data.
- **Kalkulasi Otomatis Saat Input:** Bila gaji pokok dikosongkan saat input pegawai, sistem mengkalkulasi nominal awal otomatis sesuai golongan dan masa kerja.
- **Manajemen Data Pasangan:** Tambah, edit, dan hapus pasangan pegawai (nama, TTL, pekerjaan/NIP, tanggal pernikahan).
- **Manajemen Tanggungan Anak:** Tambah, edit, dan hapus data anak (nama, TTL, status anak: *Kandung / Tiri / Angkat*, dan status pendidikan).
- **Integritas Data Cascading:** Penghapusan data pegawai otomatis membersihkan seluruh riwayat pasangan dan anak terkait.

### 3. ⚡ Otomasi Kenaikan Gaji Berkala (KGB)
- **Deteksi Otomatis Kelayakan KGB:** Sistem memindai pegawai yang telah memenuhi siklus 2 tahun (24 bulan) masa kerja berdasarkan selisih `tmt_kgb_terakhir` dengan tanggal berjalan atau berstatus `'Waktunya KGB'`.
- **Eksekusi 1-Klik:** Memproses kenaikan pangkat/gaji secara instan:
  - Menambah Masa Kerja Golongan (`mkg_tahun`) sebanyak **+2 Tahun**.
  - Mengkalkulasi penyesuaian gaji pokok baru sesuai tabel acuan dan rasio kenaikan persentase.
  - Memperbarui `tmt_kgb_terakhir` ke tanggal hari ini dan mereset status ke `'Normal'`.
  - Menghitung ulang proyeksi kenaikan tunjangan keluarga.

### 4. ⚙️ Pengaturan Parameter Dinamis
- **Konfigurasi Persentase Kenaikan KGB:** Administrator dapat menyesuaikan nilai persentase kenaikan gaji berkala (standar: 3,15%) yang tersimpan persisten pada tabel pengaturan sistem tanpa mengubah kode program.

### 5. 📜 Audit Trail & Log Aktivitas
- **Perekaman Otomatis:** Setiap mutasi data (tambah, ubah, hapus pegawai/pasangan/anak, proses KGB, dan perubahan konfigurasi) otomatis terekam ke basis data.
- **Informasi Jejak Lengkap:** Mencatat stempel waktu (*timestamp*), username admin pelaksana, tipe aktivitas, snapshot detail payload perubahan, dan alamat IP.
- **Antarmuka Riwayat:** Menampilkan 100 log transaksi terbaru pada halaman audit terlindungi.

### 6. 🖨️ Automated PDF Engine (PDFKit)
- Pembuatan dokumen PDF ukuran A4 presisi sesuai standar tata naskah dinas KP4:
  - **Kop & Header:** Judul resmi formulir penunjangan pembayaran.
  - **Bagian I:** Data Pokok Pegawai (NIP, Golongan, Jabatan, Unit Kerja, MKG, Gaji Pokok).
  - **Bagian II:** Data Pasangan (Suami/Istri, TTL, Pekerjaan, Tanggal Menikah).
  - **Bagian III:** Tabel Susunan Anak & Keterangan Status Pendidikan.
  - **Bagian Penutup:** Kolom legalitas tanda tangan Kepala Satuan Kerja dan Pegawai bersangkutan.

---

## 🛠️ Arsitektur & Teknologi

| Lapisan | Teknologi / Pustaka | Peran & Deskripsi |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 5, React Router DOM v6, Axios | *Single Page Application* (SPA) dengan performa cepat |
| **UI/UX System** | Custom Design System (*Archipelago Civic*), CSS3 | Palet Civic Night, Ivory, Teal, & Terracotta |
| **Backend API** | Node.js, Express.js 4 | RESTful Web Services & Middleware Architecture |
| **ORM & Database** | Sequelize ORM v6, SQLite3 | Pemodelan relasional, migrasi skema, & portabilitas data |
| **PDF Generation**| PDFKit | Rendering stream dokumen naskah dinas PDF format A4 |
| **Security & Auth**| JSON Web Token (`jsonwebtoken`), `bcryptjs` | Otentikasi stateless & hashing kata sandi aman |
| **Environment** | `dotenv`, `cors` | Konfigurasi variabel lingkungan & proteksi lintas domain |

---

## 📂 Struktur Direktori Proyek

```text
kp4-system/
├── client/                          # Frontend React + Vite
│   ├── src/
│   │   ├── api/                     # Konfigurasi Axios & interceptor
│   │   ├── components/              # Komponen UI (Navbar, Icon, dsb.)
│   │   ├── pages/                   # Halaman Aplikasi
│   │   │   ├── PegawaiPage.jsx      # Portal Publik Cetak & Verifikasi KP4
│   │   │   ├── AdminLoginPage.jsx   # Autentikasi Pengelola / Admin
│   │   │   ├── DashboardPage.jsx    # Dashboard CRUD Pegawai, KGB, & Pengaturan
│   │   │   └── LogAktivitasPage.jsx # Riwayat Audit Trail Sistem
│   │   ├── App.jsx                  # Routing utama aplikasi
│   │   ├── index.css                # Sistem desain Archipelago Civic
│   │   └── main.jsx                 # Entry point frontend
│   ├── package.json
│   └── vite.config.js
│
├── server/                          # Backend API Express.js
│   ├── config/                      # Inisialisasi basis data Sequelize
│   │   └── database.js
│   ├── controllers/                 # Controller logika bisnis
│   │   ├── adminController.js       # CRUD master data, KGB, konfigurasi, & log
│   │   ├── authController.js        # Login admin & verifikasi JWT
│   │   ├── pegawaiController.js     # Validasi publik & update masa kerja mandiri
│   │   └── printController.js       # Endpoint generator berkas PDF
│   ├── middleware/                  # Middleware penjaga rute
│   │   └── auth.js                  # Guard token otentikasi JWT
│   ├── models/                      # Definisi skema tabel Sequelize
│   │   ├── Admin.js
│   │   ├── Anak.js
│   │   ├── LogAktivitas.js
│   │   ├── Pasangan.js
│   │   ├── Pegawai.js
│   │   ├── Pengaturan.js
│   │   └── index.js                 # Asosiasi relasi antar-entitas
│   ├── routes/                      # Definisi rute REST API
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   └── printRoutes.js
│   ├── seeders/                     # Seeder data uji coba awal
│   │   └── seed.js
│   ├── services/                    # Layanan pendukung komputasi
│   │   ├── pdfGenerator.js          # Mesin penyusunan PDF naskah dinas
│   │   └── salaryService.js         # Layanan kalkulasi gaji & tunjangan PP 5/2024
│   ├── kp4.sqlite                   # Berkas basis data SQLite
│   ├── server.js                    # Entry point server backend
│   └── package.json
│
├── dev.js                           # Dual-runner otomatis (Backend + Frontend)
├── start-dev.bat                    # Skrip 1-klik eksekusi untuk pengguna Windows
├── package.json                     # Konfigurasi root proyek & script runner
├── README.md                        # Dokumentasi utama proyek
├── SRS.md                           # Dokumen Software Requirements Specification
├── UI-REDESIGN.md                   # Spesifikasi sistem desain antarmuka
└── QA-notes.md                      # Catatan pengujian kualitas
```

---

## 🚀 Panduan Instalasi & Menjalankan

### Prasyarat Sistem
- **Node.js** (Versi 18.x LTS atau lebih baru sangat disarankan).
- **npm** (Versi 9.x atau lebih baru).

### 1. Clone Repository
```bash
git clone https://github.com/avifarya15/Sistem-Otamatisasi-Surat-KP4.git
cd Sistem-Otamatisasi-Surat-KP4
```

### 2. Pasang Dependensi
Pasang paket dependensi pada kedua folder (`server` dan `client`):

```bash
# 1. Pasang dependensi backend
cd server
npm install

# 2. Pasang dependensi frontend
cd ../client
npm install

# 3. Kembali ke direktori root
cd ..
```

---

### 3. Menjalankan Aplikasi

Pilih salah satu metode peluncuran berikut:

#### Opsi A: Menggunakan Root Runner (Sangat Disarankan)
Jalankan satu perintah berikut di direktori utama:
```bash
npm run dev
```
*Skrip `dev.js` akan otomatis menyalakan backend di port 3001 dan frontend di port 5173 secara bersamaan.*

#### Opsi B: Menggunakan Shortcut Windows (1-Click Launch)
- Cukup klik ganda (*double-click*) file **`start-dev.bat`** di direktori utama.

#### Opsi C: Menjalankan Manual di Dua Terminal Terpisah

- **Terminal 1 — Backend:**
  ```bash
  cd server
  npm start
  ```
  *(Server berjalan di `http://localhost:3001`)*

- **Terminal 2 — Frontend:**
  ```bash
  cd client
  npm run dev
  ```
  *(Aplikasi web dapat diakses di `http://localhost:5173`)*

---

## 🔑 Kredensial & Data Percobaan (Demo Data)

Basis data otomatis terisi data awal (*auto-seed*) saat server backend pertama kali dijalankan:

### Akun Administrator
- **URL Login Admin:** `http://localhost:5173/admin/login`
- **Username:** `admin`
- **Password:** `admin123`

### Data Pegawai untuk Verifikasi Mandiri (Portal Publik)
Buka portal publik di `http://localhost:5173/` dan masukkan salah satu data pengujian:

| Nama Pegawai | NIP (18 Digit) | Tanggal Lahir | Keterangan Keluarga |
| :--- | :--- | :--- | :--- |
| **Nur' Rahma, S.I.Kom.** | `199306222025212029` | `1993-06-22` | Format resmi pemindaian naskah (1 Pasangan: Armin K. Usman) |
| **Budi Santoso** | `198001012005011001` | `1980-01-01` | 1 Pasangan (Dewi Lestari), 2 Anak Kandung |
| **Siti Aminah** | `199005152010012002` | `1990-05-15` | 1 Pasangan (Ahmad Hidayat), 1 Anak Kandung |

---

## 📡 Daftar Lengkap Endpoint REST API

### 🌐 1. Portal Publik & Percetakan (`/api/print`)
| Method | Endpoint | Deskripsi | Parameter Utama |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/print/validate` | Memvalidasi identitas pegawai & mengambil data keluarga | Body: `{ nip, tanggal_lahir }` |
| `POST` | `/api/print/update-mkg` | Memperbarui masa kerja (MKG) & menghitung gaji baru mandiri | Body: `{ nip, tanggal_lahir, mkg_tahun, mkg_bulan }` |
| `GET` | `/api/print/config` | Mengambil parameter persentase kenaikan KGB aktif | — |
| `POST` / `GET` | `/api/print/generate` | Menghasilkan dan mengunduh berkas PDF formulir KP4 | Query/Body: `{ nip }` |

### 🔐 2. Autentikasi Pengelola (`/api/auth`)
| Method | Endpoint | Deskripsi | Parameter Utama |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Login admin dan perolehan token JWT | Body: `{ username, password }` |

### 🛡️ 3. Dashboard Admin (`/api/admin`) — *Wajib Header `Authorization: Bearer <token>`*

#### Manajemen Master Data Pegawai
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/admin/pegawai` | Mengambil seluruh daftar pegawai beserta relasi keluarga |
| `GET` | `/api/admin/pegawai/:nip` | Mengambil detail lengkap 1 pegawai berdasarkan NIP |
| `POST` | `/api/admin/pegawai` | Mendaftarkan pegawai baru (otomatis hitung gaji jika kosong) |
| `PUT` | `/api/admin/pegawai/:nip` | Memperbarui data kepegawaian |
| `DELETE` | `/api/admin/pegawai/:nip` | Menghapus pegawai (cascade delete pasangan & anak) |

#### Manajemen Data Keluarga (Pasangan & Anak)
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/api/admin/pasangan` | Mendaftarkan data pasangan pegawai |
| `PUT` | `/api/admin/pasangan/:id` | Mengubah data pasangan pegawai |
| `DELETE` | `/api/admin/pasangan/:id` | Menghapus data pasangan pegawai |
| `POST` | `/api/admin/anak` | Menambahkan data tanggungan anak |
| `PUT` | `/api/admin/anak/:id` | Mengubah data tanggungan anak |
| `DELETE` | `/api/admin/anak/:id` | Menghapus data tanggungan anak |

#### Otomasi Kenaikan Gaji Berkala (KGB)
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/admin/kgb/eligible` | Mendapatkan daftar seluruh pegawai yang memenuhi syarat KGB |
| `POST` | `/api/admin/kgb/process/:nip` | Memproses eksekusi KGB (+2 thn MKG, kenaikan gaji pokok, reset TMT) |

#### Konfigurasi Sistem & Jejak Audit
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/admin/settings` | Membaca konfigurasi aktif persentase kenaikan KGB |
| `POST` | `/api/admin/settings` | Memperbarui persentase kenaikan KGB (disimpan di DB) |
| `GET` | `/api/admin/logs` | Mengambil 100 riwayat transaksi audit trail terbaru |

---

## 📄 Lisensi
Didistribusikan di bawah lisensi **MIT License**. Lihat berkas `LICENSE` untuk rincian ketentuan penggunaan.
