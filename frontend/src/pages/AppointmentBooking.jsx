import { useState, useEffect, useMemo, useRef } from 'react';
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
  const [previousDoctors, setPreviousDoctors] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [searchSpecialty, setSearchSpecialty] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchDelegation, setSearchDelegation] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [villes, setVilles] = useState([]);
  const [delegations, setDelegations] = useState([]);

  useEffect(() => {
    api.get('/patients/my-profile').then(r => {
      const data = r.data;
      if (data.consultations) {
        const seen = {};
        const prev = [];
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
        setPreviousDoctors(prev);
      }
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

  useEffect(() => {
    if (!selectedDoctorId) return;
    const params = new URLSearchParams();
    params.set('doctorId', selectedDoctorId);
    api.get(`/appointments?${params}`)
      .then(r => setAppointments(r.data || []))
      .catch(() => {});
  }, [selectedDoctorId]);

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

  const bookAppointment = async () => {
    if (!selectedDoctorId || !selectedDate) return;
    try {
      const patientRes = await api.get('/patients/my-profile');
      await api.post('/appointments', {
        doctorId: selectedDoctorId,
        patientId: patientRes.data.patient.id,
        startTime: `${selectedDate}T08:00:00`,
        endTime: `${selectedDate}T17:00:00`,
        title: 'Consultation',
      });
      setShowForm(false);
      setSelectedDate(null);
      const params = new URLSearchParams();
      params.set('doctorId', selectedDoctorId);
      const r = await api.get(`/appointments?${params}`);
      setAppointments(r.data || []);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la reservation');
    }
  };

  return (
    <div className="split-layout">
      {/* Left: Doctor selection (60%) */}
      <div className="split-left">
        {previousDoctors.length > 0 && (
          <>
            <h4 className="section-title">Mes medecins</h4>
            <div className="doctor-scroll">
              {previousDoctors.map(d => (
                <div
                  key={d.id}
                  className={`doctor-card ${selectedDoctorId === d.id ? 'selected' : ''}`}
                  onClick={() => { setSelectedDoctorId(d.id); setShowForm(false); setSelectedDate(null); }}
                >
                  <div className="doctor-avatar">
                    {d.first_name?.[0]}{d.last_name?.[0]}
                  </div>
                  <div className="doctor-info">
                    <strong>Dr. {d.first_name} {d.last_name}</strong>
                    <span className="text-sm text-muted">{d.specialization || 'Medecin generaliste'}</span>
                  </div>
                </div>
              ))}
            </div>
            <hr className="divider" />
          </>
        )}

        <h4 className="section-title">Rechercher un medecin</h4>
        <div className="search-fields">
          <input
            type="text"
            className="form-input"
            placeholder="Nom..."
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
          />
          <AutocompleteField
            placeholder="Specialite..."
            value={searchSpecialty}
            onChange={setSearchSpecialty}
            options={specialties}
            optionLabel={o => o.name}
          />
          <AutocompleteField
            placeholder="Ville..."
            value={searchCity}
            onChange={setSearchCity}
            options={villes}
            optionLabel={o => o.nom}
          />
          <AutocompleteField
            placeholder="Delegation..."
            value={searchDelegation}
            onChange={setSearchDelegation}
            options={delegations}
            optionLabel={o => o.nom}
          />
        </div>

        <div className="doctor-scroll">
          {filteredDoctors.length === 0 && (searchName || searchSpecialty || searchCity) && (
            <div className="text-muted text-sm" style={{ padding: 16, textAlign: 'center' }}>Aucun medecin trouve</div>
          )}
          {filteredDoctors.length === 0 && !searchName && !searchSpecialty && !searchCity && (
            <div className="text-muted text-sm" style={{ padding: 16, textAlign: 'center' }}>Saisissez un nom, specialite ou ville</div>
          )}
          {filteredDoctors.map(d => (
            <div
              key={d.id}
              className={`doctor-card ${selectedDoctorId === d.id ? 'selected' : ''}`}
              onClick={() => { setSelectedDoctorId(d.id); setShowForm(false); setSelectedDate(null); }}
            >
              <div className="doctor-avatar">
                {d.first_name?.[0]}{d.last_name?.[0]}
              </div>
              <div className="doctor-info">
                <strong>Dr. {d.first_name} {d.last_name}</strong>
                <span className="text-sm text-muted">{d.specialization || 'Medecin generaliste'}</span>
                {d.city && <span className="text-sm text-muted">{d.city}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Calendar (40%) */}
      <div className="split-right">
        {!selectedDoctor ? (
          <div className="empty-state">
            <p>Selectionnez un medecin pour voir ses disponibilites</p>
          </div>
        ) : (
          <>
            <div className="flex-between mb-4">
              <h3>Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</h3>
              <span className="badge badge-info">{selectedDoctor.specialization || 'Generaliste'}</span>
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
                const dateStr = `${year}-${month}-${day}`;
                const hasAppt = apptDates.has(dateStr);
                const today = new Date();
                const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                return (
                  <div
                    key={day}
                    className={`cal-cell ${isToday ? 'today' : ''} ${isPast ? 'past' : 'clickable'} ${selectedDate === dateStr ? 'selected' : ''}`}
                    onClick={() => {
                      if (isPast) return;
                      setSelectedDate(`${year}-${month + 1 < 10 ? '0' : ''}${month + 1}-${day < 10 ? '0' : ''}${day}`);
                      setShowForm(true);
                    }}
                  >
                    <span className="cal-day-num">{day}</span>
                    {hasAppt && <div className="cal-dot" />}
                  </div>
                );
              })}
            </div>

            {showForm && selectedDate && (
              <div className="card mt-4">
                <h4>Confirmer le rendez-vous</h4>
                <p><strong>Medecin:</strong> Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</p>
                <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="text-sm text-muted">Le RDV sera soumis au medecin pour confirmation. Vous recevrez une notification.</p>
                <div className="modal-actions" style={{ marginTop: 12 }}>
                  <button className="btn btn-outline" onClick={() => { setShowForm(false); setSelectedDate(null); }}>Annuler</button>
                  <button className="btn btn-primary" onClick={bookAppointment}>Confirmer la reservation</button>
                </div>
              </div>
            )}
          </>
        )}
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
        .cal-day-num { line-height: 1; }
        .cal-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #48bb78; margin-top: 4px; position: absolute; bottom: 6px;
        }
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
      `}</style>
    </div>
  );
}
