import { useState, useMemo } from 'react';
import api from '../api/axios';
import Icon from '../components/Icon';

const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
const formatCurrency = (amount) => amount == null ? '-' : Number(amount).toLocaleString('id-ID');

// Tabel dasar 2024 (MKG 0)
const GAJI_DASAR_2024 = {
  'I/a': 1685700, 'I/b': 1840800, 'I/c': 1918700, 'I/d': 1999900,
  'II/a': 2184000, 'II/b': 2385000, 'II/c': 2485900, 'II/d': 2591100,
  'III/a': 2785700, 'III/b': 2903600, 'III/c': 3026400, 'III/d': 3154400,
  'IV/a': 3287800, 'IV/b': 3426900, 'IV/c': 3571900, 'IV/d': 3723000, 'IV/e': 3880400,
  'IX': 3203300
};

const hitungGajiDariMKG = (golongan, mkgTahun, persen = 3.15) => {
  if (!golongan) return 0;
  const trimmed = String(golongan).trim();
  const parts = trimmed.split('/');
  const norm = parts.length === 2 ? `${parts[0].toUpperCase()}/${parts[1].toLowerCase()}` : trimmed.toUpperCase();
  const base = GAJI_DASAR_2024[norm];
  if (!base) return 0;
  const steps = Math.floor(Math.max(0, Number(mkgTahun) || 0) / 2);
  const rate = (Number(persen) || 3.15) / 100;
  return Math.round(base * Math.pow(1 + rate, steps));
};

function InfoItem({ label, value }) {
  return <div className="info-item"><span>{label}</span><strong>{value || '-'}</strong></div>;
}

