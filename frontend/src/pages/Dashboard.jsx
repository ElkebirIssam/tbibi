import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [appRes, msgRes] = await Promise.all([
          api.get('/appointments'),
          api.get('/messages/unread-count'),
        ]);
        setStats({
          appointments: appRes.data.length,
          unreadMessages: msgRes.data.count,
        });
      } catch {}
    }
    fetchStats();
  }, []);

  return (
    <div>
      <div className="grid grid-3 mb-4">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>📅</div>
          <div>
            <div className="stat-value">{stats?.appointments || 0}</div>
            <div className="stat-label">Rendez-vous</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5' }}>💬</div>
          <div>
            <div className="stat-value">{stats?.unreadMessages || 0}</div>
            <div className="stat-label">Messages non lus</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}>👤</div>
          <div>
            <div className="stat-value">{user?.firstName} {user?.lastName}</div>
            <div className="stat-label">{user?.email}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <Link to="/calendar" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-header">📅 Calendrier des rendez-vous</div>
          <p className="text-muted">Consultez et gérez vos rendez-vous.</p>
        </Link>
        <Link to="/messages" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-header">💬 Messagerie</div>
          <p className="text-muted">Messages et notifications.</p>
        </Link>
        {['doctor', 'assistant', 'nurse', 'super_admin'].includes(user?.role) && (
          <Link to="/patients" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-header">👥 Patients</div>
            <p className="text-muted">Recherche et gestion des dossiers patients.</p>
          </Link>
        )}
        {user?.role === 'doctor' && (
          <Link to="/consultations" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-header">🩺 Consultations</div>
            <p className="text-muted">Rédiger des prescriptions et certificats.</p>
          </Link>
        )}
      </div>
    </div>
  );
}
