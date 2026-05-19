import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function PatientsPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({});
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    if (search.length > 1) {
      api.get(`/patients/search?q=${search}&page=${page}&limit=${limit}`).then(r => {
        setPatients(r.data.data);
        setTotal(r.data.total);
      }).catch(() => {});
    } else {
      setPatients([]);
      setTotal(0);
    }
  }, [search, page, limit]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.post('/patients', form);
      setShowModal(false);
      setForm({});
      setSearch('');
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <h2>👥 Patients</h2>
          {['assistant', 'nurse', 'doctor', 'super_admin'].includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nouveau patient</button>
        )}
      </div>

      <div className="card">
        <div className="form-group">
          <input
            className="form-input"
            placeholder="Rechercher un patient (nom, email, téléphone...)"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 && (
                <tr><td colSpan={4} className="text-center text-muted">Aucun patient trouvé</td></tr>
              )}
              {patients.map(p => (
                <tr key={p.id}>
                  <td>{p.first_name} {p.last_name}</td>
                  <td>{p.email}</td>
                  <td>{p.phone}</td>
                  <td>
                    <Link to={`/patients/${p.id}`} className="btn btn-sm btn-outline">Dossier</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Nouveau patient</h2>
            <form onSubmit={handleCreate}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Prénom</label>
                  <input className="form-input" value={form.firstName || ''} onChange={e => setForm({...form, firstName: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Nom</label>
                  <input className="form-input" value={form.lastName || ''} onChange={e => setForm({...form, lastName: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-input" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input className="form-input" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Mot de passe</label>
                <input type="password" className="form-input" value={form.password || ''} onChange={e => setForm({...form, password: e.target.value})} required minLength={6} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
