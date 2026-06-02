import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const totalDays = last.getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  return cells;
}

function AutocompleteField({ placeholder, value, onChange, options, optionLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(() => {
    if (!value) return options.slice(0, 20);
    const q = value.toLowerCase();
    return options.filter(o => (optionLabel(o) || '').toLowerCase().includes(q)).slice(0, 20);
  }, [options, value, optionLabel]);

  return (
    <div className="autocomplete" ref={ref}>
      <div className="autocomplete-input-wrap">
        <input
          type="text"
          className="form-input"
          placeholder={placeholder}
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        <span className="autocomplete-arrow" onClick={() => setOpen(!open)}>▼</span>
      </div>
      {open && filtered.length > 0 && (
        <div className="autocomplete-dropdown">
          {filtered.map((o, i) => (
            <div key={o.id || i} className="autocomplete-item" onClick={() => { onChange(optionLabel(o)); setOpen(false); }}>
              {optionLabel(o)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AppointmentBooking() {
  const [searchParams] = useSearchParams();
  const [previousDoctors, setPreviousDoctors] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [searchSpecialty, setSearchSpecialty] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchDelegation, setSearchDelegation] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState(searchParams.get('doctorId') || null);
  const [appointments, setAppointments] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookedFor, setBookedFor] = useState('');
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [villes, setVilles] = useState([]);
  const [delegations, setDelegations] = useState([]);

  useEffect(() => {
    api.get('/patients/my-profile').then(r => {
      const data = r.data;
      const seen = {};
      const prev = [];
      if (data.consultations) {
        data.consultations.forEach(c => {
          if (c.doctor_id && !seen[c.doctor_id]) {
            seen[c.doctor_id] = true;
            prev.push({
              id: c.doctor_id,
              first_name: c.doctor_first_name,
              last_name: c.doctor_last_name,
              specialization: c.specialization,
            });
          }
        });
      }
      if (data.appointments) {
        data.appointments.forEach(a => {
          if ((a.status === 'confirmed' || a.status === 'pending') && a.doctor_id && !seen[a.doctor_id]) {
            seen[a.doctor_id] = true;
            prev.push({
              id: a.doctor_id,
              first_name: a.doctor_first_name,
              last_name: a.doctor_last_name,
              specialization: a.specialization,
            });
          }
        });
      }
      setPreviousDoctors(prev);
    }).catch(() => {});

    api.get('/patients/doctors').then(r => {
      setDoctors(Array.isArray(r.data) ? r.data : r.data.data || []);
    }).catch(() => {});

    api.get('/specializations?all=true').then(r => {
      setSpecialties(r.data || []);
    }).catch(() => {});

    api.get('/locations/villes').then(r => {
      setVilles(r.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!searchCity) { setDelegations([]); return; }
    const ville = villes.find(v => v.nom.toLowerCase() === searchCity.toLowerCase());
    if (ville) {
      api.get(`/locations/delegations?villeId=${ville.id}`)
        .then(r => setDelegations(r.data || []))
        .catch(() => {});
    }
  }, [searchCity, villes]);

  const [myAppointments, setMyAppointments] = useState([]);

  useEffect(() => {
    if (!selectedDoctorId) return;
    const params = new URLSearchParams();
    params.set('doctorId', selectedDoctorId);
    api.get(`/appointments?${params}`)
      .then(r => setAppointments(r.data || []))
      .catch(() => {});
  }, [selectedDoctorId]);

  useEffect(() => {
    if (!selectedDoctorId) return;
    api.get('/appointments')
      .then(r => setMyAppointments(r.data || []))
      .catch(() => {});
  }, [selectedDoctorId]);

  const apptStatusByDate = useMemo(() => {
    const map = {};
    myAppointments.forEach(a => {
      const d = new Date(a.start_time || a.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map[key] = a.status || 'pending';
    });
    return map;
  }, [myAppointments]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter(d => {
      const matchName = !searchName || `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchName.toLowerCase());
      const matchSpecialty = !searchSpecialty || (d.specialization || '').toLowerCase().includes(searchSpecialty.toLowerCase());
      const matchCity = !searchCity || (d.city || '').toLowerCase().includes(searchCity.toLowerCase());
      const matchDelegation = !searchDelegation || (d.delegation || d.city || '').toLowerCase().includes(searchDelegation.toLowerCase());
      return matchName && matchSpecialty && matchCity && matchDelegation;
    });
  }, [doctors, searchName, searchSpecialty, searchCity, searchDelegation]);

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  const apptDates = useMemo(() => {
    const set = new Set();
    appointments.forEach(a => {
      const d = new Date(a.start_time || a.date);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return set;
  }, [appointments]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  useEffect(() => {
    if (selectedDate && selectedDoctorId) {
      setLoadingSlots(true);
      setSelectedSlot(null);
      api.get(`/appointments/slots?doctorId=${selectedDoctorId}&date=${selectedDate}`)
        .then(r => setAvailableSlots(r.data || []))
        .catch(() => setAvailableSlots([]))
        .finally(() => setLoadingSlots(false));
    } else {
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  }, [selectedDate, selectedDoctorId]);

  const bookAppointment = async () => {
    if (!selectedDoctorId || !selectedDate || !selectedSlot) return;
    try {
      const patientRes = await api.get('/patients/my-profile');
      await api.post('/appointments', {
        doctorId: selectedDoctorId,
        patientId: patientRes.data.patient.id,
        startTime: `${selectedDate}T${selectedSlot.start}:00`,
        endTime: `${selectedDate}T${selectedSlot.end}:00`,
        title: 'Consultation',
        bookedFor: bookedFor || undefined,
      });
      setShowForm(false);
      setSelectedDate(null);
      setSelectedSlot(null);
      setBookedFor('');
      setAvailableSlots([]);
      const params = new URLSearchParams();
      params.set('doctorId', selectedDoctorId);
      const r = await api.get(`/appointments?${params}`);
      setAppointments(r.data || []);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la reservation');
    }
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <h2 style={{ marginBottom: 20, fontSize: 22 }}>📅 Prendre un rendez-vous</h2>
      <div className="split-layout">
        {/* Left: Doctor selection (60%) */}
        <div className="split-left">
          <button className="btn btn-primary" style={{ width: '100%', marginBottom: 20, padding: '12px 16px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => setShowSearchPopup(true)}>
            <span style={{ fontSize: 18 }}>🔍</span> Rechercher un médecin
          </button>

          {previousDoctors.length > 0 && (
            <>
              <h4 className="section-title" style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Mes médecins</h4>
              <div className="doctor-scroll">
                {previousDoctors.map(d => (
                  <div
                    key={d.id}
                    className={`doctor-card ${selectedDoctorId === d.id ? 'selected' : ''}`}
                    onClick={() => { setSelectedDoctorId(d.id); setShowForm(false); setSelectedDate(null); }}
                    style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', border: selectedDoctorId === d.id ? '1.5px solid var(--primary)' : '1px solid transparent', background: selectedDoctorId === d.id ? '#ebf8ff' : 'transparent', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 12 }}
                    onMouseEnter={e => { if (selectedDoctorId !== d.id) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; } }}
                    onMouseLeave={e => { if (selectedDoctorId !== d.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: selectedDoctorId === d.id ? 'var(--primary)' : '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {d.first_name?.[0]}{d.last_name?.[0]}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: 14 }}>Dr. {d.first_name} {d.last_name}</strong>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{d.specialization || 'Médecin généraliste'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {previousDoctors.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: 40 }}>
              <div>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🩺</div>
                <p>Recherchez un médecin pour prendre un rendez-vous</p>
              </div>
            </div>
          )}

          {showSearchPopup && (
            <div className="modal-overlay" onClick={() => setShowSearchPopup(false)}>
              <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, padding: '24px 28px', borderRadius: 16 }}>
                <div className="flex-between" style={{ marginBottom: 20 }}>
                  <h2 style={{ margin: 0, fontSize: 20 }}>🔍 Rechercher un médecin</h2>
                  <button className="btn btn-sm btn-outline" onClick={() => setShowSearchPopup(false)} style={{ width: 34, height: 34, borderRadius: '50%', padding: 0, fontSize: 16, lineHeight: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }}>👤</span>
                    <input type="text" className="form-input" placeholder="Nom du médecin..." value={searchName} onChange={e => setSearchName(e.target.value)} style={{ paddingLeft: 36 }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <AutocompleteField placeholder="Spécialité..." value={searchSpecialty} onChange={setSearchSpecialty} options={specialties} optionLabel={o => o.name} />
                    <AutocompleteField placeholder="Ville..." value={searchCity} onChange={setSearchCity} options={villes} optionLabel={o => o.nom} />
                  </div>
                </div>
                <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filteredDoctors.length === 0 && (searchName || searchSpecialty || searchCity) && (
                    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                      <p style={{ margin: 0 }}>Aucun médecin trouvé</p>
                    </div>
                  )}
                  {filteredDoctors.length === 0 && !searchName && !searchSpecialty && !searchCity && (
                    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🩺</div>
                      <p style={{ margin: 0 }}>Saisissez un nom, une spécialité ou une ville</p>
                    </div>
                  )}
                  {filteredDoctors.map(d => (
                    <div
                      key={d.id}
                      onClick={() => { setSelectedDoctorId(d.id); setShowForm(false); setSelectedDate(null); setShowSearchPopup(false); }}
                      style={{ padding: '14px 16px', borderRadius: 12, cursor: 'pointer', border: '1px solid #e2e8f0', background: '#fff', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 14 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = '#f0f4ff'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(43,108,176,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg, #2b6cb0, #4299e1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                        {d.first_name?.[0]}{d.last_name?.[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 15, display: 'block' }}>Dr. {d.first_name} {d.last_name}</strong>
                        <span style={{ fontSize: 13, color: '#64748b' }}>{d.specialization || 'Médecin généraliste'}</span>
                        {d.city && <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>📍 {d.city}</span>}
                      </div>
                      <span style={{ fontSize: 18, color: '#cbd5e0' }}>→</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Calendar (40%) */}
        <div className="split-right">
          {!selectedDoctor ? (
            <div className="empty-state">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <p style={{ fontSize: 15, color: '#94a3b8' }}>Sélectionnez un médecin pour voir ses disponibilités</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-between mb-4">
                <h3>Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</h3>
                <span className="badge badge-info">{selectedDoctor.specialization || 'Généraliste'}</span>
              </div>

            <div className="flex-between mb-3">
              <button className="btn btn-outline btn-sm" onClick={prevMonth}>&lt;</button>
              <strong>{MONTHS[month]} {year}</strong>
              <button className="btn btn-outline btn-sm" onClick={nextMonth}>&gt;</button>
            </div>

            <div className="calendar-grid">
              {DAYS.map(d => <div key={d} className="cal-header">{d}</div>)}
              {grid.map((day, i) => {
                if (day === null) return <div key={`e${i}`} className="cal-cell empty" />;
                const dateStr = `${year}-${month + 1 < 10 ? '0' : ''}${month + 1}-${day < 10 ? '0' : ''}${day}`;
                const hasAppt = apptDates.has(`${year}-${month}-${day}`);
                const myStatus = apptStatusByDate[`${year}-${month}-${day}`];
                const today = new Date();
                const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                let cellClass = 'cal-cell';
                if (myStatus === 'confirmed') cellClass += ' my-confirmed';
                else if (myStatus === 'pending') cellClass += ' my-pending';
                else if (myStatus === 'cancelled') cellClass += ' my-cancelled';
                if (isToday) cellClass += ' today';
                if (isPast) cellClass += ' past';
                else cellClass += ' clickable';
                if (selectedDate === dateStr) cellClass += ' selected';
                return (
                  <div
                    key={day}
                    className={cellClass}
                    onClick={() => {
                      if (isPast) return;
                      setSelectedDate(dateStr);
                      setShowForm(true);
                    }}
                  >
                    <span className="cal-day-num">{day}</span>
                    {myStatus && <div className={`cal-dot status-${myStatus}`} />}
                    {!myStatus && hasAppt && <div className="cal-dot cal-dot-other" />}
                  </div>
                );
              })}
            </div>

            {showForm && selectedDate && (
              <div className="card mt-4">
                <h4>Confirmer le rendez-vous</h4>
                <p><strong>Medecin:</strong> Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</p>
                <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>

                {myAppointments.filter(a => {
                  const d = new Date(a.start_time || a.date);
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  return key === selectedDate;
                }).length > 0 ? (
                  <div className="card" style={{ background: '#f8fafc', marginBottom: 12 }}>
                    <p className="text-sm"><strong>Mon rendez-vous sur cette date :</strong></p>
                    {myAppointments.filter(a => {
                      const d = new Date(a.start_time || a.date);
                      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      return key === selectedDate;
                    }).map(a => (
                      <div key={a.id} className="flex-between" style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0' }}>
                        <div>
                          <strong>{new Date(a.start_time).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })} - {new Date(a.end_time).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}</strong>
                          <span className={`badge badge-${a.status === 'confirmed' ? 'success' : a.status === 'cancelled' ? 'danger' : 'warning'}`} style={{ marginLeft: 8 }}>
                            {a.status === 'confirmed' ? 'Confirmé' : a.status === 'cancelled' ? 'Annulé' : 'En attente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : loadingSlots ? (
                  <p className="text-sm text-muted">Chargement des creneaux...</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-muted">Aucun creneau disponible pour cette date.</p>
                ) : (
                  <>
                    <p className="text-sm text-muted mb-2">Choisissez un creneau :</p>
                    <div className="slot-grid">
                      {availableSlots.filter(s => s.status === 'available').map((slot, i) => {
                        const now = new Date();
                        const slotEnd = new Date(`${selectedDate}T${slot.end}:00`);
                        const isPastSlot = selectedDate === now.toISOString().slice(0, 10) && slotEnd <= now;
                        return (
                          <div
                            key={i}
                            className={`slot-btn ${isPastSlot ? 'taken' : selectedSlot === slot ? 'selected' : ''}`}
                            onClick={() => !isPastSlot && setSelectedSlot(slot)}
                            style={isPastSlot ? { opacity: 0.35, cursor: 'not-allowed', background: '#f1f5f9' } : {}}
                          >
                            {slot.start} - {slot.end}
                            {isPastSlot && <span style={{ fontSize: 10, marginLeft: 4, color: '#94a3b8' }}>(passé)</span>}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {selectedSlot && (
                  <>
                    <div className="form-group" style={{ marginTop: 12 }}>
                      <label>Pour le compte de (optionnel)</label>
                      <input
                        className="form-input"
                        placeholder="Ex: Ma mère, Mon enfant..."
                        value={bookedFor}
                        onChange={e => setBookedFor(e.target.value)}
                      />
                      <p className="text-sm text-muted mt-1">Indiquez si ce rendez-vous est pour une autre personne.</p>
                    </div>
                    <p className="text-sm text-muted">Le RDV sera soumis au medecin pour confirmation. Vous recevrez une notification.</p>
                    <div className="modal-actions" style={{ marginTop: 12 }}>
                      <button className="btn btn-outline" onClick={() => { setShowForm(false); setSelectedDate(null); setSelectedSlot(null); setBookedFor(''); }}>Annuler</button>
                      <button className="btn btn-primary" onClick={bookAppointment}>Confirmer la reservation</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>

    <style>{`
        .split-layout {
          display: flex; gap: 24px; height: calc(100vh - 140px);
        }
        .split-left {
          width: 60%; flex-shrink: 0; display: flex; flex-direction: column;
        }
        .split-right {
          width: 40%; flex-shrink: 0; overflow-y: auto;
        }
        .section-title {
          font-size: 13px; font-weight: 600; color: #4a5568; text-transform: uppercase;
          letter-spacing: 0.5px; margin-bottom: 10px; margin-top: 0;
        }
        .divider {
          border: none; border-top: 1px solid #e2e8f0; margin: 12px 0;
        }
        .doctor-scroll {
          flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;
          margin-bottom: 12px;
        }
        .doctor-card {
          display: flex; align-items: center; gap: 12px; padding: 10px 12px;
          border-radius: 8px; cursor: pointer; transition: background 0.15s; border: 1px solid transparent;
        }
        .doctor-card:hover { background: #f7fafc; border-color: #e2e8f0; }
        .doctor-card.selected { background: #ebf8ff; border-color: #2b6cb0; }
        .search-fields {
          display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;
        }
        .search-fields .form-input { font-size: 13px; padding: 8px 10px; }
        .doctor-avatar {
          width: 40px; height: 40px; border-radius: 50%; background: #2b6cb0; color: white;
          display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0;
        }
        .doctor-info { display: flex; flex-direction: column; overflow: hidden; }
        .doctor-info strong { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .empty-state {
          display: flex; align-items: center; justify-content: center; height: 100%;
          color: #a0aec0; font-size: 15px;
        }
        .calendar-grid {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
        }
        .cal-header {
          text-align: center; font-weight: 600; font-size: 12px; color: #64748b;
          padding: 8px 0; border-bottom: 1px solid #e2e8f0;
        }
        .cal-cell {
          aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
          border-radius: 8px; font-size: 14px; position: relative; min-height: 50px;
        }
        .cal-cell.empty { background: transparent; }
        .cal-cell.past { color: #cbd5e0; cursor: default; }
        .cal-cell.clickable { cursor: pointer; color: #2d3748; }
        .cal-cell.clickable:hover { background: #ebf8ff; }
        .cal-cell.today { background: #bee3f8; font-weight: 700; }
        .cal-cell.selected { background: #2b6cb0; color: white; font-weight: 700; }
        .cal-cell.my-confirmed { background: #fef2f2; }
        .cal-cell.my-pending { background: #fffbeb; }
        .cal-cell.my-cancelled { background: #f1f5f9; }
        .cal-cell.my-confirmed:hover { background: #fee2e2; }
        .cal-cell.my-pending:hover { background: #fef3c7; }
        .cal-day-num { line-height: 1; }
        .cal-dot {
          width: 6px; height: 6px; border-radius: 50%; margin-top: 4px; position: absolute; bottom: 6px;
        }
        .cal-dot.status-pending { background: #f59e0b; }
        .cal-dot.status-confirmed { background: #ef4444; }
        .cal-dot.status-cancelled { background: #94a3b8; }
        .cal-dot-other { background: #94a3b8; opacity: 0.4; }
        .autocomplete { position: relative; }
        .autocomplete-input-wrap {
          display: flex; position: relative;
        }
        .autocomplete-input-wrap .form-input {
          padding-right: 28px;
        }
        .autocomplete-arrow {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          font-size: 10px; color: #a0aec0; cursor: pointer; pointer-events: auto;
          line-height: 1;
        }
        .autocomplete-arrow:hover { color: #4a5568; }
        .autocomplete-dropdown {
          position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
          background: white; border: 1px solid #e2e8f0; border-top: none;
          border-radius: 0 0 8px 8px; max-height: 200px; overflow-y: auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .autocomplete-item {
          padding: 8px 10px; cursor: pointer; font-size: 13px; color: #2d3748;
        }
        .autocomplete-item:hover { background: #ebf8ff; }
        .slot-grid { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
        .slot-btn {
          padding: 8px 14px; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer;
          font-size: 13px; color: #2d3748; background: white; transition: all 0.15s;
        }
        .slot-btn:hover { border-color: #2b6cb0; background: #ebf8ff; }
        .slot-btn.selected { border-color: #2b6cb0; background: #2b6cb0; color: white; font-weight: 600; }
        .slot-btn.taken { border-color: #fca5a5; background: #fef2f2; color: #dc2626; cursor: not-allowed; opacity: 0.7; }
        .slot-btn.taken:hover { border-color: #fca5a5; background: #fef2f2; }
        .slot-btn.pending { border-color: #fcd34d; background: #fffbeb; color: #d97706; cursor: not-allowed; opacity: 0.7; }
        .slot-btn.pending:hover { border-color: #fcd34d; background: #fffbeb; }
      `}</style>
    </div>
  );
}
