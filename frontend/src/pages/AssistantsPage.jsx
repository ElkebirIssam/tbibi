import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AssistantsPage() {
  const [assistants, setAssistants] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ role: 'assistant' });

  useEffect(() => {
    fetchAssistants();
  }, []);

  async function fetchAssistants() {
    try {
      const res = await api.get('/doctors/assistants');
      setAssistants(res.data);
    } catch {}
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await api.post('/doctors/assistants', form);
      setShowModal(false);
      setForm({ role: 'assistant' });
      fetchAssistants();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  }

  async function handleRemove(id) {
    if (!confirm('Supprimer cet assistant ?')) return;
    try {
      await api.delete(`/doctors/assistants/${id}`);
      fetchAssistants();
    } catch {}
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <h2>👥 Mes assistants / infirmiers</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Ajouter</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Email vérifié</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assistants.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted">Aucun assistant</td></tr>
              )}
                  {assistants.map(a => (
                    <tr key={a.id}>
                      <td>{a.first_name} {a.last_name}</td>
                      <td>{a.email}</td>
                      <td><span className="badge badge-info">{a.role === 'nurse' ? 'Infirmier' : 'Assistant'}</span></td>
                      <td>
                        <span className={`badge ${a.is_verified ? 'badge-success' : 'badge-warning'}`}>
                          {a.is_verified ? '✅' : '⏳'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${a.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {a.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-danger" onClick={() => handleRemove(a.id)}>
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h2>Ajouter un assistant</h2>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Rôle</label>
                <select name="role" className="form-select" value={form.role} onChange={handleChange}>
                  <option value="assistant">Assistant</option>
                  <option value="nurse">Infirmier</option>
                </select>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Prénom</label>
                  <input name="firstName" className="form-input" value={form.firstName || ''} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Nom</label>
                  <input name="lastName" className="form-input" value={form.lastName || ''} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" className="form-input" value={form.email || ''} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input name="phone" className="form-input" value={form.phone || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Mot de passe</label>
                <input type="password" name="password" className="form-input" value={form.password || ''} onChange={handleChange} required minLength={6} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
