import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Icon from '../components/Icon';

function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', response.data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal. Periksa kembali kredensial Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-main">
      <div className="auth-orbit" />
      <section className="auth-layout page-wrap">
        <div className="auth-pitch">
          <span className="brand-mark large"><Icon name="shield" size={28} /></span>
          <div className="eyebrow">Ruang pengelola</div>
          <h1>Kelola data<br /><em>dengan tenang.</em></h1>
          <p>Panel admin KP4 membantu menjaga data kepegawaian tetap rapi, akurat, dan siap dilayani.</p>
          <div className="auth-stat">
            <strong>KP4</strong>
            <span>Internal workspace<br />Akses terbatas petugas</span>
          </div>
        </div>
        <div className="auth-card soft-card">
          <div className="card-kicker"><span className="step-badge">AD</span><span>Admin portal</span></div>
          <h2>Selamat datang kembali</h2>
          <p className="card-intro">Masuk untuk melanjutkan pengelolaan data.</p>
          {error && <div className="error-box">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="field-label">Username</label>
              <input className="field-input" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Masukkan username" required />
            </div>
            <div className="form-group">
              <label className="field-label">Password</label>
              <input className="field-input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan password" required />
            </div>
            <button className="btn-primary full-btn" type="submit" disabled={loading}>
              {loading ? 'Memproses…' : <>Masuk ke dashboard <Icon name="arrow" size={16} /></>}
            </button>
          </form>
          <div className="form-footnote"><Icon name="shield" size={14} /> Sesi aman untuk petugas terotorisasi</div>
        </div>
      </section>
    </main>
  );
}

export default AdminLoginPage;
