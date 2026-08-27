# 🏛️ Sistem Otomatisasi & Verifikasi Surat KP4 PNS

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

Aplikasi web modern untuk layanan mandiri verifikasi data kepegawaian dan pencetakan otomatis **Surat Keterangan Untuk Mendapat Pembayaran Tunjangan Keluarga (KP4)** Pegawai Negeri Sipil (PNS).

Dilengkapi dengan portal publik untuk pegawai melakukan pengecekan data mandiri dan unduh dokumen resmi format PDF, serta portal dashboard admin terproteksi untuk manajemen data kepegawaian, keluarga, dan audit trail aktivitas.

---

## 🌟 Fitur Utama

### 1. 🌐 Portal Publik (Layanan Mandiri Pegawai)
- **Verifikasi Cepat & Aman:** Validasi langsung identitas pegawai menggunakan kombinasi **NIP (18 Digit)** dan **Tanggal Lahir**.
- **Preview Data Terintegrasi:** Menampilkan rincian data pegawai, gaji pokok, informasi pasangan, serta daftar tanggungan anak.
- **Cetak Surat Digital Instan:** Generator PDF otomatis surat resmi KP4 siap unduh dan cetak tanpa antre.

### 2. 🛡️ Portal Admin (Workspace Pengelola)
- **Sistem Autentikasi Terproteksi:** Login admin berbasis token JWT (*JSON Web Token*) dengan enkripsi password *bcrypt*.
- **Metrik & Ringkasan Data:** Informasi ringkas total pegawai dan kesiapan pelayanan sistem secara *real-time*.
- **Direktori & Pencarian Pintar:** Filter pencarian instan berdasarkan Nama, NIP, atau Unit Kerja.
- **Manajemen Pegawai (CRUD):** Tambah pegawai baru, ubah data dasar (NIP, nama, tanggal lahir, golongan, jabatan, unit kerja, gaji pokok), dan hapus data.
- **Manajemen Pasangan:** Tambah, edit, dan hapus data pasangan (nama, tempat & tanggal lahir, pekerjaan, tanggal menikah).
- **Manajemen Anak:** Tambah, edit, dan hapus tanggungan anak (nama, tempat & tanggal lahir, status hubungan: *Kandung / Tiri / Angkat*, dan status pendidikan).

### 3. 📜 Audit Trail & Log Aktivitas
- **Pencatatan Riwayat Otomatis:** Setiap aktivitas pembuatan, pembaruan, dan penghapusan data tercatat otomatis ke dalam basis data.
- **Informasi Lengkap:** Menyimpan waktu transaksi (*timestamp*), username petugas pelaksana, jenis aksi, detail perubahan, dan alamat IP.

### 4. 🖨️ Automated PDF Engine (PDFKit)
- Pembuatan dokumen resmi PDF format A4 sesuai standar tata naskah dinas KP4:
  - Bagian I: Data Pokok Pegawai
  - Bagian II: Data Pasangan (Suami / Istri)
  - Bagian III: Tabel Data Anak & Status Pendidikan
  - Bagian Penutup: Kolom legalitas tanda tangan Kepala Unit Kerja & Pegawai bersangkutan.

---

## 🛠️ Arsitektur & Teknologi

| Lapisan | Teknologi / Pustaka |
| :--- | :--- |
| **Frontend** | React 18, Vite, React Router DOM v6, Axios, Custom Design System (*Archipelago Civic Theme*), Lucide Icons |
| **Backend** | Node.js, Express.js, Sequelize ORM, SQLite3, PDFKit, JWT (*jsonwebtoken*), bcryptjs, CORS, dotenv |
| **Basis Data** | SQLite (`kp4.sqlite`) |

---

## 📂 Struktur Direktori Proyek

```text
kp4-system/
├── client/                     # Frontend React + Vite
│   ├── src/
│   │   ├── api/                # Konfigurasi Axios & interceptors
│   │   ├── components/         # Komponen UI (Navbar, Icon, dsb.)
│   │   ├── pages/              # Halaman Aplikasi
│   │   │   ├── PegawaiPage.jsx     # Portal Publik Cetak KP4
│   │   │   ├── AdminLoginPage.jsx  # Login Administrator
│   │   │   ├── DashboardPage.jsx   # Dashboard Manajemen Pegawai & Keluarga
│   │   │   └── LogAktivitasPage.jsx# Riwayat Audit Trail
│   │   ├── App.jsx             # Routing & Shell Utama
│   │   ├── index.css           # Styling Sistem Desain
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend API Express.js
│   ├── config/                 # Konfigurasi Sequelize & Database
│   ├── controllers/            # Logic Handler (Auth, Admin, Pegawai, Print)
│   ├── middleware/             # Middleware Autentikasi JWT
│   ├── models/                 # Model Sequelize (Admin, Pegawai, Pasangan, Anak, Log)
│   ├── routes/                 # Rute REST API
│   ├── seeders/                # Script Seeder Data Demo
│   ├── services/               # Generator PDF (PDFKit)
│   ├── server.js               # Entry Point Backend Server
│   └── package.json
│
├── dev.js                      # Dual-Runner Script (Backend + Frontend)
├── start-dev.bat               # Shortcut Launch Windows 1-Click
├── package.json                # Root package konfigurasi & scripts
└── README.md                   # Dokumentasi Proyek
```

