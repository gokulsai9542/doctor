import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const linkStyle = { color: '#fff', textDecoration: 'none', fontWeight: 500 };

  return (
    <nav style={{ padding: '12px 24px', background: '#1a1a2e', color: '#fff', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 700, fontSize: 18, marginRight: 8 }}>🩺 MedAnnotate</span>

      <Link to="/dashboard" style={linkStyle}>Dashboard</Link>

      {/* Doctor links */}
      {user?.role === 'doctor' && <>
        <Link to="/tasks"    style={linkStyle}>Tasks</Link>
        <Link to="/earnings" style={linkStyle}>Earnings</Link>
      </>}

      {/* Provider links */}
      {user?.role === 'provider' && (
        <Link to="/provider" style={linkStyle}>Provider Panel</Link>
      )}

      {/* Admin links */}
      {user?.role === 'admin' && <>
        <Link to="/admin"    style={linkStyle}>Admin Panel</Link>
        <Link to="/earnings" style={linkStyle}>Payments</Link>
      </>}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, opacity: 0.8 }}>
          {user?.name} ({user?.role})
        </span>
        <button onClick={handleLogout}
          style={{ padding: '6px 14px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
