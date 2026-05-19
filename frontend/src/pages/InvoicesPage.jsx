import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [patients, setPatients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ patientId: '', items: [{ description: '', quantity: 1, unitPrice: 0 }] });
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    api.get('/doctors/patients').then(r => setPatients(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [page, limit]);

  async function fetchInvoices() {
    try {
      const res = await api.get(`/invoices?page=${page}&limit=${limit}`);
      setInvoices(res.data.data);
      setTotal(res.data.total);
    } catch {}
  }

  function addItem() {
    setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unitPrice: 0 }] });
  }

  function updateItem(i, field, value) {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      items[i].total = items[i].quantity * items[i].unitPrice;
    }
    setForm({ ...form, items });
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const items = form.items.map(item => ({
        ...item,
        total: item.quantity * item.unitPrice,
      }));
      await api.post('/invoices', { patientId: form.patientId, items });
      setShowModal(false);
      setForm({ patientId: '', items: [{ description: '', quantity: 1, unitPrice: 0 }] });
      fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <h2>💰 Factures</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nouvelle facture</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>N° Facture</th>
                <th>Patient</th>
                <th>Montant</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Date</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted">Aucune facture</td></tr>
              )}
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{inv.first_name} {inv.last_name}</td>
                  <td>{inv.amount} TND</td>
                  <td><strong>{inv.total} TND</strong></td>
                  <td><span className={`badge badge-${inv.status === 'paid' ? 'success' : inv.status === 'cancelled' ? 'danger' : 'warning'}`}>{inv.status}</span></td>
                  <td>{new Date(inv.created_at).toLocaleDateString('fr-TN')}</td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={async () => {
                      const res = await api.get(`/invoices/${inv.id}/pdf`);
                      window.open(`http://localhost:5000/${res.data.pdfPath}`, '_blank');
                    }}>📄</button>
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
            <h2>Nouvelle facture</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Patient</label>
                <select className="form-select" value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value})} required>
                  <option value="">Sélectionner...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                  ))}
                </select>
              </div>

              {form.items.map((item, i) => (
                <div key={i} className="grid grid-4" style={{ gap: 8, marginBottom: 8 }}>
                  <input className="form-input" placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} required />
                  <input type="number" className="form-input" placeholder="Qté" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} min={1} />
                  <input type="number" step="0.01" className="form-input" placeholder="P.U." value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} min={0} />
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                    <strong>{item.quantity * item.unitPrice} TND</strong>
                  </div>
                </div>
              ))}

              <button type="button" className="btn btn-sm btn-outline mt-2" onClick={addItem}>+ Ajouter une ligne</button>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer la facture</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