---

## 🚀 Panduan Instalasi & Menjalankan

### Prasyarat
- Pastikan sudah terpasang **[Node.js](https://nodejs.org/)** (versi 16.x, 18.x, atau 20.x ke atas) dan **npm**.

### 1. Clone Repository
```bash
git clone https://github.com/avifarya15/Sistem-Otamatisasi-Surat-KP4.git
cd Sistem-Otamatisasi-Surat-KP4
```

### 2. Pasang Dependensi
Buka terminal dan pasang dependensi untuk `server` dan `client`:

```bash
# Pasang dependensi backend
cd server
npm install

# Pasang dependensi frontend
cd ../client
npm install

# Kembali ke folder root
cd ..
```

---

### 3. Menjalankan Aplikasi

Anda dapat menjalankan kedua server (Backend & Frontend) dengan **satu langkah mudah**:

#### Opsi A: Menggunakan npm runner (Rekomendasi)
```bash
npm run dev
```

#### Opsi B: Menggunakan File Batch (Khusus Windows)
- Cukup *double-click* file **`start-dev.bat`** di direktori utama.

#### Opsi C: Menjalankan manual di 2 terminal terpisah

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
  *(Aplikasi web terbuka di `http://localhost:5173`)*

---

## 🔑 Kredensial & Data Percobaan (Demo Data)

Saat server pertama kali dijalankan, sistem secara otomatis mengisi data awal (*auto-seed*):

### Akun Administrator
- **URL Login:** `http://localhost:5173/admin/login`
- **Username:** `admin`
- **Password:** `admin123`

### Contoh Data Pegawai untuk Verifikasi Publik
Buka halaman utama di `http://localhost:5173/` dan masukkan data uji coba berikut:

| Nama Pegawai | NIP (18 Digit) | Tanggal Lahir | Keterangan Keluarga |
| :--- | :--- | :--- | :--- |
| **Budi Santoso** | `198001012005011001` | `1980-01-01` | 1 Pasangan (Dewi Lestari), 2 Anak |
| **Siti Aminah** | `199005152010012002` | `1990-05-15` | 1 Pasangan (Ahmad Hidayat), 1 Anak |

---

## 📡 Daftar Endpoint API

### 🔓 Publik / Percetakan
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/api/print/validate` | Validasi NIP & tanggal lahir pegawai |
| `POST` / `GET` | `/api/print/generate` | Unduh file PDF dokumen KP4 |

### 🔐 Autentikasi Admin
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Login admin & perolehan token JWT |

### 🛡️ Dashboard Admin (Memerlukan Header `Authorization: Bearer <token>`)
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/admin/pegawai` | Mendapatkan seluruh daftar pegawai |
| `GET` | `/api/admin/pegawai/:nip` | Mendapatkan detail data 1 pegawai beserta keluarga |
| `POST` | `/api/admin/pegawai` | Menambahkan data pegawai baru |
| `PUT` | `/api/admin/pegawai/:nip` | Memperbarui data pegawai |
| `DELETE` | `/api/admin/pegawai/:nip` | Menghapus pegawai (cascade hapus pasangan & anak) |
| `POST` | `/api/admin/pasangan` | Menambahkan data pasangan pegawai |
| `PUT` | `/api/admin/pasangan/:id` | Mengubah data pasangan |
| `DELETE` | `/api/admin/pasangan/:id` | Menghapus data pasangan |
| `POST` | `/api/admin/anak` | Menambahkan data tanggungan anak |
| `PUT` | `/api/admin/anak/:id` | Mengubah data anak |
| `DELETE` | `/api/admin/anak/:id` | Menghapus data anak |
| `GET` | `/api/admin/logs` | Mengambil 100 riwayat aktivitas log admin terbaru |

---

## 📄 Lisensi
Proyek ini dibuat untuk kebutuhan otomatisasi administrasi kepegawaian dan didistribusikan di bawah lisensi **MIT License**.
