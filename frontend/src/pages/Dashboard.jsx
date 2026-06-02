import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Link, useNavigate } from 'react-router-dom';

function StatCard({ icon, bg, value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg }}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

const STATUS_STYLES = {
  confirmed: { bg: '#f0fdf4', border: '#86efac', label: 'Confirmé', badge: 'success' },
  pending: { bg: '#fffbeb', border: '#fde68a', label: 'En attente', badge: 'warning' },
  cancelled: { bg: '#fef2f2', border: '#fca5a5', label: 'Refusé', badge: 'danger' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);

  const isDoctor = user?.role === 'doctor';
  const isPatient = user?.role === 'patient';

  useEffect(() => {
    async function fetchData() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const calls = [
          api.get('/appointments'),
          api.get('/messages/unread-count'),
          api.get(`/appointments?startDate=${today}T00:00:00&endDate=${today}T23:59:59`).catch(() => ({ data: [] })),
        ];

        if (isDoctor) {
          calls.push(
            api.get('/doctors/patients').catch(() => ({ data: [] })),
            api.get('/appointments?status=pending'),
            api.get('/invoices').catch(() => ({ data: { data: [] } })),
          );
        }

        const [appRes, msgRes, todayRes, ...rest] = await Promise.all(calls);

        let extra = {};
        if (isDoctor) {
          const [patientsRes, pendingRes, invoicesRes] = rest;
          const invoices = Array.isArray(invoicesRes.data) ? invoicesRes.data : invoicesRes.data?.data || [];
          extra = {
            totalPatients: Array.isArray(patientsRes.data) ? patientsRes.data.length : 0,
            pendingCount: pendingRes.data.length,
            totalRevenue: invoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0),
          };
          setPendingAppointments(pendingRes.data.slice(0, 5));
        }

        setData({
          totalAppointments: appRes.data.length,
          unreadMessages: msgRes.data?.count || 0,
          ...extra,
        });

        setTodayAppointments(todayRes.data || []);
        setMyAppointments(appRes.data || []);
      } catch {}
    }
    fetchData();
  }, [user, isDoctor]);

  return (
    <div>
      <div className="mb-4">
        <h2 style={{ margin: 0 }}>
          {isDoctor ? `Bonjour, Dr. ${user?.firstName} ${user?.lastName}` : `Bonjour, ${user?.firstName} ${user?.lastName}`}
        </h2>
        <p className="text-muted" style={{ margin: '4px 0 0' }}>
          {new Date().toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className={`grid ${isPatient ? 'grid-3' : isDoctor ? 'grid-4' : 'grid-3'} mb-4`}>
        <StatCard icon="📅" bg="#dbeafe" value={data?.totalAppointments || 0} label={isPatient ? 'Mes RDV' : 'RDV'} />
        {isPatient && <StatCard icon="💬" bg="#d1fae5" value={data?.unreadMessages || 0} label="Messages" />}
        {isDoctor && <StatCard icon="⏳" bg="#fef3c7" value={data?.pendingCount || 0} label="En attente" />}
        {isDoctor && <StatCard icon="👥" bg="#d1fae5" value={data?.totalPatients || 0} label="Patients" />}
        {isDoctor && <StatCard icon="💰" bg="#ede9fe" value={data?.totalRevenue ? `${data.totalRevenue} TND` : '0 TND'} label="Revenus" />}
        {['assistant', 'super_admin'].includes(user?.role) && <StatCard icon="💬" bg="#d1fae5" value={data?.unreadMessages || 0} label="Messages" />}
      </div>

      <div className="grid grid-2" style={{ gap: 24 }}>
        <div>
          {/* Pending appointments - Doctor only */}
          {isDoctor && pendingAppointments.length > 0 && (
            <div className="card mb-4">
              <div className="flex-between mb-3">
                <h4 style={{ margin: 0, color: '#d97706' }}>⏳ Demandes en attente</h4>
                <Link to="/calendar" className="btn btn-sm btn-outline">Voir tout</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingAppointments.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
                    <div>
                      <strong>{ev.patient_first_name} {ev.patient_last_name}</strong>
                      <span className="text-sm text-muted" style={{ marginLeft: 8 }}>
                        {new Date(ev.start_time).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })} à {new Date(ev.start_time).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-success" onClick={async () => { await api.put(`/appointments/${ev.id}/confirm`); window.location.reload(); }}>✅</button>
                      <button className="btn btn-sm btn-danger" onClick={async () => { const reason = prompt('Motif du refus :'); await api.put(`/appointments/${ev.id}/reject`, { reason }); window.location.reload(); }}>❌</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's appointments */}
          <div className="card mb-4">
            <div className="flex-between mb-3">
              <h4 style={{ margin: 0, color: '#2d3748' }}>📅 Aujourd'hui</h4>
              <Link to="/calendar" className="btn btn-sm btn-outline">Calendrier</Link>
            </div>
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-muted">Aucun rendez-vous aujourd'hui.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {todayAppointments.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 6, background: STATUS_STYLES[ev.status]?.bg || '#fff', border: `1px solid ${STATUS_STYLES[ev.status]?.border || '#e2e8f0'}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, minWidth: 50, color: '#64748b' }}>
                      {new Date(ev.start_time).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ flex: 1 }}>
                      {isPatient ? (
                        <strong>Dr. {ev.doctor_first_name} {ev.doctor_last_name}</strong>
                      ) : (
                        <strong>{ev.patient_first_name} {ev.patient_last_name}</strong>
                      )}
                      <span className="text-sm text-muted" style={{ marginLeft: 6 }}>{ev.title || 'Consultation'}</span>
                    </div>
                    <span className={`badge badge-${STATUS_STYLES[ev.status]?.badge || 'default'}`}>
                      {STATUS_STYLES[ev.status]?.label || ev.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          {/* All appointments for patient */}
          {isPatient && (
            <div className="card mb-4">
              <div className="flex-between mb-3">
                <h4 style={{ margin: 0 }}>📋 Mes rendez-vous</h4>
              </div>
              {myAppointments.length === 0 ? (
                <p className="text-sm text-muted">Aucun rendez-vous.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {myAppointments.sort((a, b) => new Date(b.start_time) - new Date(a.start_time)).slice(0, 10).map(ev => {
                    const s = STATUS_STYLES[ev.status] || STATUS_STYLES.pending;
                    return (
                      <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: s.bg, border: `1px solid ${s.border}` }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: ev.status === 'confirmed' ? '#22c55e' : ev.status === 'cancelled' ? '#ef4444' : '#eab308', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <strong>Dr. {ev.doctor_first_name} {ev.doctor_last_name}</strong>
                          <span className="text-sm" style={{ marginLeft: 8, color: '#64748b' }}>
                            {new Date(ev.start_time).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-sm" style={{ marginLeft: 4, color: '#64748b' }}>
                            {new Date(ev.start_time).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className={`badge badge-${s.badge}`}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="card mb-4">
            <h4 style={{ marginTop: 0, marginBottom: 16 }}>⚡ Actions rapides</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isPatient && (
                <>
                  <button className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => navigate('/calendar')}>
                    📅 Prendre un rendez-vous
                  </button>
                  <button className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => navigate('/trouver-medecin')}>
                    🔍 Trouver un médecin
                  </button>
                  <button className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => navigate('/dossier')}>
                    📋 Mon dossier médical
                  </button>
                </>
              )}
              {isDoctor && (
                <>
                  <button className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => navigate('/calendar')}>
                    📅 Voir le calendrier
                  </button>
                  <button className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => navigate('/consultations')}>
                    🩺 Nouvelle consultation
                  </button>
                  <button className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => navigate('/patients')}>
                    👥 Rechercher un patient
                  </button>
                  <button className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => navigate('/availability')}>
                    ⏰ Gérer mes disponibilités
                  </button>
                  <button className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => navigate('/invoices')}>
                    💰 Notes d'honoraires
                  </button>
                </>
              )}
              {['assistant', 'super_admin'].includes(user?.role) && (
                <>
                  <button className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => navigate('/calendar')}>
                    📅 Calendrier
                  </button>
                  <button className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => navigate('/patients')}>
                    👥 Patients
                  </button>
                  <button className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => navigate('/invoices')}>
                    💰 Notes d'honoraires
                  </button>
                </>
              )}
              <button className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => navigate('/messages')}>
                💬 Messages ({data?.unreadMessages || 0} non lu{(data?.unreadMessages || 0) > 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
