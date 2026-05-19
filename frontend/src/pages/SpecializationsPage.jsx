import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function SpecializationsPage() {
  const [specializations, setSpecializations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSpecializations();
  }, [page, limit, search]);

  async function fetchSpecializations() {
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.append('search', search);
      const res = await api.get(`/specializations?${params}`);
      setSpecializations(res.data.data);
      setTotal(res.data.total);
    } catch {}
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editItem) {
        await api.put(`/specializations/${editItem.id}`, form);
      } else {
        await api.post('/specializations', form);
      }
      setShowModal(false);
      setEditItem(null);
      setForm({ name: '', description: '' });
      fetchSpecializations();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  }

  function handleEdit(spec) {
    setEditItem(spec);
    setForm({ name: spec.name, description: spec.description || '' });
    setShowModal(true);
  }

  async function handleToggle(spec) {
    if (!confirm(` ${spec.is_active ? 'Désactiver' : 'Activer'} la spécialité "${spec.name}" ?`)) return;
    try {
      await api.patch(`/specializations/${spec.id}/toggle`);
      fetchSpecializations();
    } catch {}
  }

  async function handleDelete(spec) {
    if (!confirm(`Supprimer la spécialité "${spec.name}" ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/specializations/${spec.id}`);
      fetchSpecializations();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <h2> Spécialités</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" placeholder="Rechercher..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 200 }} />
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setForm({ name: '', description: '' }); setShowModal(true); }}>
            + Nouvelle spécialité
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Description</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {specializations.length === 0 && (
              <tr><td colSpan={4} className="text-center text-muted">Aucune spécialité</td></tr>
            )}
            {specializations.map(s => (
              <tr key={s.id}>
                <td><strong>{s.name}</strong></td>
                <td>{s.description || '-'}</td>
                <td>
                  <span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-outline" onClick={() => handleEdit(s)}>✏️</button>
                    <button className={`btn btn-sm ${s.is_active ? 'btn-warning' : 'btn-success'}`} onClick={() => handleToggle(s)}>
                      {s.is_active ? '🚫' : '✅'}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2>{editItem ? 'Modifier' : 'Nouvelle'} spécialité</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Modifier' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
