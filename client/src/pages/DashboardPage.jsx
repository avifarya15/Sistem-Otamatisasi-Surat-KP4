import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Icon from '../components/Icon';

const dateOnly = (value) => value ? String(value).split('T')[0] : '';
const prettyDate = (value) => value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
function Field({ label, children }) { return <label className="field-group"><span className="field-label">{label}</span>{children}</label>; }
function EmptyState({ text }) { return <div className="empty-state"><span className="empty-icon"><Icon name="users" size={21} /></span><p>{text}</p></div>; }

function DashboardPage() {
  const [pegawaiList, setPegawaiList] = useState([]);
  const [selectedNip, setSelectedNip] = useState(null);
  const [selectedPegawai, setSelectedPegawai] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formPegawai, setFormPegawai] = useState({});
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState('');

  const [formPasangan, setFormPasangan] = useState({});
  const [isAddingPasangan, setIsAddingPasangan] = useState(false);
  const [editingPasangan, setEditingPasangan] = useState(false);
  const [formAnak, setFormAnak] = useState({});
  const [isAddingAnak, setIsAddingAnak] = useState(false);
  const [editingAnakId, setEditingAnakId] = useState(null);

  useEffect(() => {
    fetchPegawaiList();
  }, [refresh]);

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
        gaji_pokok: res.data.gaji_pokok
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

  const updatePegawai = (key, value) => setFormPegawai({ ...formPegawai, [key]: value });

  const handleSavePegawai = async (e) => {
    e.preventDefault();
    try {
      if (isAdding) {
        await api.post('/admin/pegawai', formPegawai);
        window.alert('Pegawai berhasil ditambahkan');
        setIsAdding(false);
      } else {
        await api.put(`/admin/pegawai/${formPegawai.nip}`, formPegawai);
        window.alert('Data pegawai berhasil diperbarui');
      }
      setRefresh(v => v + 1);
      if (formPegawai.nip) loadPegawaiDetail(formPegawai.nip);
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

  const filtered = useMemo(() => pegawaiList.filter(p => `${p.nama} ${p.nip} ${p.unit_kerja}`.toLowerCase().includes(query.toLowerCase())), [pegawaiList, query]);

  return (
    <main className="admin-main page-wrap">
      <div className="admin-heading">
        <div>
          <div className="eyebrow">Workspace administrasi</div>
          <h1 className="display-font">Data pegawai</h1>
          <p>Kelola informasi pegawai dan keluarga dalam satu ruang kerja.</p>
        </div>
        <button className="btn-primary" onClick={() => { setIsAdding(true); setSelectedPegawai(null); setSelectedNip(null); setFormPegawai({}); }}>
          <Icon name="plus" size={17} /> Pegawai baru
        </button>
      </div>

      <div className="metric-row">
        <div className="metric-card">
          <span className="metric-icon teal"><Icon name="users" size={19} /></span>
          <div>
            <small>Total pegawai</small>
            <strong>{pegawaiList.length}</strong>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-icon terracotta"><Icon name="file" size={19} /></span>
          <div>
            <small>Siap dilayani</small>
            <strong>{pegawaiList.length}<i> aktif</i></strong>
          </div>
        </div>
        <div className="metric-card metric-note">
          <span className="tiny-dot" />
          <div>
            <small>Status sistem</small>
            <strong>Berjalan normal</strong>
          </div>
        </div>
      </div>

      <div className="admin-grid">
        <section className="soft-card directory-card">
          <div className="section-head">
            <div>
              <h2>Direktori pegawai</h2>
              <p>Pilih nama untuk melihat dan mengelola detail.</p>
            </div>
            <div className="search-box">
              <Icon name="search" size={16} />
              <input placeholder="Cari nama atau NIP…" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama & NIP</th>
                  <th>Golongan</th>
                  <th>Jabatan</th>
                  <th>Unit kerja</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5"><div className="loading-state">Memuat direktori…</div></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="5"><EmptyState text="Belum ada data yang cocok." /></td></tr>
                ) : (
                  filtered.map(p => (
                    <tr key={p.nip} className={selectedNip === p.nip ? 'active' : ''}>
                      <td>
                        <strong className="person-name">{p.nama}</strong>
                        <span className="person-nip">{p.nip}</span>
                      </td>
                      <td><span className="grade-pill">{p.golongan || '—'}</span></td>
                      <td>{p.jabatan || '—'}</td>
                      <td>{p.unit_kerja || '—'}</td>
                      <td>
                        <button className="table-action" onClick={() => loadPegawaiDetail(p.nip)}>Buka</button>
                        <button className="icon-action danger" aria-label="Hapus" onClick={() => handleDeletePegawai(p.nip)}>
                          <Icon name="trash" size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {(selectedPegawai || isAdding) && (
        <section className="soft-card detail-card fade-up">
          <div className="detail-header">
            <div>
              <div className="eyebrow">{isAdding ? 'Data baru' : 'Profil pegawai'}</div>
              <h2>{isAdding ? 'Tambah pegawai' : selectedPegawai.nama}</h2>
              <p>{isAdding ? 'Lengkapi informasi dasar pegawai.' : `NIP ${selectedPegawai.nip} · ${selectedPegawai.unit_kerja || 'Unit kerja belum diisi'}`}</p>
            </div>
            <button className="close-detail" onClick={() => { setIsAdding(false); setSelectedPegawai(null); setSelectedNip(null); }}>
              <Icon name="close" size={18} />
            </button>
          </div>

          <form onSubmit={handleSavePegawai} className="form-grid">
            <Field label="NIP">
              <input className="field-input" value={formPegawai.nip || ''} onChange={e => updatePegawai('nip', e.target.value)} readOnly={!isAdding} maxLength={18} required />
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
            <Field label="Golongan">
              <input className="field-input" value={formPegawai.golongan || ''} onChange={e => updatePegawai('golongan', e.target.value)} placeholder="III/c" />
            </Field>
            <Field label="Jabatan">
              <input className="field-input" value={formPegawai.jabatan || ''} onChange={e => updatePegawai('jabatan', e.target.value)} />
            </Field>
            <Field label="Unit kerja">
              <input className="field-input" value={formPegawai.unit_kerja || ''} onChange={e => updatePegawai('unit_kerja', e.target.value)} />
            </Field>
            <Field label="Gaji pokok (Rp)">
              <input className="field-input" type="number" value={formPegawai.gaji_pokok || ''} onChange={e => updatePegawai('gaji_pokok', e.target.value)} />
            </Field>
            <div className="form-actions">
              <button className="btn-primary" type="submit"><Icon name="check" size={16} /> Simpan data</button>
              <button className="btn-ghost" type="button" onClick={() => { setIsAdding(false); setSelectedPegawai(null); }}>Batal</button>
            </div>
          </form>

          {selectedPegawai && (
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
          )}
        </section>
      )}
    </main>
  );
}

export default DashboardPage;
