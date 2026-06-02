import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [splitModal, setSplitModal] = useState(null);
  const [splitAmount, setSplitAmount] = useState('');
  const [splitDesc, setSplitDesc] = useState('');
  const [splitDate, setSplitDate] = useState('');

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

  async function handleMarkPaid(inv) {
    try {
      await api.put(`/invoices/${inv.id}/status`, { status: 'paid' });
      fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  }

  async function handleSplit(inv) {
    const amount = parseFloat(splitAmount);
    if (!amount || amount <= 0 || amount >= parseFloat(inv.total)) {
      alert('Le montant doit être supérieur à 0 et inférieur au total de la note d\'honoraires.');
      return;
    }
    try {
      await api.post(`/invoices/${inv.id}/split`, { amount, description: splitDesc || 'Division note d\'honoraires', promisedPaymentDate: splitDate || null });
      setSplitModal(null);
      setSplitAmount('');
      setSplitDesc('');
      setSplitDate('');
      fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  }

  function formatDate(dateStr) {
    if (!dateStr || dateStr === 'null') return '-';
    const d = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    return new Date(d + 'T00:00:00').toLocaleDateString('fr-TN');
  }

  const showActions = invoices.some(inv => inv.status !== 'paid');
  const colCount = showActions ? 7 : 6;
  return (
    <div>
      <div className="flex-between mb-4">
        <h2>💰 Notes d'honoraires</h2>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>N° Note</th>
                <th>Patient</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Date remb.</th>
                {showActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr><td colSpan={colCount} className="text-center text-muted">Aucune note d'honoraires</td></tr>
              )}
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{inv.first_name} {inv.last_name}</td>
                  <td><strong>{inv.total} TND</strong></td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      background: inv.status === 'paid' ? '#d1fae5' : inv.status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                      color: inv.status === 'paid' ? '#065f46' : inv.status === 'cancelled' ? '#991b1b' : '#92400e',
                    }}>
                      {inv.status === 'paid' ? 'Payée' : inv.status === 'cancelled' ? 'Annulée' : 'Impayée'}
                    </span>
                  </td>
                  <td>{new Date(inv.created_at).toLocaleDateString('fr-TN')}</td>
                  <td>{formatDate(inv.status === 'paid' ? inv.paid_at : inv.promised_payment_date)}</td>
                  {showActions && (
                    <td>
                      {inv.status !== 'paid' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-success" onClick={() => handleMarkPaid(inv)}>
                            ✓ Confirmer
                          </button>
                          <button className="btn btn-sm btn-outline" onClick={() => {
                            setSplitModal(inv);
                            setSplitAmount('');
                            setSplitDesc('');
                            setSplitDate('');
                          }}>
                            Split
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
      </div>

      {splitModal && (
        <div className="modal-overlay" onClick={() => setSplitModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3>Diviser la note d'honoraires</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Note: <strong>{splitModal.invoice_number}</strong> — Total: <strong>{splitModal.total} TND</strong>
            </p>
            <div className="form-group">
              <label>Montant à soustraire</label>
              <input type="number" step="0.01" className="form-input" value={splitAmount} onChange={e => setSplitAmount(e.target.value)} placeholder="Montant" min="0.01" />
            </div>
            <div className="form-group">
              <label>Date de remboursement annoncée</label>
              <input type="date" className="form-input" value={splitDate} onChange={e => setSplitDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Motif (optionnel)</label>
              <input className="form-input" value={splitDesc} onChange={e => setSplitDesc(e.target.value)} placeholder="Ex: Consultation séparée" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setSplitModal(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={() => handleSplit(splitModal)}>Diviser</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}