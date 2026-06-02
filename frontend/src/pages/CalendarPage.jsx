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
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({ patientId: '', doctorId: '', startTime: '', endTime: '', title: '', notes: '', confirmDirect: false });
  const [patients, setPatients] = useState([]);
  const [patientResults, setPatientResults] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [feeItems, setFeeItems] = useState([]);

  // Calendar state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);
  const [monthAppts, setMonthAppts] = useState([]);
  const [dayViewAppts, setDayViewAppts] = useState([]);
  const [daySlots, setDaySlots] = useState([]);
  const [selectedDayAppt, setSelectedDayAppt] = useState(null);

  function fmtDate(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  function monthBounds(m) {
    const y = m.getFullYear(), mo = m.getMonth();
    const last = new Date(y, mo + 1, 0).getDate();
    return { start: fmtDate(y, mo, 1), end: fmtDate(y, mo, last), year: y, month: mo, lastDay: last };
  }
  const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  async function fetchMonthAppts() {
    const { start, end } = monthBounds(currentMonth);
    try {
      const res = await api.get(`/appointments?startDate=${start}&endDate=${end}`);
      setMonthAppts(Array.isArray(res.data) ? res.data : []);
    } catch { setMonthAppts([]); }
  }
  useEffect(() => { fetchMonthAppts(); }, [currentMonth]);

  function generateSlots(avail, appts) {
    const slots = [];
    const matched = new Set();
    for (const a of avail) {
      const startMin = timeToMin(a.start_time);
      const endMin = timeToMin(a.end_time);
      const dur = a.slot_duration || 30;
      for (let m = startMin; m + dur <= endMin; m += dur) {
        const s = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        const e = `${String(Math.floor((m + dur) / 60)).padStart(2, '0')}:${String((m + dur) % 60).padStart(2, '0')}`;
        const appt = appts.find(ap => {
          const ah = new Date(ap.start_time);
          const apMin = ah.getHours() * 60 + ah.getMinutes();
          return apMin >= m && apMin < m + dur;
        });
        if (appt) matched.add(appt.id);
        slots.push({ start: s, end: e, appt });
      }
    }
    // Add appointments that fall outside availability
    for (const ap of appts) {
      if (!matched.has(ap.id)) {
        const s = new Date(ap.start_time);
        const e = new Date(ap.end_time);
        const fmt = d => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        slots.push({ start: fmt(s), end: fmt(e), appt: ap });
      }
    }
    return slots.sort((a, b) => a.start.localeCompare(b.start));
  }
  function timeToMin(t) {
    const [h, m] = String(t).split(':').map(Number);
    return h * 60 + m;
  }

  async function openDayView(dateStr) {
    setSelectedDate(dateStr);
    setSelectedDayAppt(null);
    setDaySlots([]);
    try {
      const [apptRes, availRes] = await Promise.all([
        api.get(`/appointments?startDate=${dateStr}&endDate=${dateStr}`),
        api.get('/availability/my'),
      ]);
      const appts = Array.isArray(apptRes.data) ? apptRes.data : [];
      setDayViewAppts(appts);
      const avail = Array.isArray(availRes.data) ? availRes.data : [];
      const dow = new Date(dateStr + 'T12:00:00').getDay();
      const dayAvail = avail.filter(v => v.day_of_week === dow);
      if (dayAvail.length > 0) {
        setDaySlots(generateSlots(dayAvail, appts));
      } else if (appts.length > 0) {
        // Fallback: show appointments even without availability config
        const fallbackSlots = appts.map(ap => {
          const s = new Date(ap.start_time);
          const e = new Date(ap.end_time);
          const fmt = d => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          return { start: fmt(s), end: fmt(e), appt: ap };
        }).sort((a, b) => a.start.localeCompare(b.start));
        setDaySlots(fallbackSlots);
      } else {
        setDaySlots([]);
      }
    } catch { setDaySlots([]); setDayViewAppts([]); }
  }

  function dayApptCounts(dateStr) {
    const day = monthAppts.filter(a => {
      const d = new Date(a.start_time).toISOString().slice(0, 10);
      return d === dateStr;
    });
    return {
      confirmed: day.filter(a => a.status === 'confirmed').length,
      pending: day.filter(a => a.status === 'pending').length,
    };
  }

  // Quick RDV state
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [quickPatient, setQuickPatient] = useState(null);
  const [quickDate, setQuickDate] = useState('');
  const [quickStart, setQuickStart] = useState('');
  const [quickEnd, setQuickEnd] = useState('');
  const [quickTitle, setQuickTitle] = useState('Consultation');
  const [pickerSearch, setPickerSearch] = useState('');

  useEffect(() => {
    fetchAppointments();
    if (['assistant', 'nurse', 'doctor'].includes(user?.role)) {
      api.get('/patients/search?q=').catch(() => {});
      api.get('/doctors/patients').then(r => setPatients(r.data)).catch(() => {});
    }
    if (user?.role === 'doctor') {
      api.get('/fee-items').then(r => setFeeItems(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }
    if (user?.role === 'patient') {
      api.get('/patients/doctors').then(r => setDoctors(r.data)).catch(() => {});
    }
  }, [user]);

  async function fetchAppointments() {
    await fetchMonthAppts();
    if (selectedDate) {
      try {
        const [apptRes, availRes] = await Promise.all([
          api.get(`/appointments?startDate=${selectedDate}&endDate=${selectedDate}`),
          api.get('/availability/my'),
        ]);
        const appts = Array.isArray(apptRes.data) ? apptRes.data : [];
        setDayViewAppts(appts);
        const avail = Array.isArray(availRes.data) ? availRes.data : [];
        const dow = new Date(selectedDate + 'T12:00:00').getDay();
        const dayAvail = avail.filter(v => v.day_of_week === dow);
        if (dayAvail.length > 0) {
          setDaySlots(generateSlots(dayAvail, appts));
        } else if (appts.length > 0) {
          const fallbackSlots = appts.map(ap => {
            const s = new Date(ap.start_time);
            const e = new Date(ap.end_time);
            const fmt = d => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            return { start: fmt(s), end: fmt(e), appt: ap };
          }).sort((a, b) => a.start.localeCompare(b.start));
          setDaySlots(fallbackSlots);
        } else {
          setDaySlots([]);
        }
      } catch { setDaySlots([]); setDayViewAppts([]); }
    }
  }

  async function handleCreate(e, confirmed = false) {
    e.preventDefault();
    try {
      const payload = {
        patientId: form.patientId,
        doctorId: form.doctorId,
        startTime: form.startTime,
        endTime: form.endTime,
        title: form.title,
        notes: form.notes,
        status: confirmed ? 'confirmed' : undefined,
      };
      // If patient booked with just a date, convert to full datetime
      if (user?.role === 'patient' && form.date) {
        const patientRes = await api.get('/patients/my-profile');
        payload.patientId = patientRes.data.patient.id;
        payload.startTime = `${form.date}T08:00:00`;
        payload.endTime = `${form.date}T17:00:00`;
      }
      await api.post('/appointments', payload);
      setShowModal(false);
      setForm({ patientId: '', doctorId: '', startTime: '', endTime: '', title: '', notes: '', date: '', confirmDirect: false, searchCode: '' });
      setPatientResults([]);
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  }

  function handleOpenPicker() {
    setPickerSearch('');
    setShowPatientPicker(true);
  }

  function handleSelectPatient(patient) {
    setQuickPatient(patient);
    setShowPatientPicker(false);
  }

  function handleCancelQuick() {
    setQuickPatient(null);
    setQuickDate('');
    setQuickStart('');
    setQuickEnd('');
    setQuickTitle('Consultation');
  }

  async function handleQuickCreate() {
    if (!quickPatient || !quickDate || !quickStart || !quickEnd) {
      return alert('Veuillez remplir tous les champs.');
    }
    try {
      await api.post('/appointments', {
        patientId: quickPatient.id,
        title: quickTitle,
        startTime: `${quickDate}T${quickStart}:00`,
        endTime: `${quickDate}T${quickEnd}:00`,
        status: 'confirmed',
      });
      setQuickPatient(null);
      setQuickDate('');
      setQuickStart('');
      setQuickEnd('');
      setQuickTitle('Consultation');
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Annuler ce rendez-vous ?')) return;
    try {
      await api.delete(`/appointments/${id}`);
      await fetchAppointments();
    } catch {}
  }

  async function confirmAppointment(id) {
    try {
      await api.put(`/appointments/${id}/confirm`);
      await fetchAppointments();
    } catch {}
  }
  async function rejectAppointment(id) {
    const reason = prompt('Motif du refus (optionnel) :');
    try {
      await api.put(`/appointments/${id}/reject`, { reason });
      await fetchAppointments();
    } catch {}
  }

  return (
    <div>
      {['doctor'].includes(user?.role) && (
        <div className="card mb-4">
          <h4 style={{ marginBottom: 12 }}>⏳ Demandes en attente</h4>
          {monthAppts.filter(a => a.status === 'pending').length === 0 ? (
            <p className="text-sm text-muted">Aucune demande en attente.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {monthAppts.filter(a => a.status === 'pending').slice(0, 10).map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
                  <div>
                    <strong>{a.patient_first_name} {a.patient_last_name}</strong>
                    <span className="text-sm text-muted" style={{ marginLeft: 8 }}>
                      {new Date(a.start_time).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })} à {new Date(a.start_time).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-success" onClick={() => confirmAppointment(a.id)}>✅</button>
                    <button className="btn btn-sm btn-danger" onClick={() => rejectAppointment(a.id)}>❌</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {['doctor'].includes(user?.role) && (
        <div className="card mb-4">
          <div className="flex-between">
            <div>
              <h4 style={{ marginBottom: 4 }}>⚡ Ajouter un RDV confirmé</h4>
              <p className="text-sm text-muted">Créez un rendez-vous directement confirmé pour un patient.</p>
            </div>
            {!quickPatient && (
              <button className="btn btn-primary" onClick={handleOpenPicker}>
                🔍 Choisir un patient
              </button>
            )}
          </div>
          {quickPatient && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 12 }}>
              <div className="form-group" style={{ flex: '0 0 250px' }}>
                <label>Patient</label>
                <div className="form-input" style={{ background: '#f0fdf4', border: '1px solid #86efac', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>✅ {quickPatient.first_name} {quickPatient.last_name}
                    <code style={{ marginLeft: 8, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{quickPatient.patient_code}</code>
                  </span>
                  <button className="btn btn-sm btn-outline" onClick={handleCancelQuick} style={{ padding: '2px 6px' }}>✕</button>
                </div>
              </div>
              <div className="form-group" style={{ flex: '0 0 140px' }}>
                <label>Date</label>
                <input type="date" className="form-input" value={quickDate} onChange={e => setQuickDate(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: '0 0 110px' }}>
                <label>Début</label>
                <input type="time" className="form-input" value={quickStart} onChange={e => setQuickStart(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: '0 0 110px' }}>
                <label>Fin</label>
                <input type="time" className="form-input" value={quickEnd} onChange={e => setQuickEnd(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: '0 0 200px' }}>
                <label>Acte</label>
                <select className="form-select" value={quickTitle} onChange={e => setQuickTitle(e.target.value)}>
                  <option value="Consultation">Consultation</option>
                  {feeItems.map(f => (
                    <option key={f.id} value={f.name}>{f.name} ({f.price} DT)</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-success" onClick={handleQuickCreate}
                style={{ height: 38, alignSelf: 'flex-end' }}>
                + Ajouter & Confirmer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Patient Picker Modal */}
      {showPatientPicker && (
        <div className="modal-overlay" onClick={() => setShowPatientPicker(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h2>Sélectionner un patient</h2>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <input className="form-input" placeholder="Rechercher par nom, code ou CIN..."
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              {patients
                .filter(p => {
                  if (!pickerSearch) return true;
                  const q = pickerSearch.toLowerCase();
                  return (p.first_name + ' ' + p.last_name).toLowerCase().includes(q)
                    || (p.patient_code || '').toLowerCase().includes(q)
                    || (p.national_id || '').toLowerCase().includes(q);
                })
                .map(p => (
                  <div key={p.id} className="clickable-row"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', borderRadius: 6 }}
                    onClick={() => handleSelectPatient(p)}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <strong>{p.first_name} {p.last_name}</strong>
                      <span className="text-sm text-muted" style={{ marginLeft: 8 }}>{p.phone || ''}</span>
                    </div>
                    <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{p.patient_code}</code>
                  </div>
                ))}
              {patients.length === 0 && (
                <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>Aucun patient lié à votre cabinet.</p>
              )}
            </div>
            <div className="modal-actions" style={{ marginTop: 12 }}>
              <button className="btn btn-outline" onClick={() => setShowPatientPicker(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Month / Day Calendar */}
      {!selectedDate ? (
        <>
          <div className="flex-between mb-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>◀</button>
              <h2 style={{ margin: 0, minWidth: 220, textAlign: 'center' }}>{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h2>
              <button className="btn btn-outline" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>▶</button>
              <button className="btn btn-outline btn-sm" onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Aujourd'hui</button>
            </div>
            {['assistant', 'nurse', 'doctor', 'super_admin', 'patient'].includes(user?.role) && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nouveau RDV</button>
            )}
          </div>

          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontWeight: 600, fontSize: 12, padding: '8px 4px', color: '#64748b' }}>{d}</div>
              ))}
              {(() => {
                const { year, month, lastDay } = monthBounds(currentMonth);
                const firstDow = new Date(year, month, 1).getDay();
                const cells = [];
                for (let i = 0; i < firstDow; i++) cells.push(<div key={`pad-${i}`} />);
                for (let d = 1; d <= lastDay; d++) {
                  const dateStr = fmtDate(year, month, d);
                  const counts = dayApptCounts(dateStr);
                  const isToday = dateStr === fmtDate(today.getFullYear(), today.getMonth(), today.getDate());
                  cells.push(
                    <div key={d} onClick={() => openDayView(dateStr)}
                      style={{
                        minHeight: 80, padding: 6, cursor: 'pointer', borderRadius: 6,
                        border: isToday ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                        background: isToday ? '#eff6ff' : '#fff',
                        display: 'flex', flexDirection: 'column', gap: 2,
                      }}>
                      <span style={{ fontWeight: isToday ? 700 : 500, fontSize: 13, color: isToday ? '#2563eb' : '#1e293b' }}>{d}</span>
                      {counts.confirmed > 0 && (
                        <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 4, display: 'inline-block', alignSelf: 'flex-start' }}>
                          ✅ {counts.confirmed}
                        </span>
                      )}
                      {counts.pending > 0 && (
                        <span style={{ fontSize: 11, background: '#fef9c3', color: '#854d0e', padding: '1px 6px', borderRadius: 4, display: 'inline-block', alignSelf: 'flex-start' }}>
                          ⏳ {counts.pending}
                        </span>
                      )}
                    </div>
                  );
                }
                return cells;
              })()}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex-between mb-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setSelectedDate(null)}>◀ Retour au mois</button>
              <h2 style={{ margin: 0 }}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h2>
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nouveau RDV</button>
          </div>

          <div className="card">
            {daySlots.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>
                Aucun rendez-vous ni disponibilité pour ce jour.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {daySlots.map(s => {
                  const isPast = `${selectedDate}T${s.start}:00` < today.toISOString().slice(0, 16);
                  return (
                    <div key={s.start}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                        borderRadius: 6,
                        background: s.appt
                          ? (isPast ? '#fef9c3' : s.appt.status === 'confirmed' ? '#f0fdf4' : '#fefce8')
                          : (isPast ? '#f8fafc' : '#ffffff'),
                        border: s.appt
                          ? (isPast ? '1px solid #fde68a' : s.appt.status === 'confirmed' ? '1px solid #86efac' : '1px solid #fde68a')
                          : '1px solid #e2e8f0',
                        cursor: s.appt ? 'pointer' : 'default',
                        opacity: isPast && !s.appt ? 0.5 : 1,
                      }}
                      onClick={() => s.appt && setSelectedDayAppt(s.appt)}
                    >
                      <div style={{ minWidth: 60, fontWeight: 600, fontSize: 13, color: '#475569' }}>
                        {s.start} - {s.end}
                      </div>
                      {s.appt ? (
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span className={`badge badge-${s.appt.status === 'confirmed' ? 'success' : 'warning'}`} style={{ marginRight: 8 }}>
                              {s.appt.status === 'confirmed' ? '✅ Confirmé' : '⏳ En attente'}
                            </span>
                            {s.appt.has_consultation && (
                              <span style={{ fontSize: 11, color: '#6b7280', marginRight: 8 }}>✓ Acte fait</span>
                            )}
                            <strong>{s.appt.patient_first_name} {s.appt.patient_last_name}</strong>
                            <code style={{ marginLeft: 8, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{s.appt.patient_code}</code>
                            <span className="text-sm text-muted" style={{ marginLeft: 8 }}>• {s.appt.title || 'Consultation'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted" style={{ flex: 1 }}>Disponible</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Day Appointment Detail Modal */}
          {selectedDayAppt && (
            <div className="modal-overlay" onClick={() => setSelectedDayAppt(null)}>
              <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                <div style={{
                  background: selectedDayAppt.status === 'confirmed' ? '#dcfce7' : '#fef9c3',
                  borderBottom: selectedDayAppt.status === 'confirmed' ? '2px solid #86efac' : '2px solid #fde68a',
                  margin: '-20px -20px 16px -20px', padding: '14px 20px', borderRadius: '12px 12px 0 0',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 16 }}>
                      {selectedDayAppt.status === 'confirmed' ? '✅ Rendez-vous confirmé' : '⏳ Rendez-vous en attente'}
                    </h2>
                    <span style={{
                      background: selectedDayAppt.status === 'confirmed' ? '#166534' : '#854d0e',
                      color: '#fff', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    }}>
                      {selectedDayAppt.patient_code}
                    </span>
                  </div>
                </div>
                <p><strong>Patient:</strong> {selectedDayAppt.patient_first_name} {selectedDayAppt.patient_last_name}</p>
                <p><strong>Acte:</strong> {selectedDayAppt.title || 'Consultation'}</p>
                <p><strong>Début:</strong> {new Date(selectedDayAppt.start_time).toLocaleString('fr-TN')}</p>
                <p><strong>Fin:</strong> {new Date(selectedDayAppt.end_time).toLocaleString('fr-TN')}</p>
                {selectedDayAppt.notes && <p><strong>Notes:</strong> {selectedDayAppt.notes}</p>}
                {selectedDayAppt.has_consultation && (
                  <p style={{ color: '#6b7280', fontStyle: 'italic', fontSize: 13 }}>✓ L'acte a déjà été effectué — aucune modification possible.</p>
                )}
                <div className="modal-actions">
                  <button className="btn btn-outline" onClick={() => setSelectedDayAppt(null)}>Fermer</button>
                  {!selectedDayAppt.has_consultation && ['assistant', 'nurse', 'doctor', 'super_admin'].includes(user?.role) && selectedDayAppt.status === 'pending' && (
                    <>
                      <button className="btn btn-success" onClick={async () => { await confirmAppointment(selectedDayAppt.id); setSelectedDayAppt(null); }}>✅ Confirmer</button>
                      <button className="btn btn-danger" onClick={async () => { await rejectAppointment(selectedDayAppt.id); setSelectedDayAppt(null); }}>❌ Refuser</button>
                    </>
                  )}
                  {!selectedDayAppt.has_consultation && (selectedDayAppt.status === 'confirmed' || selectedDayAppt.status === 'pending') && (
                    <button className="btn btn-danger" onClick={async () => { await handleDelete(selectedDayAppt.id); setSelectedDayAppt(null); }}>Annuler le RDV</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* New Appointment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Nouveau rendez-vous</h2>
            <form onSubmit={e => handleCreate(e, form.confirmDirect)}>
              {['doctor', 'super_admin'].includes(user?.role) && (
                <>
                  <div className="form-group">
                    <label>Rechercher un patient par code</label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input className="form-input" placeholder="TB-00001"
                        value={form.searchCode || ''}
                        onChange={async e => {
                          const v = e.target.value;
                          setForm({...form, searchCode: v});
                          if (v.length >= 3) {
                            try {
                              const res = await api.get(`/patients/search?q=${encodeURIComponent(v)}&limit=5`);
                              setPatientResults(res.data.data || []);
                            } catch {}
                          } else {
                            setPatientResults([]);
                          }
                        }}
                      />
                    </div>
                    {patientResults.length > 0 && (
                      <div style={{ marginTop: 4, border: '1px solid #e2e8f0', borderRadius: 6, maxHeight: 150, overflowY: 'auto' }}>
                        {patientResults.map(p => (
                          <div key={p.id} style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onClick={() => setForm({...form, patientId: p.id, searchCode: `${p.first_name} ${p.last_name} (${p.patient_code})`, searchCodeId: p.id})}>
                            <span>{p.first_name} {p.last_name}</span>
                            <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{p.patient_code}</code>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Ou sélectionner dans la liste</label>
                    <select className="form-select" value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value, searchCode: '', searchCodeId: null})}>
                      <option value="">Sélectionner...</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                      ))}
                    </select>
                  </div>
                </>
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
              {['doctor', 'super_admin'].includes(user?.role) ? (
                <div className="form-group">
                  <label>Acte</label>
                  <select className="form-select" value={form.title} onChange={e => setForm({...form, title: e.target.value})}>
                    <option value="Consultation">Consultation</option>
                    {feeItems.map(f => (
                      <option key={f.id} value={f.name}>{f.name} ({f.price} DT)</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label>Titre</label>
                  <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                </div>
              )}

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
              {['doctor', 'super_admin'].includes(user?.role) && (
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.confirmDirect}
                      onChange={e => setForm({...form, confirmDirect: e.target.checked})}
                    />
                    ✅ Confirmer directement ce rendez-vous
                  </label>
                  <p className="text-sm text-muted" style={{ marginLeft: 24 }}>Le patient sera notifié immédiatement.</p>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">{form.confirmDirect ? 'Créer & Confirmer' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
