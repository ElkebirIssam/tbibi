import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { connectSocket, disconnectSocket } from '../services/socket';
import NotificationBell from './NotificationBell';

const navItems = {
  all: [],
  doctor: [
    { section: 'Gestion' },
    { to: '/messagerie', label: 'Messagerie interne', icon: '💬' },
    { to: '/assistants', label: 'Assistants', icon: '👥' },
    {
      label: 'Patients', icon: '👤',
      children: [
        { to: '/patients', label: 'Fiche Patient' },
        { to: '/consultations', label: 'Liste des consultations' },
      ],
    },
    {
      label: 'Finances', icon: '💰',
      children: [
        { to: '/invoices', label: 'Factures Clients' },
        { to: '/caisse', label: 'Caisse' },
        { to: '/subscription', label: 'Mon abonnement' },
      ],
    },
    { to: '/profile', label: 'Profil', icon: '⚙️' },
    { divider: true },
  ],
  assistant: [
    { section: 'Gestion' },
    { to: '/patients', label: 'Patients', icon: '👥' },
    { to: '/invoices', label: 'Factures', icon: '💰' },
  ],
  super_admin: [
    { section: 'Administration' },
    { to: '/admin/users', label: 'Utilisateurs', icon: '👤' },
    { to: '/admin/specializations', label: 'Spécialités', icon: '🏷️' },
    { to: '/admin/payments', label: 'Paiements', icon: '💳' },
    { to: '/patients', label: 'Patients', icon: '👥' },
    { to: '/invoices', label: 'Factures', icon: '💰' },
  ],
  patient: [
    { section: 'Mon espace' },
    { to: '/dashboard', label: 'Tableau de bord', icon: '📊' },
    { to: '/calendar', label: 'Prise de rendez-vous', icon: '📅' },
    { to: '/dossier', label: 'Mon dossier', icon: '📋' },
    { to: '/profile', label: 'Mon profil', icon: '⚙️' },
  ],
};

function SidebarNavItem({ item, location }) {
  const [open, setOpen] = useState(false);

  if (item.section) {
    return <div className="nav-section">{item.section}</div>;
  }

  if (item.divider) {
    return <div className="nav-divider" />;
  }

  if (item.children) {
    const isActive = item.children.some(c => location.pathname.startsWith(c.to));
    return (
      <div>
        <div className={`nav-item ${isActive ? 'active' : ''}`} onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
          <span>{item.icon}</span> {item.label}
          <span className="nav-chevron" style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
        </div>
        {open && (
          <div className="nav-sub">
            {item.children.map(c => (
              <NavLink key={c.to} to={c.to} className={({ isActive }) => `nav-sub-item ${isActive ? 'active' : ''}`}>
                {c.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <span>{item.icon}</span> {item.label}
    </NavLink>
  );
}

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('tbibi_token');
      connectSocket(token);
      return () => disconnectSocket();
    }
  }, [user]);

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login');
  };

  const items = [...(navItems.all || []), ...(navItems[user?.role] || [])];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">🏥 Tbibi.tn</div>
        <nav className="sidebar-nav">
          {items.map((item, i) => (
            <SidebarNavItem key={i} item={item} location={location} />
          ))}
        </nav>
        <div className="sidebar-footer">
          <a href="#" className="nav-item" onClick={handleLogout}>🚪 Déconnexion</a>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
            <h2 className="page-title" style={{ margin: 0 }}>
              {user?.firstName} {user?.lastName}
              <span className="badge badge-info" style={{ marginLeft: 10, verticalAlign: 'middle' }}>
                {user?.role === 'super_admin' ? 'Admin' : user?.role === 'doctor' ? 'Médecin' : user?.role === 'assistant' ? 'Assistant' : user?.role === 'nurse' ? 'Infirmier' : 'Patient'}
              </span>
            </h2>
            <div style={{ marginLeft: 'auto' }}>
              <NotificationBell />
            </div>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
