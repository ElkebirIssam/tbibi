import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  const fetch = useCallback(() => {
    api.get(`/notifications?page=${page}&limit=${limit}`)
      .then(r => { setNotifications(r.data.data); setTotal(r.data.total); })
      .catch(() => {});
  }, [page, limit]);

  useEffect(() => { fetch(); }, [fetch]);

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    fetch();
  };

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex-between mb-4">
        <h2>Notifications</h2>
        <button className="btn btn-outline btn-sm" onClick={markAllRead}>Tout marquer comme lu</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#a0aec0' }}>Aucune notification</div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`flex-between ${!n.is_read ? 'unread' : ''}`}
              style={{
                padding: '14px 20px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                background: !n.is_read ? '#ebf8ff' : 'transparent', transition: 'background 0.15s',
              }}
              onClick={() => !n.is_read && markRead(n.id)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#2d3748' }}>{n.title}</div>
                {n.message && <div style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>{n.message}</div>}
                <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {n.data?.status && (
                <span className={`badge badge-${n.data.status === 'confirmed' ? 'success' : 'danger'}`} style={{ marginLeft: 12 }}>
                  {n.data.status === 'confirmed' ? 'Confirmé' : 'Annulé'}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex-center mt-4" style={{ gap: 8 }}>
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Precedent</button>
          <span className="text-sm">Page {page} / {totalPages}</span>
          <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Suivant</button>
        </div>
      )}
    </div>
  );
}
