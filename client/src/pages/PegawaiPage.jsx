import { useState, useMemo, useEffect } from 'react';
import api from '../api/axios';
import Icon from '../components/Icon';

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : '-';

const formatCurrency = (n) =>
  n == null ? '-' : Number(n).toLocaleString('id-ID');

const GAJI_DASAR_2024 = {
  'I/a': 1685700,
  'I/b': 1840800,
  'I/c': 1918700,
  'I/d': 1999900,
  'II/a': 2184000,
  'II/b': 2385000,
  'II/c': 2485900,
  'II/d': 2591100,
  'III/a': 2785700,
  'III/b': 2903600,
  'III/c': 3026400,
  'III/d': 3154400,
  'IV/a': 3287800,
  'IV/b': 3426900,
  'IV/c': 3571900,
  'IV/d': 3723000,
  'IV/e': 3880400,
  IX: 3203300
};

const normalizeGolongan = (golongan) => {
  if (!golongan) return '';
  let str = String(golongan).trim().replace(/\s+/g, '').replace(/[.-]/g, '/');
  if (!str.includes('/')) {
    const match = str.match(/^([0-9]+|[IVXLCDM]+)([a-eA-E])$/i);
    if (match) str = `${match[1]}/${match[2]}`;
  }
  const parts = str.split('/');
  if (parts.length === 2) {
    let tingkat = parts[0].toUpperCase();
    const ruang = parts[1].toLowerCase();
    const romanMap = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '9': 'IX' };
    if (romanMap[tingkat]) tingkat = romanMap[tingkat];
    return `${tingkat}/${ruang}`;
  }
  const pppkMap = { '9': 'IX' };
  const upper = str.toUpperCase();
  return pppkMap[upper] || upper;
};

const hitungGaji = (golongan, tahun, persen = 3.15) => {
  if (!golongan) return 0;
  const norm = normalizeGolongan(golongan);
  const base = GAJI_DASAR_2024[norm];
  if (!base) return 0;
  return Math.round(
    base * Math.pow(1 + (Number(persen) || 3.15) / 100, Math.floor(Math.max(0, Number(tahun) || 0) / 2))
  );
};

