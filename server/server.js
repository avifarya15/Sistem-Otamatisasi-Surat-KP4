require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { sequelize, Admin, Pegawai, Pasangan, Anak } = require('./models');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const printRoutes = require('./routes/printRoutes');

const app = express();

const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/print', printRoutes);

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await sequelize.sync();
    
    const adminCount = await Admin.count();
    if (adminCount === 0) {
      console.log('Database empty, running inline seed...');
      
      await Admin.create({
        username: 'admin',
        password_hash: bcrypt.hashSync('admin123', 10),
        nama: 'Administrator',
        role: 'super_admin'
      });

      const pegawai1 = await Pegawai.create({ nip: '198001012005011001', nama: 'Budi Santoso', tempat_lahir: 'Jakarta', tanggal_lahir: '1980-01-01', golongan: 'III/c', jabatan: 'Analis Kebijakan', unit_kerja: 'Biro Kepegawaian', gaji_pokok: 3500000 });
      await Pasangan.create({ nip: pegawai1.nip, nama: 'Dewi Lestari', tempat_lahir: 'Surabaya', tanggal_lahir: '1982-03-20', pekerjaan: 'Guru PNS', tanggal_menikah: '2006-06-15' });
      await Anak.create({ nip: pegawai1.nip, nama: 'Andi Santoso', tempat_lahir: 'Jakarta', tanggal_lahir: '2007-08-10', status_anak: 'Kandung', status_pendidikan: 'Kuliah' });
      await Anak.create({ nip: pegawai1.nip, nama: 'Citra Santoso', tempat_lahir: 'Jakarta', tanggal_lahir: '2010-12-25', status_anak: 'Kandung', status_pendidikan: 'SMA' });
      
      const pegawai2 = await Pegawai.create({ nip: '199005152010012002', nama: 'Siti Aminah', tempat_lahir: 'Bandung', tanggal_lahir: '1990-05-15', golongan: 'III/a', jabatan: 'Pranata Komputer', unit_kerja: 'Pusat Data dan Informasi', gaji_pokok: 2800000 });
      await Pasangan.create({ nip: pegawai2.nip, nama: 'Ahmad Hidayat', tempat_lahir: 'Bandung', tanggal_lahir: '1988-11-03', pekerjaan: 'Wiraswasta', tanggal_menikah: '2012-04-20' });
      await Anak.create({ nip: pegawai2.nip, nama: 'Fatimah Hidayat', tempat_lahir: 'Bandung', tanggal_lahir: '2013-09-14', status_anak: 'Kandung', status_pendidikan: 'SMP' });
      console.log('Inline auto-seeding completed.');
    }

    app.listen(PORT, () => {
      console.log(`KP4 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();
