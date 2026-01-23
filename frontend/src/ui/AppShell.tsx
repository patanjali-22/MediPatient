import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { authStore } from './authStore';

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = authStore.getToken();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Link to="/dashboard">🏥 MediPatient</Link>
        </div>
        <nav className="nav">
          <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
            Dashboard
          </Link>
          <Link to="/patients" className={isActive('/patients') ? 'active' : ''}>
            Patients
          </Link>
          <Link to="/billing" className={isActive('/billing') ? 'active' : ''}>
            Billing
          </Link>
          <Link to="/analytics" className={isActive('/analytics') ? 'active' : ''}>
            Analytics
          </Link>
        </nav>
        <div className="spacer" />
        <div className="actions">
          {token ? (
            <button
              className="btn"
              onClick={() => {
                authStore.clearToken();
                navigate('/login');
              }}
            >
              Logout
            </button>
          ) : (
            <Link className="btn" to="/login">
              Login
            </Link>
          )}
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
