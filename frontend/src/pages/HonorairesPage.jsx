import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function HonorairesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/fee-items').then(r => {
      setItems(Array.isArray(r.data) ? r.data : []);
    }).catch(() => {});
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setMessage('');
    try {
      if (editing) {
        await api.put(`/fee-items/${editing.id}`, form);
        setMessage('Honoraire modifié avec succès');
      } else {
        await api.post('/fee-items', form);
        setMessage('Honoraire ajouté avec succès');
      }
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', description: '', price: '', category: '' });
      const r = await api.get('/fee-items');
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch (err) {
      setMessage('Erreur: ' + (err.response?.data?.error || err.message));
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cet honoraire ?')) return;
    try {
      await api.delete(`/fee-items/${id}`);
      setItems(items.filter(i => i.id !== id));
      setMessage('Honoraire supprimé');
    } catch (err) {
      setMessage('Erreur: ' + (err.response?.data?.error || err.message));
    }
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ name: item.name, description: item.description || '', price: String(item.price), category: item.category || '' });
    setShowModal(true);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', description: '', price: '', category: '' });
    setShowModal(true);
  }

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

  return (
    <div>
      <div className="flex-between mb-4">
        <h2>💰 Honoraires</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Ajouter un acte</button>
      </div>

      {message && <div className={`alert ${message.includes('succès') ? 'alert-success' : 'alert-error'}`}>{message}</div>}

      {categories.length > 0 ? categories.map(cat => (
        <div key={cat} className="card mb-4">
          <h3 className="mb-3">{cat}</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Acte</th>
                  <th>Description</th>
                  <th>Prix (TND)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.filter(i => i.category === cat).map(item => (
                  <tr key={item.id}>
                    <td><strong>{item.name}</strong></td>
                    <td className="text-muted">{item.description || '-'}</td>
                    <td><strong>{Number(item.price).toFixed(2)}</strong></td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(item)} style={{ marginRight: 8 }}>Modifier</button>
                      <button className="btn btn-sm btn-outline" style={{ color: '#e53e3e' }} onClick={() => handleDelete(item.id)}>Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )) : (
        <div className="card">
          {items.length === 0 ? (
            <p className="text-muted">Aucun acte défini. Cliquez sur "Ajouter un acte" pour commencer.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Acte</th>
                    <th>Description</th>
                    <th>Prix (TND)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td><strong>{item.name}</strong></td>
                      <td className="text-muted">{item.description || '-'}</td>
                      <td><strong>{Number(item.price).toFixed(2)}</strong></td>
                      <td>
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(item)} style={{ marginRight: 8 }}>Modifier</button>
                        <button className="btn btn-sm btn-outline" style={{ color: '#e53e3e' }} onClick={() => handleDelete(item.id)}>Supprimer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Modifier l\'acte' : 'Nouvel acte'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Nom de l'acte *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-textarea" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Prix (TND) *</label>
                <input type="number" step="0.01" min="0" className="form-input" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Catégorie</label>
                <input className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="ex: Consultation, Chirurgie, Radio..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Modifier' : 'Ajouter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
