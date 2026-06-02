import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const deleteNotif = async (id) => {
    await api.delete(`/notifications/${id}`);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setTotal(t => t - 1);
  };

  const handleAccessResponse = async (notifId, accessRequestId, status) => {
    try {
      await api.put(`/consultations/access-requests/${accessRequestId}/respond`, { status });
      setNotifications(prev => prev.map(n =>
        n.id === notifId ? { ...n, is_read: true, data: { ...n.data, status } } : n
      ));
      window.dispatchEvent(new CustomEvent('notification-update'));
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  const isDoctor = user?.role === 'doctor';
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
          notifications.map(n => {
            const isAccessRequest = n.type === 'access_request';
            const isAccessResponse = n.type === 'access_response';
            const reqStatus = n.data?.status;
            return (
              <div
                key={n.id}
                className={`flex-between ${!n.is_read ? 'unread' : ''}`}
                style={{
                  padding: '14px 20px', borderBottom: '1px solid var(--border)',
                  background: !n.is_read ? '#ebf8ff' : 'transparent', transition: 'background 0.15s',
                }}
                onClick={() => !n.is_read && !isAccessRequest && markRead(n.id)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#2d3748' }}>{n.title}</div>
                  {n.message && <div style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>{n.message}</div>}
                  {(isAccessRequest || isAccessResponse) && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 13, color: '#475569' }}>
                      {n.data?.requestingDoctorName && (
                        <span style={{ background: '#f1f5f9', padding: '3px 10px', borderRadius: 6 }}>
                          🩺 Médecin : {n.data.requestingDoctorName}
                        </span>
                      )}
                      {n.data?.doctorName && (
                        <span style={{ background: '#f1f5f9', padding: '3px 10px', borderRadius: 6 }}>
                          🩺 Médecin : {n.data.doctorName}
                        </span>
                      )}
                      {n.data?.patientName && (
                        <span style={{ background: '#f1f5f9', padding: '3px 10px', borderRadius: 6 }}>
                          👤 Patient : {n.data.patientName}
                        </span>
                      )}
                    </div>
                  )}
                  {(isAccessRequest || isAccessResponse) && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                      {n.data?.messageId ? (
                        <Link to={`/messagerie?userId=${isAccessRequest ? n.data.requestingDoctorUserId : n.data.doctorUserId}`} className="btn btn-sm btn-outline" onClick={e => e.stopPropagation()}>
                          📧 Voir le message
                        </Link>
                      ) : isAccessRequest && n.data?.requestingDoctorUserId ? (
                        <Link to={`/messagerie?userId=${n.data.requestingDoctorUserId}`} className="btn btn-sm btn-outline" onClick={e => e.stopPropagation()}>
                          💬 Contacter le médecin
                        </Link>
                      ) : null}
                      {n.data?.patientId && (
                        <Link to={`/patients/${n.data.patientId}`} className="btn btn-sm btn-outline" onClick={e => e.stopPropagation()}>
                          📋 Dossier patient
                        </Link>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {isAccessResponse && reqStatus && (
                    <span className={`badge badge-${reqStatus === 'approved' ? 'success' : 'danger'}`}>
                      {reqStatus === 'approved' ? '✅ Accepté' : '❌ Refusé'}
                    </span>
                  )}
                  {isAccessRequest && reqStatus === 'pending' && isDoctor && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-success" onClick={e => { e.stopPropagation(); handleAccessResponse(n.id, n.data.accessRequestId, 'approved'); }}>
                        ✓ Accepter
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); handleAccessResponse(n.id, n.data.accessRequestId, 'denied'); }}>
                        ✕ Refuser
                      </button>
                    </div>
                  )}
                  {isAccessRequest && reqStatus !== 'pending' && (
                    <span className={`badge badge-${reqStatus === 'approved' ? 'success' : 'danger'}`}>
                      {reqStatus === 'approved' ? 'Accepté' : 'Refusé'}
                    </span>
                  )}
                  {(n.is_read && !isAccessRequest) || (isAccessRequest && reqStatus !== 'pending') ? (
                    <button className="btn btn-sm btn-outline" onClick={e => { e.stopPropagation(); deleteNotif(n.id); }} style={{ color: '#ef4444', borderColor: '#fca5a5' }}>
                      Supprimer
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
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
