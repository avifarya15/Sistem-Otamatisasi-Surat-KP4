const { Pegawai, Pasangan, Anak } = require('../models');
const {
  getGajiPokok,
  getPersenKgb,
  TABEL_GAJI_OFFICIAL,
  hitungMKGOtomatis
} = require('../services/salaryService');

/**
 * POST /print/validate
 * Validasi identitas pegawai (NIP + tanggal lahir).
 * MKG dihitung OTOMATIS dari tmt_pangkat (atau tmt_cpns jika tmt_pangkat kosong).
 * Hasil MKG otomatis disimpan ke DB setiap kali pegawai login/verifikasi.
 */
const validatePegawai = async (req, res) => {
  try {
    const { nip, tanggal_lahir } = req.body;
    if (!nip || !tanggal_lahir) {
      return res.status(400).json({ message: 'NIP dan tanggal lahir wajib diisi' });
    }

    const pegawai = await Pegawai.findOne({
      where: { nip, tanggal_lahir },
      include: [{ model: Pasangan, as: 'pasangan' }, { model: Anak, as: 'anak' }]
    });

    if (!pegawai) {
      return res.status(404).json({ message: 'Data pegawai tidak ditemukan atau tanggal lahir tidak sesuai' });
    }

    // === AUTO-HITUNG MKG dari TMT Pangkat / TMT CPNS ===
    // mkgOffset: offset tahun untuk potongan lintas golongan (disimpan admin, default 0)
    const mkgOffset = Number(pegawai.mkg_offset) || 0;
    const mkgOtomatis = hitungMKGOtomatis(
      pegawai.tmt_pangkat,
      pegawai.tmt_cpns,
      mkgOffset
    );

    // Hitung gaji pokok berdasarkan MKG otomatis
    const gajiOtomatis = getGajiPokok(pegawai.golongan, mkgOtomatis.tahun);

    // Simpan MKG otomatis ke DB (update saat login/verifikasi)
    if (gajiOtomatis) {
      await pegawai.update({
        mkg_tahun: mkgOtomatis.tahun,
        mkg_bulan: mkgOtomatis.bulan,
        gaji_pokok: gajiOtomatis
      });
    } else {
      await pegawai.update({
        mkg_tahun: mkgOtomatis.tahun,
        mkg_bulan: mkgOtomatis.bulan
      });
    }

    // Ambil data terbaru setelah update
    const updated = await Pegawai.findOne({
      where: { nip },
      include: [{ model: Pasangan, as: 'pasangan' }, { model: Anak, as: 'anak' }]
    });

    res.json({
      ...updated.toJSON(),
      persen_kenaikan_kgb: getPersenKgb(),
      tabel_gaji: TABEL_GAJI_OFFICIAL,
      // Info kalkulasi MKG otomatis (untuk ditampilkan di UI)
      mkg_otomatis_info: {
        tahun: mkgOtomatis.tahun,
        bulan: mkgOtomatis.bulan,
        sumber_tmt: mkgOtomatis.sumberTmt,
        tmt_referensi: mkgOtomatis.refDate,
        tmt_pangkat: pegawai.tmt_pangkat || null,
        tmt_cpns: pegawai.tmt_cpns || null,
        mkg_offset_tahun: mkgOffset
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * POST /print/update-mkg (DEPRECATED - sekarang MKG dihitung otomatis)
 * Endpoint ini sekarang berfungsi untuk SYNC ULANG MKG dari TMT terbaru di DB.
 * Tidak lagi menerima mkg_tahun / mkg_bulan manual dari user.
 */
const updateMasaKerja = async (req, res) => {
  try {
    const { nip, tanggal_lahir } = req.body;
    if (!nip || !tanggal_lahir) {
      return res.status(400).json({ message: 'NIP dan tanggal lahir diperlukan untuk verifikasi' });
    }

    const pegawai = await Pegawai.findOne({
      where: { nip, tanggal_lahir }
    });
    if (!pegawai) {
      return res.status(404).json({ message: 'Data pegawai tidak ditemukan atau kredensial tidak sesuai' });
    }

    // Hitung ulang MKG otomatis dari TMT
    const mkgOffset = Number(pegawai.mkg_offset) || 0;
    const mkgOtomatis = hitungMKGOtomatis(pegawai.tmt_pangkat, pegawai.tmt_cpns, mkgOffset);
    const gajiOtomatis = getGajiPokok(pegawai.golongan, mkgOtomatis.tahun);
    const gajiBaru = gajiOtomatis || pegawai.gaji_pokok;

    await pegawai.update({
      mkg_tahun: mkgOtomatis.tahun,
      mkg_bulan: mkgOtomatis.bulan,
      gaji_pokok: gajiBaru
    });

    const updated = await Pegawai.findOne({
      where: { nip },
      include: [{ model: Pasangan, as: 'pasangan' }, { model: Anak, as: 'anak' }]
    });

    res.json({
      message: 'MKG berhasil disinkronkan otomatis dari TMT Pangkat/CPNS',
      pegawai: {
        ...updated.toJSON(),
        persen_kenaikan_kgb: getPersenKgb(),
        tabel_gaji: TABEL_GAJI_OFFICIAL
      },
      mkg_otomatis_info: {
        tahun: mkgOtomatis.tahun,
        bulan: mkgOtomatis.bulan,
        sumber_tmt: mkgOtomatis.sumberTmt,
        tmt_referensi: mkgOtomatis.refDate,
        gaji_pokok: gajiBaru
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Helper sanitizers untuk PostgreSQL (konversi "" menjadi null agar tidak error type date/numeric)
 */
const cleanDate = (val) => {
  if (!val || typeof val !== 'string' || val.trim() === '') return null;
  return val.trim();
};

const cleanString = (val) => {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
};

const cleanNumber = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

/**
 * Melengkapi atau menambah data keluarga (Pasangan & Anak) oleh Pegawai secara mandiri.
 * Mendukung:
 * 1. Menambah pasangan baru (pasangan_baru) jika belum ada.
 * 2. Mengupdate pasangan yang sudah ada (pasangan_update).
 * 3. Menambah anak baru (anak_baru) satu per satu atau sekaligus.
 * 4. Mengupdate data anak yang sudah ada (anak_updates).
 * 5. Melengkapi data pegawai (pegawai_update) seperti tempat_lahir/tmt_cpns/tmt_pangkat.
 *    Jika tmt_pangkat diupdate, MKG otomatis dihitung ulang.
 */
const completeData = async (req, res) => {
  try {
    const {
      nip,
      tanggal_lahir,
      pegawai_update,
      pasangan_update,
      anak_updates,
      pasangan_baru,
      anak_baru
    } = req.body;

    if (!nip || !tanggal_lahir) {
      return res.status(400).json({ message: 'NIP dan tanggal lahir wajib ada untuk verifikasi' });
    }

    // Verifikasi identitas pegawai (harus cocok NIP + tanggal_lahir)
    const pegawai = await Pegawai.findOne({
      where: { nip, tanggal_lahir },
      include: [{ model: Pasangan, as: 'pasangan' }, { model: Anak, as: 'anak' }]
    });

    if (!pegawai) {
      return res.status(404).json({ message: 'Data pegawai tidak ditemukan atau kredensial tidak sesuai' });
    }

    // 1. Tambah atau update pasangan baru
    if (pasangan_baru && typeof pasangan_baru === 'object' && cleanString(pasangan_baru.nama)) {
      const pasanganPayload = {
        nama: cleanString(pasangan_baru.nama),
        tempat_lahir: cleanString(pasangan_baru.tempat_lahir),
        tanggal_lahir: cleanDate(pasangan_baru.tanggal_lahir),
        pekerjaan: cleanString(pasangan_baru.pekerjaan),
        tanggal_menikah: cleanDate(pasangan_baru.tanggal_menikah),
        penghasilan: cleanNumber(pasangan_baru.penghasilan)
      };

      if (pegawai.pasangan && pegawai.pasangan.length > 0) {
        await pegawai.pasangan[0].update(pasanganPayload);
      } else {
        await Pasangan.create({
          nip: pegawai.nip,
          ...pasanganPayload
        });
      }
    }

    // 2. Update data pasangan yang sudah ada
    if (pasangan_update && typeof pasangan_update === 'object' && pegawai.pasangan?.length > 0) {
      const pasangan = pegawai.pasangan[0];
      const safeUpdate = {};
      if ('nama' in pasangan_update && cleanString(pasangan_update.nama)) safeUpdate.nama = cleanString(pasangan_update.nama);
      if ('tempat_lahir' in pasangan_update) safeUpdate.tempat_lahir = cleanString(pasangan_update.tempat_lahir);
      if ('tanggal_lahir' in pasangan_update) safeUpdate.tanggal_lahir = cleanDate(pasangan_update.tanggal_lahir);
      if ('pekerjaan' in pasangan_update) safeUpdate.pekerjaan = cleanString(pasangan_update.pekerjaan);
      if ('tanggal_menikah' in pasangan_update) safeUpdate.tanggal_menikah = cleanDate(pasangan_update.tanggal_menikah);
      if ('penghasilan' in pasangan_update) safeUpdate.penghasilan = cleanNumber(pasangan_update.penghasilan);

      if (Object.keys(safeUpdate).length > 0) {
        await pasangan.update(safeUpdate);
      }
    }

    // 3. Tambah anak baru (bisa single object atau array)
    if (anak_baru) {
      const newChildren = Array.isArray(anak_baru) ? anak_baru : [anak_baru];
      for (const item of newChildren) {
        if (!item || !cleanString(item.nama)) continue;
        await Anak.create({
          nip: pegawai.nip,
          nama: cleanString(item.nama),
          tempat_lahir: cleanString(item.tempat_lahir),
          tanggal_lahir: cleanDate(item.tanggal_lahir) || '2000-01-01',
          status_anak: cleanString(item.status_anak) || 'Kandung',
          status_pendidikan: cleanString(item.status_pendidikan)
        });
      }
    }

    // 4. Update data anak yang sudah ada
    if (anak_updates && Array.isArray(anak_updates)) {
      for (const item of anak_updates) {
        if (!item || !item.id) continue;
        const anakRecord = pegawai.anak?.find(a => a.id === item.id);
        if (!anakRecord) continue;
        const safeUpdate = {};
        if ('nama' in item && cleanString(item.nama)) safeUpdate.nama = cleanString(item.nama);
        if ('tempat_lahir' in item) safeUpdate.tempat_lahir = cleanString(item.tempat_lahir);
        if ('tanggal_lahir' in item && cleanDate(item.tanggal_lahir)) safeUpdate.tanggal_lahir = cleanDate(item.tanggal_lahir);
        if ('status_anak' in item && cleanString(item.status_anak)) safeUpdate.status_anak = cleanString(item.status_anak);
        if ('status_pendidikan' in item) safeUpdate.status_pendidikan = cleanString(item.status_pendidikan);

        if (Object.keys(safeUpdate).length > 0) {
          await anakRecord.update(safeUpdate);
        }
      }
    }

    // 5. Update data pegawai (tempat_lahir, agama, kebangsaan, alamat, tmt_cpns, tmt_pangkat, dll.)
    if (pegawai_update && typeof pegawai_update === 'object') {
      const safeUpdate = {};
      if ('tempat_lahir' in pegawai_update) safeUpdate.tempat_lahir = cleanString(pegawai_update.tempat_lahir);
      // Pegawai hanya boleh melengkapi jika data di DB masih kosong/null (tidak bisa diubah jika sudah ada)
      if ('agama' in pegawai_update) {
        if (!pegawai.agama || String(pegawai.agama).trim() === '') {
          safeUpdate.agama = cleanString(pegawai_update.agama);
        }
      }
      if ('kebangsaan' in pegawai_update) {
        if (!pegawai.kebangsaan || String(pegawai.kebangsaan).trim() === '') {
          safeUpdate.kebangsaan = cleanString(pegawai_update.kebangsaan) || 'Indonesia';
        }
      }
      if ('alamat' in pegawai_update) {
        if (!pegawai.alamat || String(pegawai.alamat).trim() === '') {
          safeUpdate.alamat = cleanString(pegawai_update.alamat);
        }
      }
      if ('tmt_cpns' in pegawai_update) safeUpdate.tmt_cpns = cleanDate(pegawai_update.tmt_cpns);
      if ('tmt_kgb_terakhir' in pegawai_update) safeUpdate.tmt_kgb_terakhir = cleanDate(pegawai_update.tmt_kgb_terakhir);
      if ('tmt_pangkat' in pegawai_update) safeUpdate.tmt_pangkat = cleanDate(pegawai_update.tmt_pangkat);

      if (Object.keys(safeUpdate).length > 0) {
        await pegawai.update(safeUpdate);

        // Jika tmt_pangkat atau tmt_cpns berubah, hitung ulang MKG otomatis
        if ('tmt_pangkat' in safeUpdate || 'tmt_cpns' in safeUpdate) {
          const updatedPegawai = await Pegawai.findOne({ where: { nip } });
          const mkgOffset = Number(updatedPegawai.mkg_offset) || 0;
          const mkgOtomatis = hitungMKGOtomatis(
            updatedPegawai.tmt_pangkat,
            updatedPegawai.tmt_cpns,
            mkgOffset
          );
          const gajiOtomatis = getGajiPokok(updatedPegawai.golongan, mkgOtomatis.tahun);
          const updatePayload = { mkg_tahun: mkgOtomatis.tahun, mkg_bulan: mkgOtomatis.bulan };
          if (gajiOtomatis) updatePayload.gaji_pokok = gajiOtomatis;
          await updatedPegawai.update(updatePayload);
        }
      }
    }

    // Ambil data terbaru lengkap setelah semua update dan insert
    const updated = await Pegawai.findOne({
      where: { nip },
      include: [{ model: Pasangan, as: 'pasangan' }, { model: Anak, as: 'anak' }]
    });

    // Sertakan info MKG otomatis dalam response
    const mkgOffset = Number(updated.mkg_offset) || 0;
    const mkgOtomatis = hitungMKGOtomatis(updated.tmt_pangkat, updated.tmt_cpns, mkgOffset);

    res.json({
      message: 'Data keluarga berhasil disimpan ke database.',
      pegawai: {
        ...updated.toJSON(),
        persen_kenaikan_kgb: getPersenKgb(),
        tabel_gaji: TABEL_GAJI_OFFICIAL,
        mkg_otomatis_info: {
          tahun: mkgOtomatis.tahun,
          bulan: mkgOtomatis.bulan,
          sumber_tmt: mkgOtomatis.sumberTmt,
          tmt_referensi: mkgOtomatis.refDate,
          tmt_pangkat: updated.tmt_pangkat || null,
          tmt_cpns: updated.tmt_cpns || null,
          mkg_offset_tahun: mkgOffset
        }
      }
    });
  } catch (error) {
    console.error('[completeData] Error:', error);
    res.status(500).json({ message: 'Server error saat menyimpan data', error: error.message });
  }
};

const getSystemConfig = async (req, res) => {
  try {
    res.json({
      persen_kenaikan_kgb: getPersenKgb(),
      tabel_gaji: TABEL_GAJI_OFFICIAL
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  validatePegawai,
  updateMasaKerja,
  completeData,
  getSystemConfig
};
