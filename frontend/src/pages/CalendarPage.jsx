import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AppointmentBooking from './AppointmentBooking';

export default function CalendarPage() {
  const { user } = useAuth();

  // Patient sees the split booking layout
  if (user?.role === 'patient') {
    return <AppointmentBooking />;
  }
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState({ patientId: '', doctorId: '', startTime: '', endTime: '', title: '', notes: '' });
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    fetchAppointments();
    if (['assistant', 'nurse', 'doctor'].includes(user?.role)) {
      api.get('/patients/search?q=').catch(() => {});
      api.get('/doctors/patients').then(r => setPatients(r.data)).catch(() => {});
    }
    if (user?.role === 'patient') {
      api.get('/patients/doctors').then(r => setDoctors(r.data)).catch(() => {});
    }
  }, [user]);

  async function fetchAppointments() {
    try {
      const res = await api.get('/appointments');
      setEvents(res.data.map(a => ({
        id: a.id,
        title: `${a.patient_first_name || ''} ${a.patient_last_name || ''} - ${a.title || 'RDV'}`,
        start: a.start_time,
        end: a.end_time,
        extendedProps: a,
      })));
    } catch {}
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const payload = { ...form };
      // If patient booked with just a date, convert to full datetime
      if (user?.role === 'patient' && payload.date) {
        // Get patient profile
        const patientRes = await api.get('/patients/my-profile');
        payload.patientId = patientRes.data.patient.id;
        payload.startTime = `${payload.date}T08:00:00`;
        payload.endTime = `${payload.date}T17:00:00`;
        delete payload.date;
      }
      await api.post('/appointments', payload);
      setShowModal(false);
      setForm({ patientId: '', doctorId: '', startTime: '', endTime: '', title: '', notes: '', date: '' });
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Annuler ce rendez-vous ?')) return;
    try {
      await api.delete(`/appointments/${id}`);
      setSelectedEvent(null);
      fetchAppointments();
    } catch {}
  }

  async function confirmAppointment(id) {
    try {
      await api.put(`/appointments/${id}`, { status: 'confirmed' });
      setSelectedEvent(null);
      fetchAppointments();
    } catch {}
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <h2>📅 Calendrier des rendez-vous</h2>
        {['assistant', 'nurse', 'doctor', 'super_admin', 'patient'].includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nouveau RDV</button>
        )}
      </div>

      <div className="card">
        <div className="fc">
          <div className="grid" style={{ gap: 4 }}>
            {['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontWeight: 600, fontSize: 12, padding: 8, color: '#64748b' }}>{d}</div>
            ))}
            {events.length === 0 ? (
              <div style={{ gridColumn: '1/8', textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                Aucun rendez-vous. {user?.role === 'patient' ? 'Prenez rendez-vous avec votre médecin.' : 'Créez un nouveau rendez-vous.'}
              </div>
            ) : (
              events.slice(0, 14).map((ev, i) => (
                <div
                  key={i}
                  style={{
                    padding: '6px 8px',
                    margin: 2,
                    borderRadius: 6,
                    background: '#dbeafe',
                    fontSize: 12,
                    cursor: 'pointer',
                    border: '1px solid #bfdbfe',
                  }}
                  onClick={() => setSelectedEvent(ev)}
                >
                  <strong>{new Date(ev.start).toLocaleDateString('fr-TN', { weekday: 'short', day: 'numeric' })}</strong>
                  <div>{ev.title}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Appointment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Nouveau rendez-vous</h2>
            <form onSubmit={handleCreate}>
              {['doctor', 'super_admin'].includes(user?.role) && (
                <div className="form-group">
                  <label>Patient</label>
                  <select className="form-select" value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value})} required>
                    <option value="">Sélectionner...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                    ))}
                  </select>
                </div>
              )}
              {user?.role === 'patient' && (
                <div className="form-group">
                  <label>Médecin</label>
                  <select className="form-select" value={form.doctorId} onChange={e => setForm({...form, doctorId: e.target.value})} required>
                    <option value="">Sélectionner...</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name} - {d.specialization}</option>
                    ))}
                  </select>
                  <p className="text-sm text-muted mt-2">Le RDV sera en attente de confirmation par le médecin.</p>
                </div>
              )}
              <div className="form-group">
                <label>Titre</label>
                <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>

              {user?.role === 'patient' ? (
                <div className="form-group">
                  <label>Date souhaitée *</label>
                  <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                  <p className="text-sm text-muted mt-2">L'heure précise vous sera communiquée après confirmation.</p>
                </div>
              ) : (
                <div className="grid grid-2">
                  <div className="form-group">
                    <label>Début *</label>
                    <input type="datetime-local" className="form-input" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Fin *</label>
                    <input type="datetime-local" className="form-input" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} required />
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Détails du rendez-vous</h2>
            <p><strong>Patient:</strong> {selectedEvent.extendedProps?.patient_first_name} {selectedEvent.extendedProps?.patient_last_name}</p>
            <p><strong>Médecin:</strong> Dr. {selectedEvent.extendedProps?.doctor_first_name} {selectedEvent.extendedProps?.doctor_last_name}</p>
            <p><strong>Début:</strong> {new Date(selectedEvent.start).toLocaleString('fr-TN')}</p>
            <p><strong>Fin:</strong> {new Date(selectedEvent.end).toLocaleString('fr-TN')}</p>
            <p><strong>Statut:</strong> <span className={`badge badge-${selectedEvent.extendedProps?.status === 'confirmed' ? 'success' : selectedEvent.extendedProps?.status === 'cancelled' ? 'danger' : 'warning'}`}>
              {selectedEvent.extendedProps?.status === 'confirmed' ? '✅ Confirmé' : selectedEvent.extendedProps?.status === 'cancelled' ? '❌ Annulé' : '⏳ En attente'}
            </span></p>
            {selectedEvent.extendedProps?.notes && <p><strong>Notes:</strong> {selectedEvent.extendedProps.notes}</p>}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setSelectedEvent(null)}>Fermer</button>
              {['assistant', 'nurse', 'doctor', 'super_admin'].includes(user?.role) && selectedEvent.extendedProps?.status === 'pending' && (
                <>
                  <button className="btn btn-success" onClick={() => confirmAppointment(selectedEvent.id)}>✅ Confirmer</button>
                  <button className="btn btn-danger" onClick={() => handleDelete(selectedEvent.id)}>❌ Refuser</button>
                </>
              )}
              {['assistant', 'nurse', 'doctor', 'super_admin'].includes(user?.role) && selectedEvent.extendedProps?.status !== 'pending' && (
                <button className="btn btn-danger" onClick={() => handleDelete(selectedEvent.id)}>Annuler le RDV</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
