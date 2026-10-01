import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Icon from '../components/Icon';
import TABEL_GAJI_OFFICIAL from '../data/tabel_gaji_2024.json';

const dateOnly = (value) => value ? String(value).split('T')[0] : '';
const prettyDate = (value) => value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const formatRupiah = (val) => val == null ? '—' : 'Rp ' + Number(val).toLocaleString('id-ID');

// Tabel dasar 2024 untuk client-side helper (fallback)
const GAJI_DASAR_2024 = {
  'I/a': 1685700, 'I/b': 1840800, 'I/c': 1918700, 'I/d': 1999900,
  'II/a': 2184000, 'II/b': 2385000, 'II/c': 2485900, 'II/d': 2591100,
  'III/a': 2785700, 'III/b': 2903600, 'III/c': 3026400, 'III/d': 3154400,
  'IV/a': 3287800, 'IV/b': 3426900, 'IV/c': 3571900, 'IV/d': 3723000, 'IV/e': 3880400,
  'IX': 3203300
};

const normalizeGolongan = (golongan) => {
  if (!golongan) return '';
  const trimmed = String(golongan).trim();
  const parts = trimmed.split('/');
  if (parts.length === 2) {
    return `${parts[0].toUpperCase()}/${parts[1].toLowerCase()}`;
  }
  return trimmed.toUpperCase();
};

const hitungGajiOtomatis2024 = (golongan, mkgTahun, persenRate = 3.15) => {
  if (!golongan) return null;
  const norm = normalizeGolongan(golongan);
  const tahun = Math.max(0, Math.floor(Number(mkgTahun) || 0));

  // Ambil langsung dari tabel resmi PP No. 5 Tahun 2024 jika cocok
  if (TABEL_GAJI_OFFICIAL && TABEL_GAJI_OFFICIAL[norm]) {
    const table = TABEL_GAJI_OFFICIAL[norm];
    if (table[tahun] != null) return table[tahun];
    const mkgFloor = Math.floor(tahun / 2) * 2;
    if (table[mkgFloor] != null) return table[mkgFloor];
    const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
    if (keys.length > 0 && tahun >= keys[keys.length - 1]) {
      return table[keys[keys.length - 1]];
    }
  }

  const base = GAJI_DASAR_2024[norm];
  if (!base) return null;
  const steps = Math.floor(tahun / 2);
  const rate = (Number(persenRate) || 3.15) / 100;
  return Math.round(base * Math.pow(1 + rate, steps));
};

const hitungMKGClient = (tmtPangkat, tmtCpns, offsetTahun = 0) => {
  let refDate = null;
  let sumber = 'Belum diisi';

  if (tmtPangkat) {
    const d = new Date(tmtPangkat);
    if (!isNaN(d.getTime())) {
      refDate = d;
      sumber = 'TMT Pangkat';
    }
  }
  if (!refDate && tmtCpns) {
    const d = new Date(tmtCpns);
    if (!isNaN(d.getTime())) {
      refDate = d;
      sumber = 'TMT CPNS';
    }
  }

  if (!refDate) {
    return { tahun: 0, bulan: 0, sumber: 'Belum diisi', refDateStr: null };
  }

  const now = new Date();
  let totalBulan =
    (now.getFullYear() - refDate.getFullYear()) * 12 +
    (now.getMonth() - refDate.getMonth());
  if (now.getDate() < refDate.getDate()) totalBulan--;

  totalBulan += (Number(offsetTahun) || 0) * 12;
  if (totalBulan < 0) totalBulan = 0;

  const tahun = Math.floor(totalBulan / 12);
  const bulan = totalBulan % 12;

  return {
    tahun,
    bulan,
    sumber,
    refDateStr: refDate.toISOString().split('T')[0]
  };
};

function Field({ label, hint, children }) {
  return (
    <label className="field-group">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon name="users" size={21} /></span>
      <p>{text}</p>
    </div>
  );
}

