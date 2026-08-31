const bcrypt = require('bcryptjs');
const { sequelize, Admin, Pegawai, Pasangan, Anak } = require('../models');

async function seed() {
  try {
    await sequelize.sync({ force: true });
    
    await Admin.create({
      username: 'admin',
      password_hash: bcrypt.hashSync('admin123', 10),
      nama: 'Administrator',
      role: 'super_admin'
    });

    const pegawai1 = await Pegawai.create({
      nip: '198001012005011001',
      nama: 'Budi Santoso',
      tempat_lahir: 'Jakarta',
      tanggal_lahir: '1980-01-01',
      golongan: 'III/c',
      jabatan: 'Analis Kebijakan',
      unit_kerja: 'Biro Kepegawaian',
      gaji_pokok: 3500000
    });

    const pegawai2 = await Pegawai.create({
      nip: '199005152010012002',
      nama: 'Siti Aminah',
      tempat_lahir: 'Bandung',
      tanggal_lahir: '1990-05-15',
      golongan: 'III/a',
      jabatan: 'Pranata Komputer',
      unit_kerja: 'Pusat Data dan Informasi',
      gaji_pokok: 2800000
    });

    await Pasangan.create({
      nip: pegawai1.nip,
      nama: 'Dewi Lestari',
      tempat_lahir: 'Surabaya',
      tanggal_lahir: '1982-03-20',
      pekerjaan: 'Guru PNS',
      tanggal_menikah: '2006-06-15'
    });

    await Anak.create({
      nip: pegawai1.nip,
      nama: 'Andi Santoso',
      tempat_lahir: 'Jakarta',
      tanggal_lahir: '2007-08-10',
      status_anak: 'Kandung',
      status_pendidikan: 'Kuliah'
    });

    await Anak.create({
      nip: pegawai1.nip,
      nama: 'Citra Santoso',
      tempat_lahir: 'Jakarta',
      tanggal_lahir: '2010-12-25',
      status_anak: 'Kandung',
      status_pendidikan: 'SMA'
    });

    await Pasangan.create({
      nip: pegawai2.nip,
      nama: 'Ahmad Hidayat',
      tempat_lahir: 'Bandung',
      tanggal_lahir: '1988-11-03',
      pekerjaan: 'Wiraswasta',
      tanggal_menikah: '2012-04-20'
    });

    await Anak.create({
      nip: pegawai2.nip,
      nama: 'Fatimah Hidayat',
      tempat_lahir: 'Bandung',
      tanggal_lahir: '2013-09-14',
      status_anak: 'Kandung',
      status_pendidikan: 'SMP'
    });

    const pegawai3 = await Pegawai.create({
      nip: '199306222025212029',
      nama: "Nur' Rahma, S.I.Kom.",
      tempat_lahir: 'Makmur',
      tanggal_lahir: '1993-06-22',
      golongan: 'IX',
      jabatan: 'Penata Layanan Operasional',
      unit_kerja: 'Disnakertrans Prov. Sulawesi Tengah',
      gaji_pokok: 3203300
    });

    await Pasangan.create({
      nip: pegawai3.nip,
      nama: 'Armin K. Usman',
      tempat_lahir: 'Palu',
      tanggal_lahir: '1987-08-06',
      pekerjaan: 'Petani/Pekebun',
      tanggal_menikah: '2022-05-11'
    });

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    if (require.main === module) {
      process.exit();
    }
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
