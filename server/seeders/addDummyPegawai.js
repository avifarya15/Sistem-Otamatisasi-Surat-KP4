const { Pegawai } = require('../models');

const dummyData = [
  {
    nip: '198503122008011002',
    nama: 'Agus Setiawan, S.Pd.',
    tempat_lahir: 'Semarang',
    tanggal_lahir: '1985-03-12',
    golongan: 'III/b',
    jabatan: 'Guru Ahli Muda',
    unit_kerja: 'Dinas Pendidikan',
    gaji_pokok: 3154400,
    tmt_cpns: '2008-01-01',
    tmt_kgb_terakhir: '2024-01-01',
    mkg_tahun: 10,
    mkg_bulan: 0,
    status_kgb: 'Normal'
  },
  {
    nip: '198207192006042003',
    nama: 'Dr. Hj. Ratna Sari, M.Kes.',
    tempat_lahir: 'Makassar',
    tanggal_lahir: '1982-07-19',
    golongan: 'IV/a',
    jabatan: 'Dokter Ahli Madya',
    unit_kerja: 'Dinas Kesehatan',
    gaji_pokok: 3950000,
    tmt_cpns: '2006-04-01',
    tmt_kgb_terakhir: '2022-04-01',
    mkg_tahun: 16,
    mkg_bulan: 0,
    status_kgb: 'Waktunya KGB'
  },
  {
    nip: '198811042011011004',
    nama: 'Bambang Trihatmojo, S.T.',
    tempat_lahir: 'Surakarta',
    tanggal_lahir: '1988-11-04',
    golongan: 'III/c',
    jabatan: 'Pranata Komputer Ahli Muda',
    unit_kerja: 'Dinas Komunikasi dan Informatika',
    gaji_pokok: 3420000,
    tmt_cpns: '2011-01-01',
    tmt_kgb_terakhir: '2023-01-01',
    mkg_tahun: 12,
    mkg_bulan: 0,
    status_kgb: 'Normal'
  },
  {
    nip: '199204152015032005',
    nama: 'Sri Wahyuni, S.E.',
    tempat_lahir: 'Yogyakarta',
    tanggal_lahir: '1992-04-15',
    golongan: 'III/a',
    jabatan: 'Pengelola Keuangan',
    unit_kerja: 'Badan Pengelola Keuangan dan Aset Daerah',
    gaji_pokok: 2980000,
    tmt_cpns: '2015-03-01',
    tmt_kgb_terakhir: '2022-03-01',
    mkg_tahun: 8,
    mkg_bulan: 0,
    status_kgb: 'Waktunya KGB'
  },
  {
    nip: '197909282003121006',
    nama: 'Drs. Hendra Gunawan, M.Si.',
    tempat_lahir: 'Palu',
    tanggal_lahir: '1979-09-28',
    golongan: 'IV/b',
    jabatan: 'Kepala Bidang Mutasi',
    unit_kerja: 'Badan Kepegawaian Daerah',
    gaji_pokok: 4210000,
    tmt_cpns: '2003-12-01',
    tmt_kgb_terakhir: '2023-12-01',
    mkg_tahun: 20,
    mkg_bulan: 0,
    status_kgb: 'Normal'
  },
  {
    nip: '199501102019022007',
    nama: 'Rina Marlina, A.Md.',
    tempat_lahir: 'Cirebon',
    tanggal_lahir: '1995-01-10',
    golongan: 'II/c',
    jabatan: 'Pengadministrasi Umum',
    unit_kerja: 'Sekretariat Daerah',
    gaji_pokok: 2600000,
    tmt_cpns: '2019-02-01',
    tmt_kgb_terakhir: '2023-02-01',
    mkg_tahun: 4,
    mkg_bulan: 0,
    status_kgb: 'Normal'
  },
  {
    nip: '198706252009011008',
    nama: 'Dedi Kurniawan, S.Sos.',
    tempat_lahir: 'Malang',
    tanggal_lahir: '1987-06-25',
    golongan: 'III/b',
    jabatan: 'Penyusun Program Anggaran',
    unit_kerja: 'Badan Perencanaan Pembangunan Daerah',
    gaji_pokok: 3250000,
    tmt_cpns: '2009-01-01',
    tmt_kgb_terakhir: '2022-01-01',
    mkg_tahun: 14,
    mkg_bulan: 0,
    status_kgb: 'Waktunya KGB'
  },
  {
    nip: '199108172014022009',
    nama: 'Eka Putri Lestari, S.H.',
    tempat_lahir: 'Denpasar',
    tanggal_lahir: '1991-08-17',
    golongan: 'III/a',
    jabatan: 'Analis Hukum',
    unit_kerja: 'Biro Hukum Setda',
    gaji_pokok: 2950000,
    tmt_cpns: '2014-02-01',
    tmt_kgb_terakhir: '2024-02-01',
    mkg_tahun: 8,
    mkg_bulan: 0,
    status_kgb: 'Normal'
  },
  {
    nip: '198312052007011010',
    nama: 'Muhammad Fadli, S.Kom.',
    tempat_lahir: 'Padang',
    tanggal_lahir: '1983-12-05',
    golongan: 'III/d',
    jabatan: 'Pranata Komputer Ahli Madya',
    unit_kerja: 'Dinas Komunikasi dan Informatika',
    gaji_pokok: 3680000,
    tmt_cpns: '2007-01-01',
    tmt_kgb_terakhir: '2022-01-01',
    mkg_tahun: 16,
    mkg_bulan: 0,
    status_kgb: 'Waktunya KGB'
  },
  {
    nip: '199402202018012011',
    nama: 'Nurul Hidayati, S.Stat.',
    tempat_lahir: 'Bogor',
    tanggal_lahir: '1994-02-20',
    golongan: 'III/a',
    jabatan: 'Statistisi Ahli Pertama',
    unit_kerja: 'Badan Pusat Statistik Daerah',
    gaji_pokok: 2890000,
    tmt_cpns: '2018-01-01',
    tmt_kgb_terakhir: '2024-01-01',
    mkg_tahun: 6,
    mkg_bulan: 0,
    status_kgb: 'Normal'
  },
  {
    nip: '198605302010011012',
    nama: 'Rudi Hartono, S.Kel.',
    tempat_lahir: 'Manado',
    tanggal_lahir: '1986-05-30',
    golongan: 'III/c',
    jabatan: 'Pengawas Kelautan',
    unit_kerja: 'Dinas Kelautan dan Perikanan',
    gaji_pokok: 3380000,
    tmt_cpns: '2010-01-01',
    tmt_kgb_terakhir: '2024-01-01',
    mkg_tahun: 12,
    mkg_bulan: 0,
    status_kgb: 'Normal'
  },
  {
    nip: '199003182012122013',
    nama: 'Fitri Handayani, S.Pd.',
    tempat_lahir: 'Gorontalo',
    tanggal_lahir: '1990-03-18',
    golongan: 'III/b',
    jabatan: 'Guru Ahli Muda',
    unit_kerja: 'Dinas Pendidikan',
    gaji_pokok: 3120000,
    tmt_cpns: '2012-12-01',
    tmt_kgb_terakhir: '2022-12-01',
    mkg_tahun: 10,
    mkg_bulan: 0,
    status_kgb: 'Waktunya KGB'
  },
  {
    nip: '197808142002121014',
    nama: 'Ir. Joko Susilo, M.T.',
    tempat_lahir: 'Surabaya',
    tanggal_lahir: '1978-08-14',
    golongan: 'IV/a',
    jabatan: 'Teknik Tata Bangunan Madya',
    unit_kerja: 'Dinas Pekerjaan Umum dan Penataan Ruang',
    gaji_pokok: 4050000,
    tmt_cpns: '2002-12-01',
    tmt_kgb_terakhir: '2024-12-01',
    mkg_tahun: 20,
    mkg_bulan: 0,
    status_kgb: 'Normal'
  },
  {
    nip: '199610052020122015',
    nama: 'Dewi Anjarwati, S.Tr.Keb.',
    tempat_lahir: 'Palu',
    tanggal_lahir: '1996-10-05',
    golongan: 'III/a',
    jabatan: 'Bidan Ahli Pertama',
    unit_kerja: 'RSUD Undata',
    gaji_pokok: 2785700,
    tmt_cpns: '2020-12-01',
    tmt_kgb_terakhir: '2024-12-01',
    mkg_tahun: 2,
    mkg_bulan: 0,
    status_kgb: 'Normal'
  },
  {
    nip: '198904222011011016',
    nama: 'Aris Munandar, S.P.',
    tempat_lahir: 'Lampung',
    tanggal_lahir: '1989-04-22',
    golongan: 'III/b',
    jabatan: 'Penyuluh Pertanian Muda',
    unit_kerja: 'Dinas Tanaman Pangan dan Hortikultura',
    gaji_pokok: 3200000,
    tmt_cpns: '2011-01-01',
    tmt_kgb_terakhir: '2022-01-01',
    mkg_tahun: 12,
    mkg_bulan: 0,
    status_kgb: 'Waktunya KGB'
  },
  {
    nip: '199312012017012017',
    nama: 'Intan Permatasari, S.Farm., Apt.',
    tempat_lahir: 'Medan',
    tanggal_lahir: '1993-12-01',
    golongan: 'III/b',
    jabatan: 'Apoteker Pertama',
    unit_kerja: 'Dinas Kesehatan',
    gaji_pokok: 3050000,
    tmt_cpns: '2017-01-01',
    tmt_kgb_terakhir: '2023-01-01',
    mkg_tahun: 6,
    mkg_bulan: 0,
    status_kgb: 'Normal'
  },
  {
    nip: '198411112008031018',
    nama: 'Lukman Hakim, S.E., M.M.',
    tempat_lahir: 'Banjarmasin',
    tanggal_lahir: '1984-11-11',
    golongan: 'III/d',
    jabatan: 'Auditor Ahli Muda',
    unit_kerja: 'Inspektorat Daerah',
    gaji_pokok: 3600000,
    tmt_cpns: '2008-03-01',
    tmt_kgb_terakhir: '2024-03-01',
    mkg_tahun: 14,
    mkg_bulan: 0,
    status_kgb: 'Normal'
  },
  {
    nip: '199209092015031019',
    nama: 'Fajar Nugroho, S.T.',
    tempat_lahir: 'Pontianak',
    tanggal_lahir: '1992-09-09',
    golongan: 'III/a',
    jabatan: 'Pengawas Lingkungan Hidup',
    unit_kerja: 'Dinas Lingkungan Hidup',
    gaji_pokok: 2900000,
    tmt_cpns: '2015-03-01',
    tmt_kgb_terakhir: '2022-03-01',
    mkg_tahun: 8,
    mkg_bulan: 0,
    status_kgb: 'Waktunya KGB'
  },
  {
    nip: '199803032022032020',
    nama: 'Putri Ayu Wandira, A.Md.Ak.',
    tempat_lahir: 'Poso',
    tanggal_lahir: '1998-03-03',
    golongan: 'II/c',
    jabatan: 'Pranata Laboratorium Kesehatan',
    unit_kerja: 'Labkesda',
    gaji_pokok: 2485900,
    tmt_cpns: '2022-03-01',
    tmt_kgb_terakhir: '2024-03-01',
    mkg_tahun: 2,
    mkg_bulan: 0,
    status_kgb: 'Normal'
  },
  {
    nip: '198101152005011021',
    nama: 'Drs. Supriyadi, M.Pd.',
    tempat_lahir: 'Madiun',
    tanggal_lahir: '1981-01-15',
    golongan: 'IV/a',
    jabatan: 'Pengawas Sekolah Ahli Madya',
    unit_kerja: 'Cabang Dinas Pendidikan Wilayah I',
    gaji_pokok: 4100000,
    tmt_cpns: '2005-01-01',
    tmt_kgb_terakhir: '2022-01-01',
    mkg_tahun: 18,
    mkg_bulan: 0,
    status_kgb: 'Waktunya KGB'
  }
];

async function addDummy() {
  try {
    let inserted = 0;
    for (const p of dummyData) {
      const [record, created] = await Pegawai.findOrCreate({
        where: { nip: p.nip },
        defaults: p
      });
      if (created) inserted++;
    }
    const total = await Pegawai.count();
    console.log(`Berhasil menambahkan ${inserted} data pegawai baru.`);
    console.log(`Total data pegawai sekarang: ${total}`);
  } catch (error) {
    console.error('Gagal menambahkan dummy data:', error);
  } finally {
    process.exit();
  }
}

addDummy();