function PegawaiPage() {
  const [nip, setNip] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [printing, setPrinting] = useState(false);

  // State untuk input masa kerja interaktif oleh user
  const [inputMkgTahun, setInputMkgTahun] = useState(0);
  const [inputMkgBulan, setInputMkgBulan] = useState(0);
  const [savingMkg, setSavingMkg] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setData(null);
    setSaveSuccessMsg('');
    try {
      const response = await api.post('/print/validate', { nip, tanggal_lahir: tanggalLahir });
      setData(response.data);
      setInputMkgTahun(response.data.mkg_tahun ?? 0);
      setInputMkgBulan(response.data.mkg_bulan ?? 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan saat memverifikasi data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMasaKerja = async (e) => {
    e.preventDefault();
    setSavingMkg(true);
    setSaveSuccessMsg('');
    try {
      const res = await api.post('/print/update-mkg', {
        nip: data.nip,
        tanggal_lahir: tanggalLahir,
        mkg_tahun: inputMkgTahun,
        mkg_bulan: inputMkgBulan
      });
      setData(res.data.pegawai);
      setSaveSuccessMsg('Masa kerja dan gaji berhasil disimpan! Surat KP4 siap diunduh.');
    } catch (err) {
      window.alert(err.response?.data?.message || 'Gagal menyimpan masa kerja');
    } finally {
      setSavingMkg(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const response = await api.post('/print/generate', { nip }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `KP4_${nip}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.alert('Gagal mencetak PDF. Silakan coba lagi.');
    } finally {
      setPrinting(false);
    }
  };

  // Persen kenaikan yang ditentukan oleh admin/sistem
  const persenSistem = data?.persen_kenaikan_kgb || 3.15;

  // Kalkulasi real-time sesuai masa kerja yang diinput user
  const estimasiKalkulasi = useMemo(() => {
    if (!data) return null;
    const tahun = Math.max(0, Math.floor(Number(inputMkgTahun) || 0));
    const stepKenaikan = Math.floor(tahun / 2);
    const gajiPokokBaru = hitungGajiDariMKG(data.golongan, tahun, persenSistem) || Number(data.gaji_pokok);
    const jmlPasangan = Math.min(1, data.pasangan ? data.pasangan.length : 0);
    const jmlAnak = Math.min(2, data.anak ? data.anak.length : 0);
    const tunjanganPasangan = Math.round(gajiPokokBaru * 0.10 * jmlPasangan);
    const tunjanganAnak = Math.round(gajiPokokBaru * 0.02 * jmlAnak);
    const totalTunjangan = tunjanganPasangan + tunjanganAnak;
    const totalBruto = gajiPokokBaru + totalTunjangan;

    return {
      tahun,
      stepKenaikan,
      gajiPokokBaru,
      jmlPasangan,
      jmlAnak,
      tunjanganPasangan,
      tunjanganAnak,
      totalTunjangan,
      totalBruto
    };
  }, [data, inputMkgTahun, persenSistem]);

  const gajiPokokAktif = Number(data?.gaji_pokok) || 0;
  const jmlPasanganAktif = Math.min(1, data?.pasangan ? data.pasangan.length : 0);
  const jmlAnakAktif = Math.min(2, data?.anak ? data.anak.length : 0);
  const tunjanganPasanganAktif = Math.round(gajiPokokAktif * 0.10 * jmlPasanganAktif);
  const tunjanganAnakAktif = Math.round(gajiPokokAktif * 0.02 * jmlAnakAktif);
  const totalTunjanganAktif = tunjanganPasanganAktif + tunjanganAnakAktif;
  const totalBrutoAktif = gajiPokokAktif + totalTunjanganAktif;

  return (
    <main className="public-main">
      <section className="public-hero page-wrap">
        <div className="hero-copy fade-up">
          <div className="eyebrow">Portal layanan mandiri</div>
          <h1>Urus surat KP4,<br /><em>lebih sederhana.</em></h1>
          <p>Verifikasi identitas Anda, sesuaikan masa kerja dengan kalkulasi otomatis kenaikan berkala tiap 2 tahun, dan unduh surat resmi dalam hitungan menit.</p>
          <div className="hero-note">
            <span className="note-icon"><Icon name="shield" size={16} /></span>
            <span>Kenaikan berkala tiap 2 tahun dihitung otomatis berdasarkan persentase sistem ({persenSistem}%).</span>
          </div>
        </div>
        <div className="verify-card soft-card fade-up">
          <div className="card-kicker"><span className="step-badge">01</span><span>Verifikasi identitas</span></div>
          <h2>Temukan data Anda</h2>
          <p className="card-intro">Masukkan NIP dan tanggal lahir sesuai data kepegawaian.</p>
          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label className="field-label">NIP <span>(18 digit)</span></label>
              <input className="field-input" type="text" inputMode="numeric" placeholder="198001012005011001" value={nip} onChange={e => setNip(e.target.value)} maxLength={18} required />
            </div>
            <div className="form-group">
              <label className="field-label">Tanggal lahir</label>
              <input className="field-input" type="date" value={tanggalLahir} onChange={e => setTanggalLahir(e.target.value)} required />
            </div>
            {error && <div className="error-box">{error}</div>}
            <button className="btn-primary full-btn" type="submit" disabled={loading}>
              {loading ? 'Memverifikasi…' : <>Verifikasi data <Icon name="arrow" size={16} /></>}
            </button>
          </form>
          <div className="form-footnote"><span className="tiny-dot" /> Sistem aktif · Layanan tersedia 24 jam</div>
        </div>
      </section>

      <section className="benefit-strip page-wrap">
        <div><span className="benefit-icon"><Icon name="shield" size={18} /></span><span><strong>Aman & terverifikasi</strong><small>Validasi langsung dari basis data</small></span></div>
        <div><span className="benefit-icon terracotta"><Icon name="file" size={18} /></span><span><strong>Surat resmi digital</strong><small>Format resmi siap cetak</small></span></div>
        <div><span className="benefit-icon navy"><Icon name="heart" size={18} /></span><span><strong>Input Masa Kerja</strong><small>Kenaikan {persenSistem}% per 2 tahun</small></span></div>
      </section>

      {data && (
        <section className="result-card soft-card page-wrap fade-up">
          <div className="result-header">
            <div>
              <div className="eyebrow">02 · Dashboard Pegawai</div>
              <h2>Profil & Pengaturan Masa Kerja Anda</h2>
              <p>Periksa data kepegawaian dan atur masa kerja untuk memperbarui surat KP4 secara mandiri.</p>
            </div>
            <span className="status-pill">Terverifikasi</span>
          </div>

          {/* ================= FITUR INPUT MASA KERJA USER ================= */}
          <div className="user-mkg-calculator-box">
            <div className="mkg-box-header">
              <div className="mkg-badge-icon"><Icon name="file" size={20} /></div>
              <div>
                <h3>Input Masa Kerja Golongan (MKG)</h3>
                <p>
                  Masukkan masa kerja Anda. Gaji pokok akan otomatis dihitung berdasarkan kenaikan <strong>{persenSistem}% tiap 2 tahun</strong> dari data dasar 2024.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveMasaKerja} className="mkg-input-form">
              <div className="mkg-inputs-row">
                <div className="form-group-custom">
                  <label className="field-label">Masa Kerja (Tahun)</label>
                  <input
                    className="field-input"
                    type="number"
                    min="0"
                    max="40"
                    value={inputMkgTahun}
                    onChange={e => setInputMkgTahun(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                  />
                  <small className="field-hint">0 s.d. 40 tahun</small>
                </div>

                <div className="form-group-custom">
                  <label className="field-label">Masa Kerja (Bulan)</label>
                  <input
                    className="field-input"
                    type="number"
                    min="0"
                    max="11"
                    value={inputMkgBulan}
                    onChange={e => setInputMkgBulan(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                  />
                  <small className="field-hint">0 s.d. 11 bulan</small>
                </div>

                <div className="form-group-custom action-col">
                  <label className="field-label">&nbsp;</label>
                  <button className="btn-teal full-btn-custom" type="submit" disabled={savingMkg}>
                    {savingMkg ? 'Menyimpan…' : <><Icon name="check" size={16} /> Simpan & Terapkan Masa Kerja</>}
                  </button>
                </div>
              </div>
            </form>

            {saveSuccessMsg && (
              <div className="success-toast">
                <Icon name="check" size={16} /> {saveSuccessMsg}
              </div>
            )}

            {/* REAL-TIME CALCULATION PREVIEW */}
            {estimasiKalkulasi && (
              <div className="calc-preview-grid">
                <div className="preview-card">
                  <span className="p-label">Periode Kenaikan (Tiap 2 Thn)</span>
                  <strong className="p-val">{estimasiKalkulasi.stepKenaikan} Kali Kenaikan</strong>
                  <span className="p-sub">Dari total {estimasiKalkulasi.tahun} tahun masa kerja</span>
                </div>
                <div className="preview-card highlight">
                  <span className="p-label">Gaji Pokok Hasil Kalkulasi</span>
                  <strong className="p-val high">Rp {formatCurrency(estimasiKalkulasi.gajiPokokBaru)}</strong>
                  <span className="p-sub high">+{persenSistem}% per 2 tahun (Acuan 2024)</span>
                </div>
                <div className="preview-card">
                  <span className="p-label">Tunjangan Keluarga</span>
                  <strong className="p-val">Rp {formatCurrency(estimasiKalkulasi.totalTunjangan)}</strong>
                  <span className="p-sub">Suami/Istri (10%) + Anak (2% x {estimasiKalkulasi.jmlAnak})</span>
                </div>
                <div className="preview-card accent">
                  <span className="p-label">Total Gaji Bruto KP4</span>
                  <strong className="p-val accent">Rp {formatCurrency(estimasiKalkulasi.totalBruto)}</strong>
                  <span className="p-sub">Gaji Pokok + Tunjangan Keluarga</span>
                </div>
              </div>
            )}
          </div>

          <div className="result-section">
            <h3><span className="section-line" />Data Pegawai yang Tercatat di Sistem</h3>
            <div className="info-grid">
              <InfoItem label="NIP" value={data.nip} />
              <InfoItem label="Nama lengkap" value={data.nama} />
              <InfoItem label="Tempat / tanggal lahir" value={`${data.tempat_lahir || '-'}, ${formatDate(data.tanggal_lahir)}`} />
              <InfoItem label="Golongan" value={data.golongan} />
              <InfoItem label="Jabatan" value={data.jabatan} />
              <InfoItem label="Unit kerja" value={data.unit_kerja} />
              <InfoItem label="Masa Kerja Golongan (MKG Aktif)" value={`${data.mkg_tahun ?? 0} Tahun ${data.mkg_bulan ?? 0} Bulan`} />
              <InfoItem label="TMT KGB Terakhir" value={formatDate(data.tmt_kgb_terakhir)} />
              <InfoItem label="Status KGB" value={data.status_kgb || 'Normal'} />
            </div>
          </div>

          <div className="result-section">
            <h3><span className="section-line terracotta-line" />Rincian Tunjangan Keluarga (Surat KP4)</h3>
            <div className="info-grid">
              <InfoItem label="Gaji Pokok Saat Ini" value={`Rp ${formatCurrency(gajiPokokAktif)}`} />
              <InfoItem label="Tunjangan Suami/Istri (10%)" value={`Rp ${formatCurrency(tunjanganPasanganAktif)} (${jmlPasanganAktif} terdaftar)`} />
              <InfoItem label="Tunjangan Anak (2% / anak)" value={`Rp ${formatCurrency(tunjanganAnakAktif)} (${jmlAnakAktif} tertanggung)`} />
              <InfoItem label="Total Tunjangan Keluarga" value={`Rp ${formatCurrency(totalTunjanganAktif)}`} />
              <InfoItem label="Total Gaji Bruto" value={`Rp ${formatCurrency(totalBrutoAktif)}`} />
            </div>
          </div>

          <div className="result-section">
            <h3><span className="section-line" />Data keluarga</h3>
            <div className="family-grid">
              <div className="family-panel">
                <span className="family-label">Pasangan</span>
                {data.pasangan?.length ? (
                  <>
                    <strong>{data.pasangan[0].nama}</strong>
                    <p>{data.pasangan[0].pekerjaan || '—'} · Menikah {formatDate(data.pasangan[0].tanggal_menikah)}</p>
                  </>
                ) : (
                  <p className="muted">Belum ada data pasangan</p>
                )}
              </div>
              <div className="family-panel">
                <span className="family-label">Anak ({data.anak?.length || 0} tercatat)</span>
                {data.anak?.length ? (
                  <p>{data.anak.map(a => `${a.nama} (${a.status_anak || 'Kandung'})`).join(', ')}</p>
                ) : (
                  <p className="muted">Belum ada data anak</p>
                )}
              </div>
            </div>
          </div>

          <div className="result-action">
            <p><Icon name="check" size={18} /> Data dan masa kerja sudah sesuai? Unduh surat resmi KP4 Anda.</p>
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
