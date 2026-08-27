import { useState } from 'react';
import api from '../api/axios';
import Icon from '../components/Icon';

const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
const formatCurrency = (amount) => amount == null ? '-' : Number(amount).toLocaleString('id-ID');

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

  const handleVerify = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); setData(null);
    try { const response = await api.post('/print/validate', { nip, tanggal_lahir: tanggalLahir }); setData(response.data); }
    catch (err) { setError(err.response?.data?.message || 'Terjadi kesalahan saat memverifikasi data.'); }
    finally { setLoading(false); }
  };
  const handlePrint = async () => {
    setPrinting(true);
    try { const response = await api.post('/print/generate', { nip }, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([response.data])); const link = document.createElement('a'); link.href = url; link.download = `KP4_${nip}.pdf`; document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url); }
    catch { window.alert('Gagal mencetak PDF. Silakan coba lagi.'); }
    finally { setPrinting(false); }
  };

  return <main className="public-main">
    <section className="public-hero page-wrap">
      <div className="hero-copy fade-up">
        <div className="eyebrow">Portal layanan mandiri</div>
        <h1>Urus surat KP4,<br /><em>lebih sederhana.</em></h1>
        <p>Verifikasi data tunjangan keluarga Anda dengan aman, lalu unduh surat resmi dalam hitungan menit.</p>
        <div className="hero-note"><span className="note-icon"><Icon name="shield" size={16} /></span><span>Data terlindungi dan hanya digunakan untuk proses penerbitan surat.</span></div>
      </div>
      <div className="verify-card soft-card fade-up">
        <div className="card-kicker"><span className="step-badge">01</span><span>Verifikasi identitas</span></div>
        <h2>Temukan data Anda</h2>
        <p className="card-intro">Masukkan NIP dan tanggal lahir sesuai data kepegawaian.</p>
        <form onSubmit={handleVerify}>
          <div className="form-group"><label className="field-label">NIP <span>(18 digit)</span></label><input className="field-input" type="text" inputMode="numeric" placeholder="198001012005011001" value={nip} onChange={e => setNip(e.target.value)} maxLength={18} required /></div>
          <div className="form-group"><label className="field-label">Tanggal lahir</label><input className="field-input" type="date" value={tanggalLahir} onChange={e => setTanggalLahir(e.target.value)} required /></div>
          {error && <div className="error-box">{error}</div>}
          <button className="btn-primary full-btn" type="submit" disabled={loading}>{loading ? 'Memverifikasi…' : <>Verifikasi data <Icon name="arrow" size={16} /></>}</button>
        </form>
        <div className="form-footnote"><span className="tiny-dot" /> Sistem aktif · Layanan tersedia 24 jam</div>
      </div>
    </section>

    <section className="benefit-strip page-wrap">
      <div><span className="benefit-icon"><Icon name="shield" size={18} /></span><span><strong>Aman & terverifikasi</strong><small>Validasi langsung dari basis data</small></span></div>
      <div><span className="benefit-icon terracotta"><Icon name="file" size={18} /></span><span><strong>Surat resmi digital</strong><small>Siap diunduh dan dicetak</small></span></div>
      <div><span className="benefit-icon navy"><Icon name="heart" size={18} /></span><span><strong>Tanpa antre</strong><small>Proses mandiri dari mana saja</small></span></div>
    </section>

    {data && <section className="result-card soft-card page-wrap fade-up">
      <div className="result-header"><div><div className="eyebrow">02 · Data ditemukan</div><h2>Periksa kembali informasi Anda</h2></div><span className="status-pill">Terverifikasi</span></div>
      <div className="result-section"><h3><span className="section-line" />Data pegawai</h3><div className="info-grid"><InfoItem label="NIP" value={data.nip} /><InfoItem label="Nama lengkap" value={data.nama} /><InfoItem label="Tempat / tanggal lahir" value={`${data.tempat_lahir || '-'}, ${formatDate(data.tanggal_lahir)}`} /><InfoItem label="Golongan" value={data.golongan} /><InfoItem label="Jabatan" value={data.jabatan} /><InfoItem label="Unit kerja" value={data.unit_kerja} /><InfoItem label="Gaji pokok" value={`Rp ${formatCurrency(data.gaji_pokok)}`} /></div></div>
      <div className="result-section"><h3><span className="section-line terracotta-line" />Data keluarga</h3><div className="family-grid">
        <div className="family-panel"><span className="family-label">Pasangan</span>{data.pasangan?.length ? <><strong>{data.pasangan[0].nama}</strong><p>{data.pasangan[0].pekerjaan || '—'} · Menikah {formatDate(data.pasangan[0].tanggal_menikah)}</p></> : <p className="muted">Belum ada data pasangan</p>}</div>
        <div className="family-panel"><span className="family-label">Anak</span>{data.anak?.length ? <><strong>{data.anak.length} anak tercatat</strong><p>{data.anak.map(a => a.nama).join(', ')}</p></> : <p className="muted">Belum ada data anak</p>}</div>
      </div></div>
      <div className="result-action"><p><Icon name="check" size={18} /> Data sudah sesuai?</p><button className="btn-teal" onClick={handlePrint} disabled={printing}>{printing ? 'Menyiapkan PDF…' : <>Unduh surat KP4 <Icon name="download" size={17} /></>}</button></div>
    </section>}
  </main>;
}
export default PegawaiPage;