function DashboardPage() {
  const [pegawaiList, setPegawaiList] = useState([]);
  const [kgbEligibleList, setKgbEligibleList] = useState([]);
  const [activeTab, setActiveTab] = useState('direktori'); // 'direktori' | 'kgb' | 'pengaturan'
  const [selectedNip, setSelectedNip] = useState(null);
  const [selectedPegawai, setSelectedPegawai] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formPegawai, setFormPegawai] = useState({});
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Pengaturan persentase KGB oleh admin/sistem
  const [persenSetting, setPersenSetting] = useState(3.15);
  const [savingSetting, setSavingSetting] = useState(false);
  const [settingMsg, setSettingMsg] = useState('');

  // Pengaturan Pejabat Penandatangan (Kepala Sub Bagian)
  const [kepalaSubNama, setKepalaSubNama] = useState('');
  const [kepalaSubPangkat, setKepalaSubPangkat] = useState('');
  const [kepalaSubNip, setKepalaSubNip] = useState('');

  const [formPasangan, setFormPasangan] = useState({});
  const [isAddingPasangan, setIsAddingPasangan] = useState(false);
  const [editingPasangan, setEditingPasangan] = useState(false);
  const [formAnak, setFormAnak] = useState({});
  const [isAddingAnak, setIsAddingAnak] = useState(false);
  const [editingAnakId, setEditingAnakId] = useState(null);

  // Data keluarga saat registrasi pegawai baru
  const [hasNewPasangan, setHasNewPasangan] = useState(false);
  const [newPasangan, setNewPasangan] = useState({
    nama: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    pekerjaan: '',
    tanggal_menikah: ''
  });

  const [hasNewAnak, setHasNewAnak] = useState(false);
  const [newAnakList, setNewAnakList] = useState([]);

  const handleAddNewAnakRow = () => {
    setNewAnakList(prev => [
      ...prev,
      {
        nama: '',
        tempat_lahir: '',
        tanggal_lahir: '',
        status_anak: 'Kandung',
        status_pendidikan: ''
      }
    ]);
  };

  const handleUpdateNewAnak = (index, field, value) => {
    setNewAnakList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveNewAnakRow = (index) => {
    setNewAnakList(prev => prev.filter((_, i) => i !== index));
  };

  const toggleHasNewAnak = (checked) => {
    setHasNewAnak(checked);
    if (checked && newAnakList.length === 0) {
      handleAddNewAnakRow();
    }
  };

  useEffect(() => {
    fetchPegawaiList();
    fetchKgbEligible();
    fetchSettings();
  }, [refresh]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isAdding) setIsAdding(false);
        if (selectedPegawai) {
          setSelectedPegawai(null);
          setSelectedNip(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdding, selectedPegawai]);

  const fetchPegawaiList = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/pegawai');
      setPegawaiList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchKgbEligible = async () => {
    try {
      const res = await api.get('/admin/kgb/eligible');
      setKgbEligibleList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      if (res.data.persen_kenaikan_kgb != null) {
        setPersenSetting(Number(res.data.persen_kenaikan_kgb));
      }
      if (res.data.kepala_sub_nama != null) setKepalaSubNama(res.data.kepala_sub_nama);
      if (res.data.kepala_sub_pangkat != null) setKepalaSubPangkat(res.data.kepala_sub_pangkat);
      if (res.data.kepala_sub_nip != null) setKepalaSubNip(res.data.kepala_sub_nip);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSetting = async (e) => {
    e.preventDefault();
    setSavingSetting(true);
    setSettingMsg('');
    try {
      const res = await api.post('/admin/settings', {
        persen_kenaikan_kgb: persenSetting,
        kepala_sub_nama: kepalaSubNama,
        kepala_sub_pangkat: kepalaSubPangkat,
        kepala_sub_nip: kepalaSubNip
      });
      setSettingMsg(res.data.message || 'Pengaturan berhasil disimpan!');
      setRefresh(v => v + 1);
    } catch (err) {
      window.alert(err.response?.data?.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSavingSetting(false);
    }
  };

  const loadPegawaiDetail = async (nip) => {
    try {
      const res = await api.get(`/admin/pegawai/${nip}`);
      setSelectedPegawai(res.data);
      setSelectedNip(nip);
      setFormPegawai({
        nip: res.data.nip,
        nama: res.data.nama,
        tempat_lahir: res.data.tempat_lahir,
        tanggal_lahir: res.data.tanggal_lahir,
        golongan: res.data.golongan,
        jabatan: res.data.jabatan,
        unit_kerja: res.data.unit_kerja,
        gaji_pokok: res.data.gaji_pokok,
        tmt_pangkat: res.data.tmt_pangkat || '',
        tmt_cpns: res.data.tmt_cpns || '',
        tmt_kgb_terakhir: res.data.tmt_kgb_terakhir || '',
        mkg_offset: res.data.mkg_offset ?? 0,
        mkg_tahun: res.data.mkg_tahun ?? 0,
        mkg_bulan: res.data.mkg_bulan ?? 0,
        status_kgb: res.data.status_kgb || 'Normal',
        agama: res.data.agama || '',
        kebangsaan: res.data.kebangsaan || 'Indonesia',
        alamat: res.data.alamat || ''
      });
      setIsAdding(false);
      setIsAddingPasangan(false);
      setEditingPasangan(false);
      setIsAddingAnak(false);
      setEditingAnakId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const updatePegawai = (key, value) => {
    setFormPegawai(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'tmt_pangkat' || key === 'tmt_cpns' || key === 'mkg_offset') {
        const tmtPkt = key === 'tmt_pangkat' ? value : prev.tmt_pangkat;
        const tmtCpns = key === 'tmt_cpns' ? value : prev.tmt_cpns;
        const mkgOff = key === 'mkg_offset' ? value : prev.mkg_offset;
        if (tmtPkt || tmtCpns) {
          const autoMkg = hitungMKGClient(tmtPkt, tmtCpns, mkgOff);
          next.mkg_tahun = autoMkg.tahun;
          next.mkg_bulan = autoMkg.bulan;
          if (next.golongan && !prev._manualGaji) {
            const autoGaji = hitungGajiOtomatis2024(next.golongan, autoMkg.tahun, persenSetting);
            if (autoGaji) next.gaji_pokok = autoGaji;
          }
        }
      }
      return next;
    });
  };

  const handleSyncMkgDariTmt = () => {
    const autoMkg = hitungMKGClient(formPegawai.tmt_pangkat, formPegawai.tmt_cpns, formPegawai.mkg_offset);
    setFormPegawai(prev => {
      const updated = {
        ...prev,
        mkg_tahun: autoMkg.tahun,
        mkg_bulan: autoMkg.bulan
      };
      if (prev.golongan && !prev._manualGaji) {
        const autoGaji = hitungGajiOtomatis2024(prev.golongan, autoMkg.tahun, persenSetting);
        if (autoGaji) updated.gaji_pokok = autoGaji;
      }
      return updated;
    });
  };

  const handleMkgTahunChange = (e) => {
    const val = e.target.value === '' ? '' : Number(e.target.value);
    setFormPegawai(prev => {
      const updated = { ...prev, mkg_tahun: val };
      if (val !== '' && prev.golongan && !prev._manualGaji) {
        const autoGaji = hitungGajiOtomatis2024(prev.golongan, val, persenSetting);
        if (autoGaji) updated.gaji_pokok = autoGaji;
      }
      return updated;
    });
  };

  const handleGolonganChange = (e) => {
    const val = e.target.value;
    setFormPegawai(prev => {
      const updated = { ...prev, golongan: val };
      if (val && prev.mkg_tahun != null && !prev._manualGaji) {
        const autoGaji = hitungGajiOtomatis2024(val, prev.mkg_tahun, persenSetting);
        if (autoGaji) updated.gaji_pokok = autoGaji;
      }
      return updated;
    });
  };

  const handleHitungOtomatisGaji = () => {
    const calc = hitungGajiOtomatis2024(formPegawai.golongan, formPegawai.mkg_tahun, persenSetting);
    if (calc) {
      updatePegawai('gaji_pokok', calc);
      updatePegawai('_manualGaji', false);
    } else {
      window.alert('Golongan tidak dikenali atau masa kerja belum diisi.');
    }
  };

  const handleSavePegawai = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formPegawai,
        tmt_pangkat: formPegawai.tmt_pangkat || null,
        tmt_cpns: formPegawai.tmt_cpns || null,
        tmt_kgb_terakhir: formPegawai.tmt_kgb_terakhir || null,
        mkg_offset: Number(formPegawai.mkg_offset) || 0,
        mkg_tahun: Number(formPegawai.mkg_tahun) || 0,
        mkg_bulan: Number(formPegawai.mkg_bulan) || 0
      };
      delete payload._manualGaji;

      if (isAdding) {
        await api.post('/admin/pegawai', payload);
        const createdNip = payload.nip;

        // Simpan data Pasangan jika diaktifkan dan nama terisi
        if (hasNewPasangan && newPasangan.nama?.trim()) {
          try {
            await api.post('/admin/pasangan', {
              ...newPasangan,
              nip: createdNip,
              tempat_lahir: newPasangan.tempat_lahir || null,
              tanggal_lahir: newPasangan.tanggal_lahir || null,
              pekerjaan: newPasangan.pekerjaan || null,
              tanggal_menikah: newPasangan.tanggal_menikah || null
            });
          } catch (errPasangan) {
            console.error('Gagal menyimpan pasangan baru:', errPasangan);
          }
        }

        // Simpan data Anak jika diaktifkan dan ada anak yang terisi namanya
        if (hasNewAnak && newAnakList.length > 0) {
          for (const anak of newAnakList) {
            if (anak.nama?.trim()) {
              try {
                await api.post('/admin/anak', {
                  ...anak,
                  nip: createdNip,
                  tempat_lahir: anak.tempat_lahir || null,
                  tanggal_lahir: anak.tanggal_lahir || null,
                  status_anak: anak.status_anak || 'Kandung',
                  status_pendidikan: anak.status_pendidikan || null
                });
              } catch (errAnak) {
                console.error('Gagal menyimpan anak baru:', errAnak);
              }
            }
          }
        }

        const msgKeluarga = (hasNewPasangan && newPasangan.nama?.trim()) || (hasNewAnak && newAnakList.some(a => a.nama?.trim()))
          ? 'Pegawai dan data keluarga berhasil ditambahkan!'
          : 'Pegawai berhasil ditambahkan!';
        window.alert(msgKeluarga);
        setIsAdding(false);
        setHasNewPasangan(false);
        setNewPasangan({ nama: '', tempat_lahir: '', tanggal_lahir: '', pekerjaan: '', tanggal_menikah: '' });
        setHasNewAnak(false);
        setNewAnakList([]);
      } else {
        await api.put(`/admin/pegawai/${payload.nip}`, payload);
        window.alert('Data pegawai berhasil diperbarui');
      }
      setRefresh(v => v + 1);
      if (payload.nip) loadPegawaiDetail(payload.nip);
    } catch (err) {
      window.alert(err.response?.data?.message || 'Gagal menyimpan data pegawai');
    }
  };

  const handleDeletePegawai = async (nip) => {
    if (!window.confirm(`Hapus pegawai dengan NIP ${nip}? Data keluarga ikut terhapus.`)) return;
    try {
      await api.delete(`/admin/pegawai/${nip}`);
      setRefresh(v => v + 1);
      if (selectedNip === nip) {
        setSelectedPegawai(null);
        setSelectedNip(null);
      }
      window.alert('Pegawai berhasil dihapus');
    } catch {
      window.alert('Gagal menghapus data pegawai');
    }
  };

  const handleProcessKgb = async (nip, nama) => {
    if (!window.confirm(`Proses Kenaikan Gaji Berkala (KGB +${persenSetting}% & MKG +2 Tahun) untuk ${nama} (${nip})?`)) return;
    try {
      const res = await api.post(`/admin/kgb/process/${nip}`);
      window.alert(res.data.message || 'KGB berhasil diproses!');
      setRefresh(v => v + 1);
      if (selectedNip === nip) loadPegawaiDetail(nip);
    } catch (err) {
      window.alert(err.response?.data?.message || 'Gagal memproses KGB');
    }
  };

  const handleSavePasangan = async (e) => {
    e.preventDefault();
    try {
      if (isAddingPasangan) {
        await api.post('/admin/pasangan', { ...formPasangan, nip: selectedNip });
      } else {
        await api.put(`/admin/pasangan/${formPasangan.id}`, formPasangan);
      }
      setIsAddingPasangan(false);
      setEditingPasangan(false);
      await loadPegawaiDetail(selectedNip);
      setRefresh(v => v + 1);
    } catch (err) {
      window.alert(err.response?.data?.message || 'Gagal menyimpan data pasangan');
    }
  };

  const handleDeletePasangan = async (id) => {
    if (!window.confirm('Hapus data pasangan?')) return;
    try {
      await api.delete(`/admin/pasangan/${id}`);
      loadPegawaiDetail(selectedNip);
      setRefresh(v => v + 1);
    } catch {
      window.alert('Gagal menghapus data pasangan');
    }
  };

  const handleSaveAnak = async (e) => {
    e.preventDefault();
    try {
      if (isAddingAnak) {
        await api.post('/admin/anak', { ...formAnak, nip: selectedNip });
      } else {
        await api.put(`/admin/anak/${formAnak.id}`, formAnak);
      }
      setIsAddingAnak(false);
      setEditingAnakId(null);
      setFormAnak({});
      await loadPegawaiDetail(selectedNip);
      setRefresh(v => v + 1);
    } catch (err) {
      window.alert(err.response?.data?.message || 'Gagal menyimpan data anak');
    }
  };

  const handleDeleteAnak = async (id) => {
    if (!window.confirm('Hapus data anak?')) return;
    try {
      await api.delete(`/admin/anak/${id}`);
      loadPegawaiDetail(selectedNip);
      setRefresh(v => v + 1);
    } catch {
      window.alert('Gagal menghapus data anak');
    }
  };

  const filtered = useMemo(() => pegawaiList.filter(p => `${p.nama} ${p.nip} ${p.unit_kerja} ${p.golongan}`.toLowerCase().includes(query.toLowerCase())), [pegawaiList, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [query, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedPegawai = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <main className="admin-main page-wrap">
      <div className="admin-heading">
        <div>
          <div className="eyebrow">Workspace administrasi</div>
          <h1 className="display-font">Manajemen Pegawai & KGB</h1>
          <p>Kelola data pegawai, masa kerja golongan (MKG), dan kenaikan gaji berkala ({persenSetting}% per 2 tahun).</p>
        </div>
      </div>

      <div className="metric-row">
        <div className="metric-card" onClick={() => setActiveTab('direktori')} style={{ cursor: 'pointer' }}>
          <span className="metric-icon teal"><Icon name="users" size={19} /></span>
          <div>
            <small>Total pegawai</small>
            <strong>{pegawaiList.length}</strong>
          </div>
        </div>
        <div className="metric-card" onClick={() => setActiveTab('kgb')} style={{ cursor: 'pointer' }}>
          <span className={`metric-icon ${kgbEligibleList.length > 0 ? 'terracotta' : 'teal'}`}>
            <Icon name="file" size={19} />
          </span>
          <div>
            <small>Waktunya KGB ({persenSetting}%)</small>
            <strong>
              {kgbEligibleList.length}
              {kgbEligibleList.length > 0 ? <i style={{ color: '#d36b4b', fontWeight: 'bold' }}> perlu proses</i> : <i> siap</i>}
            </strong>
          </div>
        </div>
        <div className="metric-card metric-note" onClick={() => setActiveTab('pengaturan')} style={{ cursor: 'pointer' }}>
          <span className="tiny-dot" />
          <div>
            <small>Aturan Kenaikan Sistem</small>
            <strong style={{ fontSize: '0.9rem' }}>+{persenSetting}% tiap 2 thn (Acuan 2024)</strong>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'direktori' ? 'active' : ''}`}
          onClick={() => setActiveTab('direktori')}
        >
          <Icon name="users" size={16} /> Direktori Pegawai ({pegawaiList.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'kgb' ? 'active' : ''}`}
          onClick={() => setActiveTab('kgb')}
        >
          <Icon name="file" size={16} /> Pemberitahuan KGB
          {kgbEligibleList.length > 0 && <span className="tab-badge">{kgbEligibleList.length}</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'pengaturan' ? 'active' : ''}`}
          onClick={() => setActiveTab('pengaturan')}
        >
          <Icon name="shield" size={16} /> Aturan Kenaikan ({persenSetting}%)
        </button>
      </div>

      <div className="admin-grid">
        {/* TAB 1: DIREKTORI PEGAWAI */}
        {activeTab === 'direktori' && (
          <section className="soft-card directory-card">
            <div className="section-head">
              <div>
                <h2>Direktori pegawai</h2>
                <p>Pilih nama untuk melihat profil, masa kerja, dan detail keluarga.</p>
              </div>
              <div className="directory-toolbar">
                <div className="search-box">
                  <Icon name="search" size={16} />
                  <input placeholder="Cari nama, NIP, atau golongan…" value={query} onChange={e => setQuery(e.target.value)} />
                </div>
                <button className="btn-primary" onClick={() => { 
                  setActiveTab('direktori'); 
                  setIsAdding(true); 
                  setSelectedPegawai(null); 
                  setSelectedNip(null); 
                  setFormPegawai({ mkg_tahun: 0, mkg_bulan: 0, mkg_offset: 0, tmt_pangkat: '', tmt_cpns: '', status_kgb: 'Normal', agama: '', kebangsaan: 'Indonesia', alamat: '' });
                  setHasNewPasangan(false);
                  setNewPasangan({ nama: '', tempat_lahir: '', tanggal_lahir: '', pekerjaan: '', tanggal_menikah: '' });
                  setHasNewAnak(false);
                  setNewAnakList([]);
                }}>
                  <Icon name="plus" size={17} /> Pegawai baru
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama & NIP</th>
                    <th>Golongan</th>
                    <th>Masa Kerja (MKG)</th>
                    <th>Gaji Pokok</th>
                    <th>Status KGB</th>
                    <th>Unit kerja</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7"><div className="loading-state">Memuat direktori…</div></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan="7"><EmptyState text="Belum ada data yang cocok." /></td></tr>
                  ) : (
                    paginatedPegawai.map(p => (
                      <tr key={p.nip} className={selectedNip === p.nip ? 'active' : ''}>
                        <td>
                          <strong className="person-name">{p.nama}</strong>
                          <span className="person-nip">{p.nip}</span>
                        </td>
                        <td><span className="grade-pill">{p.golongan || '—'}</span></td>
                        <td>
                          <strong>{p.mkg_tahun ?? 0} Thn</strong> {p.mkg_bulan ?? 0} Bln
                          {(p.tmt_pangkat || p.tmt_cpns) && (
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                              TMT: {prettyDate(p.tmt_pangkat || p.tmt_cpns)}
                              {p.mkg_offset ? ` (${p.mkg_offset > 0 ? '+' : ''}${p.mkg_offset}th)` : ''}
                            </div>
                          )}
                        </td>
                        <td>{formatRupiah(p.gaji_pokok)}</td>
                        <td>
                          {p.status_kgb === 'Waktunya KGB' ? (
                            <span className="status-pill warning" title={`Masa kerja mencapai 2 tahun sejak KGB terakhir (+${persenSetting}%)`}>
                              Waktunya KGB
                            </span>
                          ) : (
                            <span className="status-pill success">Normal</span>
                          )}
                        </td>
                        <td>{p.unit_kerja || '—'}</td>
                        <td>
                          <div className="action-group">
                            <button className="table-action" onClick={() => loadPegawaiDetail(p.nip)}>Buka</button>
                            <button className="icon-action danger" aria-label="Hapus" onClick={() => handleDeletePegawai(p.nip)}>
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* KONTROL PAGINASI */}
            {filtered.length > 0 && (
              <div className="table-pagination">
                <div className="pagination-info">
                  Menampilkan <strong>{(currentPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(currentPage * pageSize, filtered.length)}</strong> dari <strong>{filtered.length}</strong> pegawai
                </div>

                <div className="pagination-actions">
                  <div className="page-size-picker">
                    <span>Baris per halaman:</span>
                    <select
                      value={pageSize}
                      onChange={e => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="pagination-nav">
                    <button
                      type="button"
                      className="page-nav-btn"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      title="Halaman sebelumnya"
                    >
                      <Icon name="chevronLeft" size={14} /> Sebelumnya
                    </button>

                    <div className="page-numbers">
                      {getPageNumbers().map((item, idx) => (
                        item === '...' ? (
                          <span key={`dots-${idx}`} className="page-num-btn ellipsis">…</span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            className={`page-num-btn ${item === currentPage ? 'active' : ''}`}
                            onClick={() => setCurrentPage(item)}
                          >
                            {item}
                          </button>
                        )
                      ))}
                    </div>

                    <button
                      type="button"
                      className="page-nav-btn"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      title="Halaman berikutnya"
                    >
                      Berikutnya <Icon name="chevronRight" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: PEMBERITAHUAN KGB */}
        {activeTab === 'kgb' && (
          <section className="soft-card kgb-card-section">
            <div className="section-head">
              <div>
                <h2>Pemberitahuan Kenaikan Gaji Berkala (KGB)</h2>
                <p>Pegawai yang telah memenuhi masa kerja 2 tahun berhak mendapatkan kenaikan gaji pokok sebesar {persenSetting}%.</p>
              </div>
            </div>

            {kgbEligibleList.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon"><Icon name="check" size={21} /></span>
                <p>Semua pegawai berstatus Normal. Belum ada pegawai yang jatuh tempo KGB (2 tahun).</p>
              </div>
            ) : (
              <div className="kgb-grid">
                {kgbEligibleList.map(p => {
                  const info = p.kgb_info || {};
                  return (
                    <div key={p.nip} className="kgb-item-card">
                      <div className="kgb-card-head">
                        <div>
                          <strong className="person-name" style={{ fontSize: '1rem' }}>{p.nama}</strong>
                          <span className="person-nip">NIP: {p.nip} · Golongan {p.golongan}</span>
                        </div>
                        <span className="status-pill warning">Jatuh Tempo KGB</span>
                      </div>

                      <div className="kgb-compare-box">
                        <div className="kgb-col">
                          <small>Masa Kerja Saat Ini</small>
                          <strong>{p.mkg_tahun ?? 0} Tahun {p.mkg_bulan ?? 0} Bulan</strong>
                          <span className="kgb-sub">Gaji Pokok: {formatRupiah(p.gaji_pokok)}</span>
                        </div>
                        <div className="kgb-arrow">➔</div>
                        <div className="kgb-col highlight">
                          <small>Setelah KGB (+{persenSetting}%)</small>
                          <strong>{info.mkgBaru ?? ((p.mkg_tahun || 0) + 2)} Tahun</strong>
                          <span className="kgb-sub high">{formatRupiah(info.gajiPokokBaru)}</span>
                        </div>
                      </div>

                      <div className="kgb-family-estimate">
                        <small>Estimasi Total Bruto (Gaji + Tunjangan Keluarga):</small>
                        <strong>{formatRupiah(info.totalBruto)}</strong>
                        <span>(Tunjangan Pasangan: {formatRupiah(info.tunjanganPasangan)}, Tunjangan Anak: {formatRupiah(info.tunjanganAnak)})</span>
                      </div>

                      <div className="kgb-card-actions">
                        <button className="btn-teal" onClick={() => handleProcessKgb(p.nip, p.nama)}>
                          <Icon name="check" size={16} /> Proses KGB (+{persenSetting}%)
                        </button>
                        <button className="btn-ghost small" onClick={() => loadPegawaiDetail(p.nip)}>
                          Lihat Profil
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: PENGATURAN PERSENTASE KENAIKAN SISTEM */}
        {activeTab === 'pengaturan' && (
          <section className="soft-card">
            <div className="section-head">
              <div>
                <h2>Pengaturan Persentase Kenaikan Gaji Berkala (KGB)</h2>
                <p>Atur persentase kenaikan gaji yang diterapkan pada sistem tiap 2 tahun masa kerja (berbasis data acuan 2024).</p>
              </div>
            </div>

            <form onSubmit={handleSaveSetting}>
            <div className="settings-wrap">
              <div className="settings-box">
                <h3>Persentase Kenaikan per 2 Tahun</h3>
                <p>Nilai ini digunakan oleh sistem untuk menghitung gaji pokok otomatis saat user memasukkan masa kerja di portal dan saat proses KGB dilakukan.</p>

                <div className="settings-form-row">
                  <Field label="Besaran Kenaikan (%)" hint="Default: 3.15%">
                    <input
                      className="field-input"
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="25"
                      value={persenSetting}
                      onChange={e => setPersenSetting(Number(e.target.value))}
                      required
                      style={{ maxWidth: '160px' }}
                    />
                  </Field>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: '0.88rem', color: 'var(--navy)' }}>Simulasi Gaji Acuan 2024 dengan Kenaikan {persenSetting}% per 2 Tahun:</h4>
                  <table className="settings-preview-table">
                    <thead>
                      <tr>
                        <th>Golongan</th>
                        <th>MKG 0 Thn</th>
                        <th>MKG 2 Thn (+{persenSetting}%)</th>
                        <th>MKG 4 Thn</th>
                        <th>MKG 6 Thn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['I/a', 'II/a', 'III/a', 'III/c', 'IV/a', 'IX'].map(gol => (
                        <tr key={gol}>
                          <td><strong>{gol}</strong></td>
                          <td>{formatRupiah(hitungGajiOtomatis2024(gol, 0, persenSetting))}</td>
                          <td style={{ color: 'var(--teal)', fontWeight: 'bold' }}>{formatRupiah(hitungGajiOtomatis2024(gol, 2, persenSetting))}</td>
                          <td>{formatRupiah(hitungGajiOtomatis2024(gol, 4, persenSetting))}</td>
                          <td>{formatRupiah(hitungGajiOtomatis2024(gol, 6, persenSetting))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="settings-box" style={{ marginTop: '28px' }}>
                <h3>Pejabat Penandatangan (Kepala Sub Bagian)</h3>
                <p>Data pejabat yang tampil di bagian tanda tangan pada output PDF surat KP4. Ubah jika terjadi pergantian pejabat.</p>

                <div className="settings-form-row" style={{ flexWrap: 'wrap', gap: '16px' }}>
                  <Field label="Nama Lengkap Pejabat" hint="Contoh: Drs. ILYAS, M.Ap">
                    <input
                      className="field-input"
                      type="text"
                      value={kepalaSubNama}
                      onChange={e => setKepalaSubNama(e.target.value)}
                      placeholder="Drs. ILYAS, M.Ap"
                    />
                  </Field>
                  <Field label="Pangkat" hint="Contoh: Pembina">
                    <input
                      className="field-input"
                      type="text"
                      value={kepalaSubPangkat}
                      onChange={e => setKepalaSubPangkat(e.target.value)}
                      placeholder="Pembina"
                    />
                  </Field>
                  <Field label="NIP Pejabat" hint="Contoh: 19691211 200212 1 005">
                    <input
                      className="field-input"
                      type="text"
                      value={kepalaSubNip}
                      onChange={e => setKepalaSubNip(e.target.value)}
                      placeholder="19691211 200212 1 005"
                    />
                  </Field>
                </div>

                {(kepalaSubNama || kepalaSubPangkat || kepalaSubNip) && (
                  <div className="pejabat-preview" style={{ marginTop: '16px', padding: '16px 20px', background: '#f6faf9', borderRadius: '10px', border: '1px solid #e0ebe8' }}>
                    <small style={{ color: '#8ca2aa', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Preview Tanda Tangan PDF</small>
                    <div style={{ marginTop: '8px' }}>
                      <strong style={{ textDecoration: 'underline', color: 'var(--navy)' }}>{kepalaSubNama || '_______________'}</strong>
                      <div style={{ fontSize: '0.82rem', color: '#5a6f78', marginTop: '2px' }}>{kepalaSubPangkat || '-'}</div>
                      <div style={{ fontSize: '0.82rem', color: '#5a6f78' }}>NIP. {kepalaSubNip || '_______________'}</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button className="btn-teal" type="submit" disabled={savingSetting}>
                  {savingSetting ? 'Menyimpan…' : 'Simpan Pengaturan'}
                </button>
                {settingMsg && (
                  <div className="success-toast" style={{ margin: 0 }}>
                    <Icon name="check" size={16} /> {settingMsg}
                  </div>
                )}
              </div>
            </div>
            </form>
          </section>
        )}
      </div>

      {/* DETAIL PEGAWAI / TAMBAH PEGAWAI */}
      {/* MODAL WINDOW / DIALOG BOX: TAMBAH PEGAWAI BARU */}
      {isAdding && (
        <div className="modal-overlay" onClick={() => setIsAdding(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-title-badge">
                  <Icon name="plus" size={20} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="eyebrow" style={{ color: '#0284C7', marginBottom: '2px' }}>Formulir Pegawai Baru</div>
                  <h2>Tambah Pegawai Baru</h2>
                  <p>Lengkapi informasi identitas pegawai, masa kerja golongan (MKG), dan gaji pokok.</p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAdding(false)}
                title="Tutup Jendela (Esc)"
              >
                <Icon name="close" size={16} strokeWidth={2.2} />
                <span>Tutup</span>
              </button>
            </div>

            <form onSubmit={handleSavePegawai} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body">
                <div className="form-section-title">
                  <Icon name="users" size={15} /> Informasi Pribadi & Jabatan
                </div>
                <div className="form-grid">
                  <Field label="NIP" hint="18 digit angka unik">
                    <input className="field-input" value={formPegawai.nip || ''} onChange={e => updatePegawai('nip', e.target.value)} maxLength={18} placeholder="Contoh: 198503122008011002" required autoFocus />
                  </Field>
                  <Field label="Nama lengkap" hint="Beserta gelar jika ada">
                    <input className="field-input" value={formPegawai.nama || ''} onChange={e => updatePegawai('nama', e.target.value)} placeholder="Contoh: Budi Santoso, S.Pd." required />
                  </Field>
                  <Field label="Tempat lahir">
                    <input className="field-input" value={formPegawai.tempat_lahir || ''} onChange={e => updatePegawai('tempat_lahir', e.target.value)} placeholder="Contoh: Palu" />
                  </Field>
                  <Field label="Tanggal lahir">
                    <input className="field-input" type="date" value={dateOnly(formPegawai.tanggal_lahir)} onChange={e => updatePegawai('tanggal_lahir', e.target.value)} required />
                  </Field>

                  <Field label="Golongan" hint="Contoh: III/a, III/c, IV/a, IX">
                    <input className="field-input" value={formPegawai.golongan || ''} onChange={handleGolonganChange} placeholder="III/c" />
                  </Field>
                  <Field label="Jabatan">
                    <input className="field-input" value={formPegawai.jabatan || ''} onChange={e => updatePegawai('jabatan', e.target.value)} placeholder="Contoh: Analis Kebijakan" />
                  </Field>
                  <Field label="Unit kerja" style={{ gridColumn: 'span 2' }}>
                    <input className="field-input" value={formPegawai.unit_kerja || ''} onChange={e => updatePegawai('unit_kerja', e.target.value)} placeholder="Contoh: Dinas Pendidikan" />
                  </Field>
                  <Field label="Agama">
                    <select className="field-input" value={formPegawai.agama || ''} onChange={e => updatePegawai('agama', e.target.value)}>
                      <option value="">-- Pilih Agama --</option>
                      <option value="Islam">Islam</option>
                      <option value="Kristen Protestan">Kristen Protestan</option>
                      <option value="Kristen Katolik">Kristen Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Konghucu">Konghucu</option>
                    </select>
                  </Field>
                  <Field label="Kebangsaan" hint="Default: Indonesia">
                    <input className="field-input" value={formPegawai.kebangsaan || 'Indonesia'} onChange={e => updatePegawai('kebangsaan', e.target.value)} placeholder="Indonesia" />
                  </Field>
                  <Field label="Alamat / Tempat Tinggal" hint="Butir 11 pada formulir KP4" style={{ gridColumn: 'span 2' }}>
                    <textarea
                      className="field-input"
                      rows={2}
                      value={formPegawai.alamat || ''}
                      onChange={e => updatePegawai('alamat', e.target.value)}
                      placeholder="Contoh: Jl. Tadulako No. 12, Palu, Sulawesi Tengah"
                      style={{ resize: 'vertical', minHeight: '60px' }}
                    />
                  </Field>
                </div>

                <div className="form-section-title">
                  <Icon name="file" size={15} /> Tanggal TMT & Riwayat Pangkat
                </div>
                <div className="form-grid">
                  <Field label="TMT Pangkat / Golongan Efektif" hint="Tanggal SK pangkat/golongan terakhir (MKG dihitung dari tanggal ini)">
                    <input
                      className="field-input"
                      type="date"
                      value={dateOnly(formPegawai.tmt_pangkat)}
                      onChange={e => updatePegawai('tmt_pangkat', e.target.value)}
                    />
                  </Field>
                  <Field label="TMT CPNS / Pengangkatan Pertama" hint="Tanggal pertama diangkat sebagai CPNS/PNS">
                    <input
                      className="field-input"
                      type="date"
                      value={dateOnly(formPegawai.tmt_cpns)}
                      onChange={e => updatePegawai('tmt_cpns', e.target.value)}
                    />
                  </Field>
                  <Field label="Offset MKG (Potongan Lintas Golongan)" hint="Aturan BKN: isi -6 jika pindah I→II, isi -5 jika pindah II→III (Tahun)">
                    <input
                      className="field-input"
                      type="number"
                      step="1"
                      min="-15"
                      max="10"
                      value={formPegawai.mkg_offset ?? 0}
                      onChange={e => updatePegawai('mkg_offset', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="TMT KGB Terakhir" hint="Tanggal SK kenaikan gaji berkala terakhir">
                    <input
                      className="field-input"
                      type="date"
                      value={dateOnly(formPegawai.tmt_kgb_terakhir)}
                      onChange={e => updatePegawai('tmt_kgb_terakhir', e.target.value)}
                    />
                  </Field>
                </div>

                <div className="form-section-title">
                  <Icon name="clock" size={15} /> Masa Kerja Golongan (MKG)
                </div>

                <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '12px', padding: '12px 16px', marginBottom: '14px', fontSize: '0.82rem', color: '#0369A1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <strong>Kalkulasi MKG Otomatis: </strong>
                    <span style={{ fontWeight: 700, color: '#0284C7' }}>
                      {hitungMKGClient(formPegawai.tmt_pangkat, formPegawai.tmt_cpns, formPegawai.mkg_offset).tahun} Tahun {hitungMKGClient(formPegawai.tmt_pangkat, formPegawai.tmt_cpns, formPegawai.mkg_offset).bulan} Bulan
                    </span>
                    <span style={{ marginLeft: '8px', color: '#64748B', fontSize: '0.75rem' }}>
                      (Acuan: {hitungMKGClient(formPegawai.tmt_pangkat, formPegawai.tmt_cpns, formPegawai.mkg_offset).sumber}
                      {Number(formPegawai.mkg_offset) ? `, offset: ${formPegawai.mkg_offset} thn` : ''})
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-helper-calc"
                    style={{ padding: '6px 12px', fontSize: '0.72rem' }}
                    onClick={handleSyncMkgDariTmt}
                  >
                    Sinkronkan ke Form
                  </button>
                </div>

                <div className="form-grid">
                  <Field label="Masa Kerja Golongan (Tahun)" hint="Otomatis dari TMT atau ubah manual (0–40)">
                    <input
                      className="field-input"
                      type="number"
                      min="0"
                      max="40"
                      value={formPegawai.mkg_tahun ?? ''}
                      onChange={handleMkgTahunChange}
                      required
                    />
                  </Field>
                  <Field label="Masa Kerja Golongan (Bulan)" hint="Otomatis dari TMT atau ubah manual (0–11)">
                    <input
                      className="field-input"
                      type="number"
                      min="0"
                      max="11"
                      value={formPegawai.mkg_bulan ?? ''}
                      onChange={e => updatePegawai('mkg_bulan', e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </Field>
                </div>

                <div className="form-section-title">
                  <Icon name="shield" size={15} /> Status & Penetapan Gaji Pokok
                </div>
                <div className="form-grid">
                  <Field label="Status KGB" style={{ gridColumn: 'span 2' }}>
                    <select className="field-input" value={formPegawai.status_kgb || 'Normal'} onChange={e => updatePegawai('status_kgb', e.target.value)}>
                      <option value="Normal">Normal</option>
                      <option value="Waktunya KGB">Waktunya KGB (Perlu Kenaikan {persenSetting}%)</option>
                    </select>
                  </Field>

                  <Field label="Gaji Pokok (Rp)" hint="Bisa manual atau klik hitung otomatis" style={{ gridColumn: 'span 2' }}>
                    <div className="salary-input-wrap">
                      <input
                        className="field-input"
                        type="number"
                        value={formPegawai.gaji_pokok || ''}
                        onChange={e => {
                          updatePegawai('gaji_pokok', e.target.value);
                          updatePegawai('_manualGaji', true);
                        }}
                        placeholder="Contoh: 3200000"
                        required
                      />
                      <button
                        type="button"
                        className="btn-helper-calc"
                        onClick={handleHitungOtomatisGaji}
                        title={`Hitung otomatis berdasarkan acuan 2024 dengan kenaikan ${persenSetting}% per 2 tahun masa kerja`}
                      >
                        Hitung {persenSetting}%
                      </button>
                    </div>
                  </Field>
                </div>

                {/* DATA KELUARGA (OPSIONAL): PASANGAN & ANAK */}
                <div className="form-section-title" style={{ marginTop: '24px' }}>
                  <Icon name="heart" size={15} /> Data Keluarga (Opsional untuk Penunjang Tunjangan KP4)
                </div>

                {/* PILIHAN PASANGAN */}
                <div style={{ background: hasNewPasangan ? '#F0FDF4' : '#F8FAFC', border: `1.5px solid ${hasNewPasangan ? '#86EFAC' : '#E2E8F0'}`, borderRadius: '14px', padding: '16px 18px', marginBottom: '14px', transition: 'all 0.2s ease' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', margin: 0, userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={hasNewPasangan}
                        onChange={e => setHasNewPasangan(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#0284C7', cursor: 'pointer' }}
                      />
                      <span>💍 Sudah Memiliki Pasangan (Suami/Istri)</span>
                    </label>
                    <span style={{ fontSize: '0.74rem', color: hasNewPasangan ? '#059669' : '#64748B', fontWeight: hasNewPasangan ? 700 : 500 }}>
                      {hasNewPasangan ? '✓ Tunjangan 10% dihitung' : 'Centang jika ingin langsung didaftarkan'}
                    </span>
                  </div>

                  {hasNewPasangan && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #CBD5E1' }}>
                      <div className="form-grid">
                        <Field label="Nama Pasangan" hint="Nama lengkap suami/istri">
                          <input
                            className="field-input"
                            value={newPasangan.nama || ''}
                            onChange={e => setNewPasangan({ ...newPasangan, nama: e.target.value })}
                            placeholder="Contoh: Siti Aminah"
                            required={hasNewPasangan}
                          />
                        </Field>
                        <Field label="Pekerjaan / NIP" hint="Pekerjaan atau NIP jika sesama PNS">
                          <input
                            className="field-input"
                            value={newPasangan.pekerjaan || ''}
                            onChange={e => setNewPasangan({ ...newPasangan, pekerjaan: e.target.value })}
                            placeholder="Contoh: PNS / Wiraswasta / Ibu Rumah Tangga"
                          />
                        </Field>
                        <Field label="Tempat Lahir Pasangan">
                          <input
                            className="field-input"
                            value={newPasangan.tempat_lahir || ''}
                            onChange={e => setNewPasangan({ ...newPasangan, tempat_lahir: e.target.value })}
                            placeholder="Contoh: Palu"
                          />
                        </Field>
                        <Field label="Tanggal Lahir Pasangan">
                          <input
                            className="field-input"
                            type="date"
                            value={dateOnly(newPasangan.tanggal_lahir)}
                            onChange={e => setNewPasangan({ ...newPasangan, tanggal_lahir: e.target.value })}
                          />
                        </Field>
                        <Field label="Tanggal Pernikahan" style={{ gridColumn: 'span 2' }}>
                          <input
                            className="field-input"
                            type="date"
                            value={dateOnly(newPasangan.tanggal_menikah)}
                            onChange={e => setNewPasangan({ ...newPasangan, tanggal_menikah: e.target.value })}
                          />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>

                {/* PILIHAN ANAK */}
                <div style={{ background: hasNewAnak ? '#F0FDF4' : '#F8FAFC', border: `1.5px solid ${hasNewAnak ? '#86EFAC' : '#E2E8F0'}`, borderRadius: '14px', padding: '16px 18px', marginBottom: '14px', transition: 'all 0.2s ease' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', margin: 0, userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={hasNewAnak}
                        onChange={e => toggleHasNewAnak(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#0284C7', cursor: 'pointer' }}
                      />
                      <span>👶 Memiliki Tanggungan Anak ({newAnakList.length})</span>
                    </label>
                    <span style={{ fontSize: '0.74rem', color: hasNewAnak ? '#059669' : '#64748B', fontWeight: hasNewAnak ? 700 : 500 }}>
                      {hasNewAnak ? '✓ Tunjangan 2% per anak (maks 2)' : 'Centang jika memiliki anak'}
                    </span>
                  </div>

                  {hasNewAnak && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #CBD5E1' }}>
                      {newAnakList.map((anak, idx) => (
                        <div key={idx} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px', position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0369A1' }}>
                              Anak Ke-{idx + 1}
                            </span>
                            {newAnakList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveNewAnakRow(idx)}
                                style={{ background: '#FEE2E2', border: 'none', borderRadius: '6px', color: '#DC2626', fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Icon name="trash" size={13} /> Hapus Baris
                              </button>
                            )}
                          </div>
                          <div className="form-grid">
                            <Field label="Nama Anak" hint="Nama lengkap anak">
                              <input
                                className="field-input"
                                value={anak.nama || ''}
                                onChange={e => handleUpdateNewAnak(idx, 'nama', e.target.value)}
                                placeholder="Contoh: Ahmad Fauzan"
                                required={hasNewAnak}
                              />
                            </Field>
                            <Field label="Status Hubungan">
                              <select
                                className="field-input"
                                value={anak.status_anak || 'Kandung'}
                                onChange={e => handleUpdateNewAnak(idx, 'status_anak', e.target.value)}
                              >
                                <option value="Kandung">Kandung</option>
                                <option value="Tiri">Tiri</option>
                                <option value="Angkat">Angkat</option>
                              </select>
                            </Field>
                            <Field label="Tempat Lahir">
                              <input
                                className="field-input"
                                value={anak.tempat_lahir || ''}
                                onChange={e => handleUpdateNewAnak(idx, 'tempat_lahir', e.target.value)}
                                placeholder="Contoh: Palu"
                              />
                            </Field>
                            <Field label="Tanggal Lahir">
                              <input
                                className="field-input"
                                type="date"
                                value={dateOnly(anak.tanggal_lahir)}
                                onChange={e => handleUpdateNewAnak(idx, 'tanggal_lahir', e.target.value)}
                              />
                            </Field>
                            <Field label="Status Pendidikan" style={{ gridColumn: 'span 2' }}>
                              <input
                                className="field-input"
                                value={anak.status_pendidikan || ''}
                                onChange={e => handleUpdateNewAnak(idx, 'status_pendidikan', e.target.value)}
                                placeholder="Contoh: Belum Sekolah / SD / SMP / SMA / Kuliah"
                              />
                            </Field>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="btn-ghost small"
                        onClick={handleAddNewAnakRow}
                        style={{ width: '100%', justifyContent: 'center', border: '1.5px dashed #CBD5E1', padding: '10px', borderRadius: '10px', background: '#F8FAFC', fontWeight: 700 }}
                      >
                        <Icon name="plus" size={14} /> + Tambah Anak Lainnya
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-ghost" type="button" onClick={() => setIsAdding(false)}>Batal</button>
                <button className="btn-primary" type="submit"><Icon name="check" size={16} /> Simpan Pegawai</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL WINDOW / DIALOG BOX: DETAIL PROFIL & RIWAYAT PEGAWAI */}
      {selectedPegawai && (
        <div className="modal-overlay" onClick={() => { setSelectedPegawai(null); setSelectedNip(null); }}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '920px' }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-title-badge">
                  <Icon name="users" size={20} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="eyebrow" style={{ color: '#0284C7', marginBottom: '2px' }}>Profil & Riwayat Pegawai</div>
                  <h2>{selectedPegawai.nama}</h2>
                  <p>NIP {selectedPegawai.nip} · {selectedPegawai.unit_kerja || 'Unit kerja belum diisi'}</p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => { setSelectedPegawai(null); setSelectedNip(null); }}
                title="Tutup Jendela (Esc)"
              >
                <Icon name="close" size={16} strokeWidth={2.2} />
                <span>Tutup</span>
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSavePegawai}>
                <div className="form-section-title">
                  <Icon name="users" size={15} /> Informasi Pribadi & Jabatan
                </div>
                <div className="form-grid">
                  <Field label="NIP">
                    <input className="field-input" value={formPegawai.nip || ''} onChange={e => updatePegawai('nip', e.target.value)} readOnly maxLength={18} required />
                  </Field>
                  <Field label="Nama lengkap">
                    <input className="field-input" value={formPegawai.nama || ''} onChange={e => updatePegawai('nama', e.target.value)} required />
                  </Field>
                  <Field label="Tempat lahir">
                    <input className="field-input" value={formPegawai.tempat_lahir || ''} onChange={e => updatePegawai('tempat_lahir', e.target.value)} />
                  </Field>
                  <Field label="Tanggal lahir">
                    <input className="field-input" type="date" value={dateOnly(formPegawai.tanggal_lahir)} onChange={e => updatePegawai('tanggal_lahir', e.target.value)} required />
                  </Field>

                  <Field label="Golongan" hint="Contoh: III/a, III/c, IV/a, IX">
                    <input className="field-input" value={formPegawai.golongan || ''} onChange={handleGolonganChange} placeholder="III/c" />
                  </Field>
                  <Field label="Jabatan">
                    <input className="field-input" value={formPegawai.jabatan || ''} onChange={e => updatePegawai('jabatan', e.target.value)} />
                  </Field>
                  <Field label="Unit kerja" style={{ gridColumn: 'span 2' }}>
                    <input className="field-input" value={formPegawai.unit_kerja || ''} onChange={e => updatePegawai('unit_kerja', e.target.value)} />
                  </Field>
                  <Field label="Agama">
                    <select className="field-input" value={formPegawai.agama || ''} onChange={e => updatePegawai('agama', e.target.value)}>
                      <option value="">-- Pilih Agama --</option>
                      <option value="Islam">Islam</option>
                      <option value="Kristen Protestan">Kristen Protestan</option>
                      <option value="Kristen Katolik">Kristen Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Konghucu">Konghucu</option>
                    </select>
                  </Field>
                  <Field label="Kebangsaan" hint="Default: Indonesia">
                    <input className="field-input" value={formPegawai.kebangsaan || 'Indonesia'} onChange={e => updatePegawai('kebangsaan', e.target.value)} placeholder="Indonesia" />
                  </Field>
                  <Field label="Alamat / Tempat Tinggal" hint="Butir 11 pada formulir KP4" style={{ gridColumn: 'span 2' }}>
                    <textarea
                      className="field-input"
                      rows={2}
                      value={formPegawai.alamat || ''}
                      onChange={e => updatePegawai('alamat', e.target.value)}
                      placeholder="Contoh: Jl. Tadulako No. 12, Palu, Sulawesi Tengah"
                      style={{ resize: 'vertical', minHeight: '60px' }}
                    />
                  </Field>
                </div>

                <div className="form-section-title">
                  <Icon name="file" size={15} /> Tanggal TMT & Riwayat Pangkat
                </div>
                <div className="form-grid">
                  <Field label="TMT Pangkat / Golongan Efektif" hint="Tanggal SK pangkat/golongan terakhir (MKG dihitung dari tanggal ini)">
                    <input
                      className="field-input"
                      type="date"
                      value={dateOnly(formPegawai.tmt_pangkat)}
                      onChange={e => updatePegawai('tmt_pangkat', e.target.value)}
                    />
                  </Field>

                  <Field label="TMT CPNS / Pengangkatan Pertama" hint="Tanggal awal CPNS/PNS (fallback jika belum naik pangkat)">
                    <input
                      className="field-input"
                      type="date"
                      value={dateOnly(formPegawai.tmt_cpns)}
                      onChange={e => updatePegawai('tmt_cpns', e.target.value)}
                    />
                  </Field>

                  <Field label="Offset MKG (Potongan Lintas Golongan)" hint="Aturan BKN: -6 jika pindah I→II, -5 jika II→III (Tahun)">
                    <input
                      className="field-input"
                      type="number"
                      step="1"
                      min="-15"
                      max="10"
                      value={formPegawai.mkg_offset ?? 0}
                      onChange={e => updatePegawai('mkg_offset', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                    />
                  </Field>

                  <Field label="TMT KGB Terakhir" hint="Tanggal SK KGB terakhir">
                    <input
                      className="field-input"
                      type="date"
                      value={dateOnly(formPegawai.tmt_kgb_terakhir)}
                      onChange={e => updatePegawai('tmt_kgb_terakhir', e.target.value)}
                    />
                  </Field>
                </div>

                <div className="form-section-title">
                  <Icon name="clock" size={15} /> Masa Kerja Golongan (MKG)
                </div>

                <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '12px', padding: '12px 16px', marginBottom: '14px', fontSize: '0.82rem', color: '#0369A1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <strong>Kalkulasi MKG Otomatis: </strong>
                    <span style={{ fontWeight: 700, color: '#0284C7' }}>
                      {hitungMKGClient(formPegawai.tmt_pangkat, formPegawai.tmt_cpns, formPegawai.mkg_offset).tahun} Tahun {hitungMKGClient(formPegawai.tmt_pangkat, formPegawai.tmt_cpns, formPegawai.mkg_offset).bulan} Bulan
                    </span>
                    <span style={{ marginLeft: '8px', color: '#64748B', fontSize: '0.75rem' }}>
                      (Acuan: {hitungMKGClient(formPegawai.tmt_pangkat, formPegawai.tmt_cpns, formPegawai.mkg_offset).sumber}
                      {Number(formPegawai.mkg_offset) ? `, offset: ${formPegawai.mkg_offset} thn` : ''})
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-helper-calc"
                    style={{ padding: '6px 12px', fontSize: '0.72rem' }}
                    onClick={handleSyncMkgDariTmt}
                  >
                    Sinkronkan ke Form
                  </button>
                </div>

                <div className="form-grid">
                  <Field label="Masa Kerja Golongan (Tahun)" hint="Otomatis dari TMT atau ubah manual (0–40)">
                    <input
                      className="field-input"
                      type="number"
                      min="0"
                      max="40"
                      value={formPegawai.mkg_tahun ?? ''}
                      onChange={handleMkgTahunChange}
                      required
                    />
                  </Field>
                  <Field label="Masa Kerja Golongan (Bulan)" hint="Otomatis dari TMT atau ubah manual (0–11)">
                    <input
                      className="field-input"
                      type="number"
                      min="0"
                      max="11"
                      value={formPegawai.mkg_bulan ?? ''}
                      onChange={e => updatePegawai('mkg_bulan', e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </Field>
                </div>

                <div className="form-section-title">
                  <Icon name="shield" size={15} /> Status & Penetapan Gaji Pokok
                </div>

                <div className="form-grid">
                  <Field label="Status KGB" style={{ gridColumn: 'span 2' }}>
                    <select className="field-input" value={formPegawai.status_kgb || 'Normal'} onChange={e => updatePegawai('status_kgb', e.target.value)}>
                      <option value="Normal">Normal</option>
                      <option value="Waktunya KGB">Waktunya KGB (Perlu Kenaikan {persenSetting}%)</option>
                    </select>
                  </Field>

                  <Field label="Gaji Pokok (Rp)" hint="Bisa diinput manual atau dihitung otomatis" style={{ gridColumn: 'span 2' }}>
                    <div className="salary-input-wrap">
                      <input
                        className="field-input"
                        type="number"
                        value={formPegawai.gaji_pokok || ''}
                        onChange={e => {
                          updatePegawai('gaji_pokok', e.target.value);
                          updatePegawai('_manualGaji', true);
                        }}
                        required
                      />
                      <button
                        type="button"
                        className="btn-helper-calc"
                        onClick={handleHitungOtomatisGaji}
                        title={`Hitung otomatis berdasarkan acuan 2024 dengan kenaikan ${persenSetting}% per 2 tahun masa kerja`}
                      >
                        Hitung {persenSetting}%
                      </button>
                    </div>
                  </Field>
                </div>

                <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button className="btn-primary" type="submit"><Icon name="check" size={16} /> Simpan Pembaruan Profil</button>
                </div>
              </form>

              {/* Data Keluarga (Pasangan & Anak) */}
              <div className="family-management">
                <div className="subsection">
                  <div className="subsection-head">
                    <div>
                      <h3>Pasangan</h3>
                      <p>{selectedPegawai.pasangan?.length ? 'Informasi pasangan pegawai.' : 'Belum ada informasi pasangan.'}</p>
                    </div>
                    {!selectedPegawai.pasangan?.length && !isAddingPasangan && (
                      <button className="btn-ghost small" onClick={() => { setIsAddingPasangan(true); setFormPasangan({}); }}>
                        <Icon name="plus" size={14} /> Tambah
                      </button>
                    )}
                  </div>

                  {selectedPegawai.pasangan?.length > 0 && !editingPasangan && !isAddingPasangan && (
                    <div className="family-record">
                      <div>
                        <strong>{selectedPegawai.pasangan[0].nama}</strong>
                        <span>
                          {selectedPegawai.pasangan[0].pekerjaan || 'Pekerjaan belum diisi'} · {selectedPegawai.pasangan[0].tempat_lahir ? `${selectedPegawai.pasangan[0].tempat_lahir}, ` : ''}{prettyDate(selectedPegawai.pasangan[0].tanggal_lahir)}
                        </span>
                      </div>
                      <div>
                        <button className="text-action" onClick={() => {
                          const p = selectedPegawai.pasangan[0];
                          setEditingPasangan(true);
                          setFormPasangan({
                            id: p.id,
                            nama: p.nama,
                            tempat_lahir: p.tempat_lahir,
                            tanggal_lahir: p.tanggal_lahir,
                            pekerjaan: p.pekerjaan,
                            tanggal_menikah: p.tanggal_menikah
                          });
                        }}>Edit</button>
                        <button className="text-action red" onClick={() => handleDeletePasangan(selectedPegawai.pasangan[0].id)}>Hapus</button>
                      </div>
                    </div>
                  )}

                  {(isAddingPasangan || editingPasangan) && (
                    <form onSubmit={handleSavePasangan} className="inline-form">
                      <Field label="Nama">
                        <input className="field-input" value={formPasangan.nama || ''} onChange={e => setFormPasangan({ ...formPasangan, nama: e.target.value })} required />
                      </Field>
                      <Field label="Tempat lahir">
                        <input className="field-input" value={formPasangan.tempat_lahir || ''} onChange={e => setFormPasangan({ ...formPasangan, tempat_lahir: e.target.value })} />
                      </Field>
                      <Field label="Tanggal lahir">
                        <input className="field-input" type="date" value={dateOnly(formPasangan.tanggal_lahir)} onChange={e => setFormPasangan({ ...formPasangan, tanggal_lahir: e.target.value })} />
                      </Field>
                      <Field label="Pekerjaan">
                        <input className="field-input" value={formPasangan.pekerjaan || ''} onChange={e => setFormPasangan({ ...formPasangan, pekerjaan: e.target.value })} />
                      </Field>
                      <Field label="Tanggal menikah">
                        <input className="field-input" type="date" value={dateOnly(formPasangan.tanggal_menikah)} onChange={e => setFormPasangan({ ...formPasangan, tanggal_menikah: e.target.value })} />
                      </Field>
                      <div className="form-actions">
                        <button className="btn-teal small" type="submit">Simpan</button>
                        <button className="btn-ghost small" type="button" onClick={() => { setIsAddingPasangan(false); setEditingPasangan(false); }}>Batal</button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="subsection">
                  <div className="subsection-head">
                    <div>
                      <h3>Anak <span className="count-badge">{selectedPegawai.anak?.length || 0}</span></h3>
                      <p>Daftar tanggungan keluarga.</p>
                    </div>
                    <button className="btn-ghost small" onClick={() => { setIsAddingAnak(true); setEditingAnakId(null); setFormAnak({ status_anak: 'Kandung' }); }}>
                      <Icon name="plus" size={14} /> Tambah
                    </button>
                  </div>

                  {selectedPegawai.anak?.length ? (
                    <div className="children-list">
                      {selectedPegawai.anak.map((a, i) => editingAnakId === a.id ? (
                        <form key={a.id} onSubmit={handleSaveAnak} className="child-edit inline-form">
                          <Field label="Nama">
                            <input className="field-input" value={formAnak.nama || ''} onChange={e => setFormAnak({ ...formAnak, nama: e.target.value })} required />
                          </Field>
                          <Field label="Tempat lahir">
                            <input className="field-input" value={formAnak.tempat_lahir || ''} onChange={e => setFormAnak({ ...formAnak, tempat_lahir: e.target.value })} />
                          </Field>
                          <Field label="Tanggal lahir">
                            <input className="field-input" type="date" value={dateOnly(formAnak.tanggal_lahir)} onChange={e => setFormAnak({ ...formAnak, tanggal_lahir: e.target.value })} required />
                          </Field>
                          <Field label="Status anak">
                            <select className="field-input" value={formAnak.status_anak || 'Kandung'} onChange={e => setFormAnak({ ...formAnak, status_anak: e.target.value })}>
                              <option value="Kandung">Kandung</option>
                              <option value="Tiri">Tiri</option>
                              <option value="Angkat">Angkat</option>
                            </select>
                          </Field>
                          <Field label="Pendidikan">
                            <input className="field-input" value={formAnak.status_pendidikan || ''} onChange={e => setFormAnak({ ...formAnak, status_pendidikan: e.target.value })} placeholder="SMA / Kuliah" />
                          </Field>
                          <div className="form-actions">
                            <button className="btn-teal small" type="submit">Simpan</button>
                            <button type="button" className="btn-ghost small" onClick={() => setEditingAnakId(null)}>Batal</button>
                          </div>
                        </form>
                      ) : (
                        <div className="child-row" key={a.id}>
                          <span className="child-number">0{i + 1}</span>
                          <div>
                            <strong>{a.nama}</strong>
                            <span>
                              {a.status_anak || 'Kandung'} · {a.tempat_lahir ? `${a.tempat_lahir}, ` : ''}{prettyDate(a.tanggal_lahir)} · {a.status_pendidikan || 'Pendidikan belum diisi'}
                            </span>
                          </div>
                          <div className="row-actions">
                            <button className="icon-action" onClick={() => {
                              setEditingAnakId(a.id);
                              setIsAddingAnak(false);
                              setFormAnak({
                                id: a.id,
                                nama: a.nama,
                                tempat_lahir: a.tempat_lahir,
                                tanggal_lahir: a.tanggal_lahir,
                                status_anak: a.status_anak || 'Kandung',
                                status_pendidikan: a.status_pendidikan
                              });
                            }}>
                              <Icon name="edit" size={15} />
                            </button>
                            <button className="icon-action danger" onClick={() => handleDeleteAnak(a.id)}>
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="Belum ada data anak." />
                  )}

                  {isAddingAnak && (
                    <form onSubmit={handleSaveAnak} className="inline-form">
                      <Field label="Nama">
                        <input className="field-input" value={formAnak.nama || ''} onChange={e => setFormAnak({ ...formAnak, nama: e.target.value })} required />
                      </Field>
                      <Field label="Tempat lahir">
                        <input className="field-input" value={formAnak.tempat_lahir || ''} onChange={e => setFormAnak({ ...formAnak, tempat_lahir: e.target.value })} />
                      </Field>
                      <Field label="Tanggal lahir">
                        <input className="field-input" type="date" value={dateOnly(formAnak.tanggal_lahir)} onChange={e => setFormAnak({ ...formAnak, tanggal_lahir: e.target.value })} required />
                      </Field>
                      <Field label="Status anak">
                        <select className="field-input" value={formAnak.status_anak || 'Kandung'} onChange={e => setFormAnak({ ...formAnak, status_anak: e.target.value })}>
                          <option value="Kandung">Kandung</option>
                          <option value="Tiri">Tiri</option>
                          <option value="Angkat">Angkat</option>
                        </select>
                      </Field>
                      <Field label="Status pendidikan">
                        <input className="field-input" value={formAnak.status_pendidikan || ''} onChange={e => setFormAnak({ ...formAnak, status_pendidikan: e.target.value })} placeholder="SMA / Kuliah" />
                      </Field>
                      <div className="form-actions">
                        <button className="btn-teal small" type="submit">Simpan</button>
                        <button type="button" className="btn-ghost small" onClick={() => setIsAddingAnak(false)}>Batal</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-ghost" type="button" onClick={() => { setSelectedPegawai(null); setSelectedNip(null); }}>
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default DashboardPage;
