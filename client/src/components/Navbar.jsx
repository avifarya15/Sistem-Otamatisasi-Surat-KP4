import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';

function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    setOpen(false);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;
  const navLink = (path) => `nav-link ${isActive(path) ? 'active' : ''}`;

  return (
    <header className="site-header">
      <div className="page-wrap header-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <img src="/Logo.png" alt="Logo Kantor" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <span><strong>KP4</strong><small>Layanan tunjangan keluarga</small></span>
        </Link>
        <button className="menu-toggle" aria-label="Buka menu" onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} size={20} /></button>
        <nav className={`main-nav ${open ? 'open' : ''}`}>
          <Link to="/" className={navLink('/')} onClick={() => setOpen(false)}><Icon name="file" size={16} /> Cetak Surat</Link>
          {token ? <>
            <Link to="/admin/dashboard" className={navLink('/admin/dashboard')} onClick={() => setOpen(false)}><Icon name="users" size={16} /> Data Pegawai</Link>
            <Link to="/admin/logs" className={navLink('/admin/logs')} onClick={() => setOpen(false)}><Icon name="log" size={16} /> Aktivitas</Link>
            <button className="logout-link" onClick={handleLogout}><Icon name="logout" size={16} /> Keluar</button>
          </> : <Link to="/admin/login" className="admin-link" onClick={() => setOpen(false)}>Masuk Admin <Icon name="arrow" size={15} /></Link>}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