function InfoItem({ label, value }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

/**
 * Modal Tambah / Lengkapi Data Keluarga
 * Menggunakan sistem modal standar (.modal-overlay & .modal-dialog) dengan backdrop blur dan styling rapi
 */
function FamilyModal({ isOpen, onClose, mode = 'all', pegawai, onSave, saving }) {
  const [tab, setTab] = useState(() => (mode === 'anak' ? 'anak' : 'pasangan'));

  // Data Pasangan
  const existingPas = pegawai?.pasangan?.[0] || null;
  const [pasNama, setPasNama] = useState(existingPas?.nama || '');
  const [pasTempatLahir, setPasTempatLahir] = useState(existingPas?.tempat_lahir || '');
  const [pasTanggalLahir, setPasTanggalLahir] = useState(
    existingPas?.tanggal_lahir ? existingPas.tanggal_lahir.substring(0, 10) : ''
  );
  const [pasPekerjaan, setPasPekerjaan] = useState(existingPas?.pekerjaan || '');
  const [pasTanggalMenikah, setPasTanggalMenikah] = useState(
    existingPas?.tanggal_menikah ? existingPas.tanggal_menikah.substring(0, 10) : ''
  );
  const [pasStatusPenghasilan, setPasStatusPenghasilan] = useState(
    existingPas?.penghasilan && Number(existingPas.penghasilan) > 0 ? 'ada' : 'tidak'
  );
  const [pasPenghasilan, setPasPenghasilan] = useState(
    existingPas?.penghasilan && Number(existingPas.penghasilan) > 0 ? existingPas.penghasilan : ''
  );

  // Data Anak Baru
  const [newChildren, setNewChildren] = useState([
    { nama: '', tempat_lahir: '', tanggal_lahir: '', status_anak: 'Kandung', status_pendidikan: '' }
  ]);

  // Data Anak Lama (untuk edit tempat lahir / status pendidikan jika kosong)
  const [childEdits, setChildEdits] = useState(() => {
    const map = {};
    pegawai?.anak?.forEach((a) => {
      map[a.id] = {
        id: a.id,
        nama: a.nama || '',
        tempat_lahir: a.tempat_lahir || '',
        tanggal_lahir: a.tanggal_lahir ? a.tanggal_lahir.substring(0, 10) : '',
        status_anak: a.status_anak || 'Kandung',
        status_pendidikan: a.status_pendidikan || ''
      };
    });
    return map;
  });

  const handleAddChildRow = () => {
    if (newChildren.length < 4) {
      setNewChildren((prev) => [
        ...prev,
        { nama: '', tempat_lahir: '', tanggal_lahir: '', status_anak: 'Kandung', status_pendidikan: '' }
      ]);
    }
  };

  const handleRemoveChildRow = (idx) => {
    setNewChildren((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateNewChild = (index, field, value) => {
    setNewChildren((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const updateChildEdit = (id, field, value) => {
    setChildEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let pasangan_baru = null;
    let pasangan_update = null;

    if (pasNama.trim()) {
      const payload = {
        nama: pasNama.trim(),
        tempat_lahir: pasTempatLahir.trim() || null,
        tanggal_lahir: pasTanggalLahir || null,
        pekerjaan: pasPekerjaan.trim() || null,
        tanggal_menikah: pasTanggalMenikah || null,
        penghasilan: pasStatusPenghasilan === 'ada' ? Number(pasPenghasilan) || 0 : 0
      };

      if (existingPas) {
        pasangan_update = payload;
      } else {
        pasangan_baru = payload;
      }
    }

    const validNewChildren = newChildren
      .filter((c) => c.nama.trim() !== '')
      .map((c) => ({
        nama: c.nama.trim(),
        tempat_lahir: c.tempat_lahir.trim() || null,
        tanggal_lahir: c.tanggal_lahir || '2000-01-01',
        status_anak: c.status_anak || 'Kandung',
        status_pendidikan: c.status_pendidikan.trim() || null
      }));

    const anak_updates = Object.values(childEdits);

    onSave({
      pasangan_baru,
      pasangan_update,
      anak_baru: validNewChildren.length > 0 ? validNewChildren : null,
      anak_updates: anak_updates.length > 0 ? anak_updates : null
    });
  };

  const modalTitle =
    mode === 'pasangan'
      ? existingPas
        ? 'Ubah Data Pasangan'
        : 'Tambah Data Pasangan'
      : mode === 'anak'
      ? 'Tambah Data Anak Tanggungan'
      : 'Lengkapi Data Keluarga KP4';

  const modalSubtitle =
    mode === 'pasangan'
      ? 'Data suami atau istri untuk pengajuan tunjangan keluarga (10%).'
      : mode === 'anak'
      ? 'Data anak tanggungan untuk pengajuan tunjangan anak (2% per anak).'
      : 'Lengkapi data keluarga agar tunjangan otomatis aktif pada berkas surat KP4.';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-title-badge">
              <Icon name={tab === 'anak' ? 'users' : 'heart'} size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div className="eyebrow" style={{ color: '#0284C7', marginBottom: '2px' }}>
                Layanan KP4 Mandiri
              </div>
              <h2>{modalTitle}</h2>
              <p>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Tutup">
            <Icon name="close" size={16} strokeWidth={2.2} />
            <span>Tutup</span>
          </button>
        </div>

        {mode === 'all' && (
          <div className="modal-tab-nav">
            <button
              type="button"
              className={`modal-tab-item ${tab === 'pasangan' ? 'active' : ''}`}
              onClick={() => setTab('pasangan')}
            >
              <Icon name="heart" size={16} /> Data Pasangan
              {!pegawai?.pasangan?.length && <span className="family-badge amber">Belum ada</span>}
            </button>
            <button
              type="button"
              className={`modal-tab-item ${tab === 'anak' ? 'active' : ''}`}
              onClick={() => setTab('anak')}
            >
              <Icon name="users" size={16} /> Data Anak
              {!pegawai?.anak?.length && <span className="family-badge amber">Belum ada</span>}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            {(mode === 'pasangan' || (mode === 'all' && tab === 'pasangan')) && (
              <div>
                <div className="form-section-title">
                  <Icon name="heart" size={15} /> Informasi Istri / Suami Pegawai
                </div>
                <p style={{ fontSize: '.82rem', color: '#64748B', margin: '0 0 16px', lineHeight: 1.5 }}>
                  {existingPas
                    ? 'Perbarui atau lengkapi informasi pasangan di bawah ini.'
                    : 'Jika sudah menikah, masukkan identitas pasangan Anda untuk mengaktifkan tunjangan 10%.'}
                </p>

                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <div className="field-group" style={{ gridColumn: 'span 2' }}>
                    <label className="field-label">
                      Nama Lengkap Pasangan <span style={{ color: '#0284C7' }}>*</span>
                    </label>
                    <input
                      className="field-input"
                      type="text"
                      placeholder="Contoh: Siti Nurhaliza"
                      value={pasNama}
                      onChange={(e) => setPasNama(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Tempat Lahir</label>
                    <input
                      className="field-input"
                      type="text"
                      placeholder="Contoh: Palu"
                      value={pasTempatLahir}
                      onChange={(e) => setPasTempatLahir(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Tanggal Lahir</label>
                    <input
                      className="field-input"
                      type="date"
                      value={pasTanggalLahir}
                      onChange={(e) => setPasTanggalLahir(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Pekerjaan</label>
                    <input
                      className="field-input"
                      type="text"
                      placeholder="Contoh: PNS / Guru / Wiraswasta / IRT"
                      value={pasPekerjaan}
                      onChange={(e) => setPasPekerjaan(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Tanggal Pernikahan</label>
                    <input
                      className="field-input"
                      type="date"
                      value={pasTanggalMenikah}
                      onChange={(e) => setPasTanggalMenikah(e.target.value)}
                    />
                  </div>

                  <div className="field-group" style={{ gridColumn: 'span 2' }}>
                    <label className="field-label">Status Penghasilan Pasangan</label>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '.84rem',
                          cursor: 'pointer',
                          color: '#1E293B',
                          fontWeight: 600
                        }}
                      >
                        <input
                          type="radio"
                          name="penghasilan_status"
                          checked={pasStatusPenghasilan === 'tidak'}
                          onChange={() => {
                            setPasStatusPenghasilan('tidak');
                            setPasPenghasilan('');
                          }}
                        />
                        Tidak Berpenghasilan / Tanggungan Penuh
                      </label>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '.84rem',
                          cursor: 'pointer',
                          color: '#1E293B',
                          fontWeight: 600
                        }}
                      >
                        <input
                          type="radio"
                          name="penghasilan_status"
                          checked={pasStatusPenghasilan === 'ada'}
                          onChange={() => setPasStatusPenghasilan('ada')}
                        />
                        Memiliki Penghasilan Sendiri
                      </label>
                    </div>
                  </div>

                  {pasStatusPenghasilan === 'ada' && (
                    <div className="field-group" style={{ gridColumn: 'span 2' }}>
                      <label className="field-label">Nominal Penghasilan Pasangan per Bulan (Rp)</label>
                      <input
                        className="field-input"
                        type="number"
                        placeholder="Contoh: 4500000"
                        value={pasPenghasilan}
                        onChange={(e) => setPasPenghasilan(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {(mode === 'anak' || (mode === 'all' && tab === 'anak')) && (
              <div>
                <div className="form-section-title">
                  <Icon name="users" size={15} /> Data Anak Tanggungan
                </div>
                <p style={{ fontSize: '.82rem', color: '#64748B', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Tunjangan anak dihitung <strong>2% per anak</strong> untuk maksimal <strong>2 anak</strong> yang menjadi
                  tanggungan resmi keluarga.
                </p>

                {pegawai?.anak?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                      Anak yang Sudah Tercatat di Database:
                    </div>
                    {pegawai.anak.map((a, i) => (
                      <div
                        key={a.id}
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '14px',
                          marginBottom: '10px'
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '.86rem', color: '#0F172A', marginBottom: '8px' }}>
                          Anak {i + 1}: {a.nama} ({a.status_anak || 'Kandung'})
                        </div>
                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                          <div className="field-group">
                            <label className="field-label" style={{ fontSize: '.72rem' }}>
                              Tempat Lahir
                            </label>
                            <input
                              className="field-input"
                              type="text"
                              value={childEdits[a.id]?.tempat_lahir || ''}
                              onChange={(e) => updateChildEdit(a.id, 'tempat_lahir', e.target.value)}
                              placeholder="Tempat lahir"
                            />
                          </div>
                          <div className="field-group">
                            <label className="field-label" style={{ fontSize: '.72rem' }}>
                              Status Pendidikan
                            </label>
                            <input
                              className="field-input"
                              type="text"
                              value={childEdits[a.id]?.status_pendidikan || ''}
                              onChange={(e) => updateChildEdit(a.id, 'status_pendidikan', e.target.value)}
                              placeholder="SD / SMP / SMA / Kuliah"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#0284C7', marginBottom: '10px' }}>
                  + Formulir Tambah Anak Baru:
                </div>
                {newChildren.map((c, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '14px',
                      padding: '16px',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '.82rem', fontWeight: 700, color: '#0F172A' }}>
                        Anak Baru #{idx + 1}
                      </span>
                      {newChildren.length > 1 && (
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: '3px 8px', fontSize: '.72rem', color: '#DC2626' }}
                          onClick={() => handleRemoveChildRow(idx)}
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                      <div className="field-group" style={{ gridColumn: 'span 2' }}>
                        <label className="field-label">
                          Nama Lengkap Anak <span style={{ color: '#0284C7' }}>*</span>
                        </label>
                        <input
                          className="field-input"
                          type="text"
                          placeholder="Nama lengkap anak"
                          value={c.nama}
                          onChange={(e) => updateNewChild(idx, 'nama', e.target.value)}
                        />
                      </div>
                      <div className="field-group">
                        <label className="field-label">Tempat Lahir</label>
                        <input
                          className="field-input"
                          type="text"
                          placeholder="Contoh: Palu"
                          value={c.tempat_lahir}
                          onChange={(e) => updateNewChild(idx, 'tempat_lahir', e.target.value)}
                        />
                      </div>
                      <div className="field-group">
                        <label className="field-label">
                          Tanggal Lahir <span style={{ color: '#0284C7' }}>*</span>
                        </label>
                        <input
                          className="field-input"
                          type="date"
                          value={c.tanggal_lahir}
                          onChange={(e) => updateNewChild(idx, 'tanggal_lahir', e.target.value)}
                        />
                      </div>
                      <div className="field-group">
                        <label className="field-label">Status Anak</label>
                        <select
                          className="field-input"
                          value={c.status_anak}
                          onChange={(e) => updateNewChild(idx, 'status_anak', e.target.value)}
                        >
                          <option value="Kandung">Kandung</option>
                          <option value="Tiri">Tiri</option>
                          <option value="Angkat">Angkat</option>
                        </select>
                      </div>
                      <div className="field-group">
                        <label className="field-label">Status Pendidikan</label>
                        <input
                          className="field-input"
                          type="text"
                          placeholder="Belum Sekolah / SD / SMP / dsb"
                          value={c.status_pendidikan}
                          onChange={(e) => updateNewChild(idx, 'status_pendidikan', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {newChildren.length < 3 && (
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ fontSize: '.78rem', width: '100%', border: '1.5px dashed #CBD5E1', background: '#F8FAFC' }}
                    onClick={handleAddChildRow}
                  >
                    <Icon name="plus" size={14} /> Tambah Anak Lagi
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Batal
            </button>
            <button type="submit" className="btn-teal" disabled={saving}>
              {saving ? 'Menyimpan ke Database...' : <><Icon name="check" size={16} /> Simpan Data</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Modal Edit Data Profil Satuan (Agama, Kebangsaan, atau Alamat/Tempat Tinggal)
 * Ditampilkan tersendiri untuk masing-masing field agar tidak bertumpuk dalam satu window
 */
function SingleProfileEditModal({ mode, onClose, pegawai, onSave, saving }) {
  const AGAMA_OPTIONS = ['Islam', 'Kristen Protestan', 'Kristen Katolik', 'Hindu', 'Buddha', 'Konghucu'];

  const [val, setVal] = useState(() => {
    if (mode === 'agama') return pegawai?.agama || '';
    if (mode === 'kebangsaan') return pegawai?.kebangsaan || 'Indonesia';
    if (mode === 'alamat') return pegawai?.alamat || '';
    return '';
  });

  useEffect(() => {
    if (mode === 'agama') setVal(pegawai?.agama || '');
    else if (mode === 'kebangsaan') setVal(pegawai?.kebangsaan || 'Indonesia');
    else if (mode === 'alamat') setVal(pegawai?.alamat || '');
    else setVal('');
  }, [mode, pegawai]);

  // Validasi setelah pemanggilan hooks: jika mode null atau data sudah terisi, jangan render dialog
  if (!mode) return null;

  const currentValue = pegawai?.[mode];
  if (currentValue && String(currentValue).trim() !== '') {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!val || !val.toString().trim()) {
      return window.alert('Mohon lengkapi isian terlebih dahulu.');
    }
    if (mode === 'agama') onSave({ agama: val }, 'Data agama berhasil diperbarui!');
    else if (mode === 'kebangsaan') onSave({ kebangsaan: val.trim() }, 'Data kebangsaan berhasil diperbarui!');
    else if (mode === 'alamat') onSave({ alamat: val.trim() }, 'Data tempat tinggal berhasil diperbarui!');
  };

  const titles = {
    agama: {
      eyebrow: 'Lengkapi Data Profil',
      title: 'Agama Pegawai',
      desc: 'Pilih agama sesuai data resmi kepegawaian untuk lembar KP4.',
      btn: 'Simpan Agama'
    },
    kebangsaan: {
      eyebrow: 'Lengkapi Data Profil',
      title: 'Kewarganegaraan / Kebangsaan',
      desc: 'Status kebangsaan untuk dicantumkan pada surat KP4 resmi.',
      btn: 'Simpan Kebangsaan'
    },
    alamat: {
      eyebrow: 'Lengkapi Data Profil',
      title: 'Alamat / Tempat Tinggal',
      desc: 'Alamat tempat tinggal lengkap Anda saat ini (Butir 11 formulir KP4).',
      btn: 'Simpan Tempat Tinggal'
    }
  };

  const config = titles[mode] || titles.agama;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-title-badge" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
              <Icon name="shield" size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div className="eyebrow" style={{ color: '#6366F1', marginBottom: '2px' }}>
                {config.eyebrow}
              </div>
              <h2>{config.title}</h2>
              <p>{config.desc}</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Tutup">
            <Icon name="close" size={16} strokeWidth={2.2} />
            <span>Tutup</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            {mode === 'agama' && (
              <div className="field-group">
                <label className="field-label">
                  Pilihan Agama <span style={{ color: '#6366F1' }}>*</span>
                </label>
                <select
                  className="field-input"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  required
                  autoFocus
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">-- Pilih Agama --</option>
                  {AGAMA_OPTIONS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <span style={{ fontSize: '.75rem', color: '#94A3B8', marginTop: 4, display: 'block' }}>
                  Akan tercetak pada butir 4 formulir KP4 resmi.
                </span>
              </div>
            )}

            {mode === 'kebangsaan' && (
              <div className="field-group">
                <label className="field-label">
                  Kebangsaan / Kewarganegaraan <span style={{ color: '#6366F1' }}>*</span>
                </label>
                <input
                  className="field-input"
                  type="text"
                  placeholder="Contoh: Indonesia"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  required
                  autoFocus
                />
                <span style={{ fontSize: '.75rem', color: '#94A3B8', marginTop: 4, display: 'block' }}>
                  Isi "Indonesia" untuk WNI, atau kewarganegaraan lain jika berlaku (Butir 5 KP4).
                </span>
              </div>
            )}

            {mode === 'alamat' && (
              <div className="field-group">
                <label className="field-label">
                  Alamat / Tempat Tinggal Lengkap <span style={{ color: '#6366F1' }}>*</span>
                </label>
                <textarea
                  className="field-input"
                  rows={3}
                  placeholder="Contoh: Jl. Tadulako No. 12, Palu, Sulawesi Tengah"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  required
                  autoFocus
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
                <span style={{ fontSize: '.75rem', color: '#94A3B8', marginTop: 4, display: 'block' }}>
                  Akan dicetak pada butir 11 formulir KP4 resmi.
                </span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan…' : (
                <><Icon name="check" size={15} /> {config.btn}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PegawaiPage() {
  const [nip, setNip] = useState('');

  const [tanggalLahir, setTanggalLahir] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [printing, setPrinting] = useState(false);

  // Modal State (Keluarga)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('all'); // 'pasangan' | 'anak' | 'all'
  const [savingModal, setSavingModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State (Profil per fitur: 'agama' | 'kebangsaan' | 'alamat' | null)
  const [profileModalMode, setProfileModalMode] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const openModal = (mode = 'all') => {
    setModalMode(mode);
    setModalOpen(true);
  };

  const needsCompletion = useMemo(() => {
    if (!data) return false;
    const noPasangan = !data.pasangan || data.pasangan.length === 0;
    const noAnak = !data.anak || data.anak.length === 0;
    const missingPasanganFields =
      data.pasangan?.[0] &&
      (!data.pasangan[0].tempat_lahir || !data.pasangan[0].pekerjaan || !data.pasangan[0].tanggal_menikah);
    const missingAnakFields = data.anak?.some((a) => !a.tempat_lahir || !a.status_pendidikan);
    return noPasangan || noAnak || missingPasanganFields || missingAnakFields;
  }, [data]);

  const handleProfileSave = async (pegawaiUpdate, labelSukses) => {
    // Pengamanan: jika data yang ingin diisi sudah ada di database, cegah perubahan oleh user
    for (const key of Object.keys(pegawaiUpdate)) {
      if (data && data[key] && String(data[key]).trim() !== '') {
        window.alert(`Data ${key} sudah terdaftar dan tidak dapat diubah secara mandiri oleh pegawai.`);
        setProfileModalMode(null);
        return;
      }
    }
    setSavingProfile(true);
    try {
      const res = await api.post('/print/complete-data', {
        nip: data.nip,
        tanggal_lahir: tanggalLahir,
        pegawai_update: pegawaiUpdate
      });
      setData(res.data.pegawai);
      setProfileModalMode(null);
      setSuccessMsg(labelSukses || 'Data berhasil disimpan!');
    } catch (err) {
      window.alert(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setData(null);
    setSuccessMsg('');
    try {
      const res = await api.post('/print/validate', { nip, tanggal_lahir: tanggalLahir });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan saat memverifikasi data.');
    } finally {
      setLoading(false);
    }
  };

  // handleSaveMasaKerja dihapus — MKG kini otomatis dari server

  const handleModalSave = async ({ pegawai_update, pasangan_update, anak_updates, pasangan_baru, anak_baru }) => {
    setSavingModal(true);
    try {
      const res = await api.post('/print/complete-data', {
        nip: data.nip,
        tanggal_lahir: tanggalLahir,
        pegawai_update,
        pasangan_update,
        anak_updates,
        pasangan_baru,
        anak_baru
      });
      setData(res.data.pegawai);
      setModalOpen(false);
      setSuccessMsg('Data keluarga berhasil disimpan permanen ke database!');
    } catch (err) {
      window.alert(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setSavingModal(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const res = await api.post('/print/generate', { nip }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `KP4_${nip}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.alert('Gagal mencetak PDF.');
    } finally {
      setPrinting(false);
    }
  };

  const persen = data?.persen_kenaikan_kgb || 3.15;
  const mkgInfo = data?.mkg_otomatis_info || null;
  const est = useMemo(() => {
    if (!data) return null;
    const tahun = Math.max(0, Math.floor(Number(data.mkg_tahun) || 0));
    let gaji = null;
    if (data.tabel_gaji && data.golongan) {
      const norm = normalizeGolongan(data.golongan);
      const golTable = data.tabel_gaji[norm];
      if (golTable) {
        const mkgFloor = Math.floor(tahun / 2) * 2;
        gaji = golTable[tahun] || golTable[mkgFloor] || null;
      }
    }
    if (!gaji) {
      gaji = hitungGaji(data.golongan, tahun, persen) || Number(data.gaji_pokok);
    }
    const jp = Math.min(1, data.pasangan?.length || 0);
    const ja = Math.min(2, data.anak?.length || 0);
    const tp = Math.round(gaji * 0.1 * jp);
    const ta = Math.round(gaji * 0.02 * ja);
    return { tahun, steps: Math.floor(tahun / 2), gaji, jp, ja, tp, ta, total: tp + ta, bruto: gaji + tp + ta };
  }, [data, persen]);

  const gAktif = Number(data?.gaji_pokok) || 0;
  const jpA = Math.min(1, data?.pasangan?.length || 0);
  const jaA = Math.min(2, data?.anak?.length || 0);
  const tpA = Math.round(gAktif * 0.1 * jpA);
  const taA = Math.round(gAktif * 0.02 * jaA);

  return (
    <main className="public-main">
      {data && modalOpen && (
        <FamilyModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          mode={modalMode}
          pegawai={data}
          onSave={handleModalSave}
          saving={savingModal}
        />
      )}
      {data && profileModalMode && (
        <SingleProfileEditModal
          mode={profileModalMode}
          onClose={() => setProfileModalMode(null)}
          pegawai={data}
          onSave={handleProfileSave}
          saving={savingProfile}
        />
      )}

      <section className="public-hero page-wrap">
        <div className="hero-copy fade-up">
          <div className="eyebrow">Portal layanan mandiri</div>
          <h1>
            Urus surat KP4,
            <br />
            <em>lebih sederhana.</em>
          </h1>
          <p>
            Verifikasi identitas Anda, sesuaikan masa kerja dengan kalkulasi otomatis kenaikan berkala tiap 2 tahun, dan
            unduh surat resmi dalam hitungan menit.
          </p>
          <div className="hero-note">
            <span className="note-icon">
              <Icon name="shield" size={16} />
            </span>
            <span>Kenaikan berkala tiap 2 tahun dihitung otomatis ({persen}%).</span>
          </div>
        </div>

        <div className="verify-card soft-card fade-up">
          <div className="card-kicker">
            <span className="step-badge">01</span>
            <span>Verifikasi identitas Pegawai</span>
          </div>
          <h2>Temukan data Anda</h2>
          <p className="card-intro">Masukkan NIP dan tanggal lahir sesuai data kepegawaian.</p>
          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label className="field-label">
                NIP <span>(18 digit)</span>
              </label>
              <input
                className="field-input"
                type="text"
                inputMode="numeric"
                placeholder="198001012005011001"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                maxLength={18}
                required
              />
            </div>
            <div className="form-group">
              <label className="field-label">Tanggal lahir</label>
              <input
                className="field-input"
                type="date"
                value={tanggalLahir}
                onChange={(e) => setTanggalLahir(e.target.value)}
                required
              />
            </div>
            {error && <div className="error-box">{error}</div>}
            <button className="btn-primary full-btn" type="submit" disabled={loading}>
              {loading ? 'Memverifikasi…' : <>Verifikasi data <Icon name="arrow" size={16} /></>}
            </button>
          </form>
          <div className="form-footnote">
            <span className="tiny-dot" /> Sistem aktif · Layanan tersedia 24 jam
          </div>
        </div>
      </section>

      <section className="benefit-strip page-wrap">
        <div>
          <span className="benefit-icon">
            <Icon name="shield" size={18} />
          </span>
          <span>
            <strong>Aman &amp; terverifikasi</strong>
            <small>Validasi langsung dari basis data</small>
          </span>
        </div>
        <div>
          <span className="benefit-icon terracotta">
            <Icon name="file" size={18} />
          </span>
          <span>
            <strong>Surat resmi digital</strong>
            <small>Format resmi siap cetak</small>
          </span>
        </div>
        <div>
          <span className="benefit-icon navy">
            <Icon name="heart" size={18} />
          </span>
          <span>
            <strong>Input Masa Kerja</strong>
            <small>Kenaikan {persen}% per 2 tahun</small>
          </span>
        </div>
      </section>

      {data && (
        <section className="result-card soft-card page-wrap fade-up">
          {successMsg && (
            <div className="completion-success-banner">
              <Icon name="check" size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {needsCompletion && (
            <div className="completion-reminder-banner">
              <div className="banner-content">
                <span className="banner-icon">
                  <Icon name="alert" size={18} />
                </span>
                <div>
                  <div className="banner-title">Data Keluarga Belum Lengkap</div>
                  <p className="banner-sub">
                    Lengkapi data pasangan atau anak agar tunjangan keluarga otomatis tercantum pada lembar surat KP4 Anda.
                  </p>
                </div>
              </div>
              <button type="button" className="btn-banner-action" onClick={() => openModal('all')}>
                Lengkapi Data Sekarang →
              </button>
            </div>
          )}

          <div className="result-header">
            <div>
              <div className="eyebrow">02 · Dashboard Pegawai</div>
              <h2>Profil &amp; Pengaturan Masa Kerja</h2>
              <p>Periksa data dan atur masa kerja untuk memperbarui surat KP4.</p>
            </div>
            <span className="status-pill">Terverifikasi</span>
          </div>

          {/* === MKG OTOMATIS === */}
          <div className="user-mkg-calculator-box">
            <div className="mkg-box-header">
              <div className="mkg-badge-icon">
                <Icon name="file" size={20} />
              </div>
              <div>
                <h3>Masa Kerja Golongan (MKG) — Otomatis</h3>
                <p>
                  Dihitung otomatis dari <strong>{mkgInfo?.sumber_tmt || 'TMT Pangkat/CPNS'}</strong>.
                  Diperbarui setiap login.
                </p>
              </div>
            </div>

            {/* Banner sumber TMT */}
            <div
              style={{
                background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
                border: '1px solid #BAE6FD',
                borderRadius: '12px',
                padding: '14px 18px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap'
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#0EA5E9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Icon name="shield" size={18} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#0C4A6E' }}>
                  Referensi: {mkgInfo?.sumber_tmt || 'TMT Pangkat/CPNS'}
                </div>
                <div style={{ fontSize: '.78rem', color: '#0369A1', marginTop: 2 }}>
                  Tanggal TMT:{' '}
                  <strong>
                    {mkgInfo?.tmt_referensi
                      ? new Date(mkgInfo.tmt_referensi).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })
                      : '-'}
                  </strong>
                  {mkgInfo?.mkg_offset_tahun !== 0 && mkgInfo?.mkg_offset_tahun != null && (
                    <span
                      style={{
                        marginLeft: 8,
                        background: '#FEF3C7',
                        color: '#92400E',
                        borderRadius: 6,
                        padding: '1px 7px',
                        fontSize: '.75rem',
                        fontWeight: 700
                      }}
                    >
                      Offset: {mkgInfo.mkg_offset_tahun > 0 ? '+' : ''}{mkgInfo.mkg_offset_tahun} Thn
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  textAlign: 'right',
                  background: '#fff',
                  borderRadius: 10,
                  padding: '10px 18px',
                  boxShadow: '0 1px 4px rgba(0,0,0,.07)'
                }}
              >
                <div style={{ fontSize: '.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  MKG Aktif
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1, marginTop: 2 }}>
                  {data.mkg_tahun ?? 0}
                  <span style={{ fontSize: '.9rem', fontWeight: 600, color: '#475569' }}> Thn</span>{' '}
                  {data.mkg_bulan ?? 0}
                  <span style={{ fontSize: '.9rem', fontWeight: 600, color: '#475569' }}> Bln</span>
                </div>
              </div>
            </div>

            {est && (
              <div className="calc-preview-grid">
                <div className="preview-card">
                  <span className="p-label">Step Kenaikan (Tiap 2 Thn)</span>
                  <strong className="p-val">{est.steps}x Kenaikan</strong>
                  <span className="p-sub">Dari {est.tahun} tahun MKG</span>
                </div>
                <div className="preview-card highlight">
                  <span className="p-label">Gaji Pokok Kalkulasi</span>
                  <strong className="p-val high">Rp {formatCurrency(est.gaji)}</strong>
                  <span className="p-sub high">+{persen}% per 2 thn</span>
                </div>
                <div className="preview-card">
                  <span className="p-label">Tunjangan Keluarga</span>
                  <strong className="p-val">Rp {formatCurrency(est.total)}</strong>
                  <span className="p-sub">Suami/Istri (10%) + Anak (2%×{est.ja})</span>
                </div>
                <div className="preview-card accent">
                  <span className="p-label">Total Gaji Bruto</span>
                  <strong className="p-val accent">Rp {formatCurrency(est.bruto)}</strong>
                  <span className="p-sub">Gaji Pokok + Tunjangan</span>
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: '.76rem',
                color: '#64748B',
                lineHeight: 1.6
              }}
            >
              <Icon name="shield" size={12} />{' '}
              <strong>Aturan BKN:</strong> MKG dihitung sejak TMT Pangkat saat ini. Naik pangkat dalam golongan yang sama (III/a→III/b): MKG mulai dari 0.
              Naik pangkat lintas golongan (II→III): MKG dipotong sesuai ketentuan BKN (diatur admin).
            </div>
          </div>

          <div className="result-section">
            <h3>
              <span className="section-line" />
              Data Pegawai
            </h3>
            <div className="info-grid">
              <InfoItem label="NIP" value={data.nip} />
              <InfoItem label="Nama lengkap" value={data.nama} />
              <InfoItem label="Tempat / tanggal lahir" value={`${data.tempat_lahir || '-'}, ${formatDate(data.tanggal_lahir)}`} />
              <InfoItem label="Golongan" value={data.golongan} />
              <InfoItem label="Jabatan" value={data.jabatan} />
              <InfoItem label="Unit kerja" value={data.unit_kerja} />
              <InfoItem label="MKG Aktif" value={`${data.mkg_tahun ?? 0} Tahun ${data.mkg_bulan ?? 0} Bulan`} />
              <InfoItem label="TMT KGB Terakhir" value={formatDate(data.tmt_kgb_terakhir)} />
              <InfoItem label="Status KGB" value={data.status_kgb || 'Normal'} />

              {/* Agama — jika sudah ada tidak bisa diubah oleh user */}
              <div className="info-item">
                <span>Agama</span>
                {data.agama ? (
                  <strong>{data.agama}</strong>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: '#FEF3C7',
                        color: '#92400E',
                        fontSize: '.72rem',
                        fontWeight: 700,
                        borderRadius: 6,
                        padding: '2px 8px',
                        border: '1px solid #FCD34D'
                      }}
                    >
                      ⚠ Belum diisi
                    </span>
                    <button
                      type="button"
                      onClick={() => setProfileModalMode('agama')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6366F1',
                        fontSize: '.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        textDecoration: 'underline'
                      }}
                    >
                      Isi sekarang →
                    </button>
                  </span>
                )}
              </div>

              {/* Kebangsaan — jika sudah ada tidak bisa diubah oleh user */}
              <div className="info-item">
                <span>Kebangsaan</span>
                {data.kebangsaan ? (
                  <strong>{data.kebangsaan}</strong>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: '#FEF3C7',
                        color: '#92400E',
                        fontSize: '.72rem',
                        fontWeight: 700,
                        borderRadius: 6,
                        padding: '2px 8px',
                        border: '1px solid #FCD34D'
                      }}
                    >
                      ⚠ Belum diisi
                    </span>
                    <button
                      type="button"
                      onClick={() => setProfileModalMode('kebangsaan')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6366F1',
                        fontSize: '.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        textDecoration: 'underline'
                      }}
                    >
                      Isi sekarang →
                    </button>
                  </span>
                )}
              </div>

              {/* Alamat / Tempat Tinggal — jika sudah ada tidak bisa diubah oleh user */}
              <div className="info-item">
                <span>Alamat / Tempat tinggal</span>
                {data.alamat ? (
                  <strong style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{data.alamat}</strong>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: '#FEF3C7',
                        color: '#92400E',
                        fontSize: '.72rem',
                        fontWeight: 700,
                        borderRadius: 6,
                        padding: '2px 8px',
                        border: '1px solid #FCD34D'
                      }}
                    >
                      ⚠ Belum diisi
                    </span>
                    <button
                      type="button"
                      onClick={() => setProfileModalMode('alamat')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6366F1',
                        fontSize: '.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        textDecoration: 'underline'
                      }}
                    >
                      Isi sekarang →
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>



          <div className="result-section">
            <h3>
              <span className="section-line terracotta-line" />
              Rincian Tunjangan Keluarga
            </h3>
            <div className="info-grid">
              <InfoItem label="Gaji Pokok" value={`Rp ${formatCurrency(gAktif)}`} />
              <InfoItem label="Tunjangan Suami/Istri (10%)" value={`Rp ${formatCurrency(tpA)} (${jpA} terdaftar)`} />
              <InfoItem label="Tunjangan Anak (2%/anak)" value={`Rp ${formatCurrency(taA)} (${jaA} tertanggung)`} />
              <InfoItem label="Total Tunjangan" value={`Rp ${formatCurrency(tpA + taA)}`} />
              <InfoItem label="Total Gaji Bruto" value={`Rp ${formatCurrency(gAktif + tpA + taA)}`} />
            </div>
          </div>

          <div className="result-section">
            <h3>
              <span className="section-line" />
              Data Keluarga
            </h3>
            <div className="family-grid">
              {/* Kolom Pasangan */}
              {data.pasangan?.length ? (
                <div className="family-panel">
                  <div>
                    <div className="family-panel-header">
                      <span className="family-label" style={{ margin: 0 }}>Pasangan (Suami/Istri)</span>
                      <span className="family-badge green">Terdaftar (10%)</span>
                    </div>
                    <strong>{data.pasangan[0].nama}</strong>
                    <p>
                      {data.pasangan[0].pekerjaan || 'Pekerjaan belum diisi'} · Menikah{' '}
                      {formatDate(data.pasangan[0].tanggal_menikah)}
                    </p>
                    <p style={{ marginTop: 4, fontSize: '.78rem', color: '#64748B' }}>
                      Lahir: {data.pasangan[0].tempat_lahir || '-'}, {formatDate(data.pasangan[0].tanggal_lahir)}
                    </p>
                    <p style={{ marginTop: 4, fontSize: '.82rem', color: '#334155' }}>
                      Penghasilan:{' '}
                      <strong>
                        {data.pasangan[0].penghasilan && Number(data.pasangan[0].penghasilan) > 0
                          ? `Rp ${formatCurrency(data.pasangan[0].penghasilan)}/bulan`
                          : 'Tidak Berpenghasilan'}
                      </strong>
                    </p>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <button type="button" className="btn-edit-family" onClick={() => openModal('pasangan')}>
                      <Icon name="edit" size={14} /> Ubah / Lengkapi Data Pasangan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="family-panel-empty">
                  <div className="family-empty-icon">
                    <Icon name="heart" size={22} />
                  </div>
                  <div className="family-empty-title">Belum Ada Data Pasangan</div>
                  <div className="family-empty-desc">
                    Tambahkan data suami atau istri Anda untuk mengaktifkan hak tunjangan keluarga 10% dari gaji pokok.
                  </div>
                  <button type="button" className="btn-add-family" onClick={() => openModal('pasangan')}>
                    <Icon name="plus" size={15} /> Tambah Data Pasangan
                  </button>
                </div>
              )}

              {/* Kolom Anak */}
              {data.anak?.length ? (
                <div className="family-panel">
                  <div>
                    <div className="family-panel-header">
                      <span className="family-label" style={{ margin: 0 }}>
                        Data Anak ({data.anak.length} terdaftar)
                      </span>
                      <button
                        type="button"
                        className="btn-edit-family"
                        style={{ padding: '4px 9px', fontSize: '.72rem' }}
                        onClick={() => openModal('anak')}
                      >
                        <Icon name="plus" size={12} /> Tambah Anak
                      </button>
                    </div>
                    {data.anak.map((a) => (
                      <div key={a.id} className="child-item-box">
                        <div className="child-item-head">
                          <strong>{a.nama}</strong>
                          <span className="family-badge blue">{a.status_anak || 'Kandung'}</span>
                        </div>
                        <div style={{ fontSize: '.78rem', color: '#64748B' }}>
                          Lahir: {a.tempat_lahir || '-'}, {formatDate(a.tanggal_lahir)} · Pendidikan:{' '}
                          {a.status_pendidikan || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <button type="button" className="btn-edit-family" onClick={() => openModal('all')}>
                      <Icon name="edit" size={14} /> Kelola / Lengkapi Data Anak
                    </button>
                  </div>
                </div>
              ) : (
                <div className="family-panel-empty">
                  <div className="family-empty-icon">
                    <Icon name="users" size={22} />
                  </div>
                  <div className="family-empty-title">Belum Ada Data Anak</div>
                  <div className="family-empty-desc">
                    Tambahkan data anak tanggungan untuk mendapatkan tunjangan 2% per anak (maksimal 2 anak).
                  </div>
                  <button type="button" className="btn-add-family" onClick={() => openModal('anak')}>
                    <Icon name="plus" size={15} /> Tambah Data Anak
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="result-action">
            <p>
              <Icon name="check" size={18} /> Data dan masa kerja sudah sesuai? Unduh surat resmi KP4 Anda.
            </p>
            <button className="btn-teal" onClick={handlePrint} disabled={printing}>
              {printing ? 'Menyiapkan PDF…' : <>Unduh surat KP4 <Icon name="download" size={17} /></>}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default PegawaiPage;