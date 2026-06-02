import { useState, useEffect } from 'react';
import api from '../services/api';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/availability/my').then(r => {
      const dbSlots = r.data || [];
      const grouped = {};
      DAYS.forEach((_, i) => { grouped[i] = []; });
      dbSlots.forEach(s => {
        grouped[s.day_of_week] = grouped[s.day_of_week] || [];
        grouped[s.day_of_week].push(s);
      });
      const slots = [];
      Object.entries(grouped).forEach(([day, items]) => {
        if (items.length === 0) {
          slots.push({ dayOfWeek: parseInt(day), startTime: '08:00', endTime: '12:00', slotDuration: 30 });
          slots.push({ dayOfWeek: parseInt(day), startTime: '14:00', endTime: '17:00', slotDuration: 30 });
        } else {
          items.forEach(i => {
            slots.push({ dayOfWeek: i.day_of_week, startTime: i.start_time.slice(0, 5), endTime: i.end_time.slice(0, 5), slotDuration: i.slot_duration || 30 });
          });
        }
      });
      setAvailability(slots);
    }).catch(() => {
      const slots = [];
      DAYS.forEach((_, i) => {
        slots.push({ dayOfWeek: i, startTime: '08:00', endTime: '12:00', slotDuration: 30 });
        slots.push({ dayOfWeek: i, startTime: '14:00', endTime: '17:00', slotDuration: 30 });
      });
      setAvailability(slots);
    });
  }, []);

  function updateSlot(index, field, value) {
    setAvailability(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addSlot(dayOfWeek) {
    setAvailability(prev => [...prev, { dayOfWeek, startTime: '09:00', endTime: '12:00', slotDuration: 30 }]);
  }

  function removeSlot(index) {
    setAvailability(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/availability/my', { slots: availability });
      alert('Disponibilités enregistrées !');
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  const groupedByDay = {};
  DAYS.forEach((_, i) => { groupedByDay[i] = []; });
  availability.forEach((s, i) => {
    groupedByDay[s.dayOfWeek] = groupedByDay[s.dayOfWeek] || [];
    groupedByDay[s.dayOfWeek].push({ ...s, index: i });
  });

  return (
    <div>
      <div className="flex-between mb-4">
        <h2>Mes disponibilités</h2>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <p className="text-sm text-muted mb-4">
        Définissez vos créneaux de travail pour chaque jour de la semaine.
        Les patients pourront voir les créneaux disponibles et demander un rendez-vous.
      </p>

      {DAYS.map((dayName, dayIdx) => {
        const slots = groupedByDay[dayIdx] || [];
        return (
          <div key={dayIdx} className="card mb-3">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h4 style={{ margin: 0 }}>{dayName}</h4>
              <button className="btn btn-sm btn-outline" onClick={() => addSlot(dayIdx)}>+ Ajouter</button>
            </div>
            {slots.length === 0 ? (
              <p className="text-sm text-muted">Aucun créneau</p>
            ) : (
              slots.map(slot => (
                <div key={slot.index} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <input
                    type="time"
                    className="form-input"
                    style={{ width: 140 }}
                    value={slot.startTime}
                    onChange={e => updateSlot(slot.index, 'startTime', e.target.value)}
                  />
                  <span>à</span>
                  <input
                    type="time"
                    className="form-input"
                    style={{ width: 140 }}
                    value={slot.endTime}
                    onChange={e => updateSlot(slot.index, 'endTime', e.target.value)}
                  />
                  <span className="text-sm text-muted" style={{ marginLeft: 4 }}>Durée :</span>
                  <select
                    className="form-select"
                    style={{ width: 100 }}
                    value={slot.slotDuration}
                    onChange={e => updateSlot(slot.index, 'slotDuration', parseInt(e.target.value))}
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                  </select>
                  <button className="btn btn-sm btn-danger" onClick={() => removeSlot(slot.index)}>✕</button>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
