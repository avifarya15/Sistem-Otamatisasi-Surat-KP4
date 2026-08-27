import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import PegawaiPage from './pages/PegawaiPage';
import AdminLoginPage from './pages/AdminLoginPage';
import DashboardPage from './pages/DashboardPage';
import LogAktivitasPage from './pages/LogAktivitasPage';

function ProtectedRoute({ children }) { return localStorage.getItem('token') ? children : <Navigate to="/admin/login" replace />; }
function App() { return <div className="app-shell"><Navbar /><div className="app-content"><Routes><Route path="/" element={<PegawaiPage />} /><Route path="/admin/login" element={<AdminLoginPage />} /><Route path="/admin/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} /><Route path="/admin/logs" element={<ProtectedRoute><LogAktivitasPage /></ProtectedRoute>} /></Routes></div><footer className="site-footer"><div className="page-wrap"><span>KP4</span><span>© 2024 · Layanan administrasi kepegawaian</span></div></footer></div>; }
export default App;
