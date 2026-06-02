import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function FindDoctorPage() {
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [filters, setFilters] = useState({ name: '', specialization: '', city: '' });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    searchDoctors();
    api.get('/specializations?all=true').then(r => setSpecializations(r.data)).catch(() => {});
  }, [page, limit]);

  async function searchDoctors() {
    try {
      const params = new URLSearchParams();
      if (filters.name) params.append('name', filters.name);
      if (filters.specialization) params.append('specialization', filters.specialization);
      if (filters.city) params.append('city', filters.city);
      params.append('page', page);
      params.append('limit', limit);
      const res = await api.get(`/patients/doctors?${params}`);
      setDoctors(res.data.data);
      setTotal(res.data.total);
    } catch {}
  }

  function handleFilterChange(e) {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  }

  function handleSearch() {
    setPage(1);
    searchDoctors();
  }

  return (
    <div>
      <h2 className="mb-4">🔍 Trouver un médecin</h2>

      <div className="card">
        <div className="grid grid-3" style={{ gap: 12 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Nom du médecin</label>
            <input name="name" className="form-input" placeholder="Rechercher..." value={filters.name} onChange={handleFilterChange} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Spécialité</label>
            <select name="specialization" className="form-select" value={filters.specialization} onChange={handleFilterChange}>
              <option value="">Toutes</option>
              {specializations.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Ville</label>
            <input name="city" className="form-input" placeholder="Ville..." value={filters.city} onChange={handleFilterChange} />
          </div>
        </div>
        <button className="btn btn-primary mt-2" onClick={handleSearch}>Rechercher</button>
      </div>

      <div className="grid" style={{ marginTop: 20 }}>
        {doctors.length === 0 && (
          <div className="card text-center text-muted">Aucun médecin trouvé</div>
        )}
        {doctors.map(d => (
          <div key={d.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>Dr. {d.first_name} {d.last_name}</h3>
              <p className="text-sm text-muted" style={{ margin: '4px 0' }}>
                {d.specialization || 'Généraliste'}
                {d.city && ` • ${d.city}`}
              </p>
              {d.cabinet_address && <p className="text-sm text-muted" style={{ margin: '2px 0' }}>📍 {d.cabinet_address}</p>}
              {d.consultation_fee && <p className="text-sm" style={{ margin: '2px 0', fontWeight: 600 }}>{d.consultation_fee} TND / consultation</p>}
            </div>
            <a href={`/calendar?doctorId=${d.id}`} className="btn btn-outline btn-sm">Voir disponibilités</a>
          </div>
        ))}
      </div>

      <Pagination total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
    </div>
  );
}
