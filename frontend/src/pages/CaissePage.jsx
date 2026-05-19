import { useState, useEffect } from 'react';
import api from '../services/api';

export default function CaissePage() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayInvoices();
  }, []);

  async function fetchTodayInvoices() {
    try {
      const res = await api.get('/invoices');
      const allInvoices = res.data.data || [];
      const today = new Date().toISOString().split('T')[0];
      const todayInvoices = allInvoices.filter(inv =>
        new Date(inv.created_at).toISOString().split('T')[0] === today
      );
      setInvoices(todayInvoices);
      const sum = todayInvoices.reduce((acc, inv) => acc + parseFloat(inv.total || 0), 0);
      setTotal(sum);
    } catch {}
    setLoading(false);
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <h2> Caisse du jour</h2>
        <span className="text-sm text-muted">{new Date().toLocaleDateString('fr-TN')}</span>
      </div>

      <div className="grid grid-3 mb-4" style={{ gap: 16 }}>
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <div className="text-sm text-muted">Factures aujourd'hui</div>
          <div className="font-bold" style={{ fontSize: 28 }}>{invoices.length}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <div className="text-sm text-muted">Total encaissé</div>
          <div className="font-bold" style={{ fontSize: 28, color: 'var(--success)' }}>{total.toFixed(2)} TND</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <div className="text-sm text-muted">Factures impayées</div>
          <div className="font-bold" style={{ fontSize: 28, color: 'var(--danger)' }}>
            {invoices.filter(i => i.status !== 'paid').length}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-2">Factures du jour</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Patient</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Heure</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center text-muted">Chargement...</td></tr>}
              {!loading && invoices.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted">Aucune facture aujourd'hui</td></tr>
              )}
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number || '-'}</td>
                  <td>{inv.first_name} {inv.last_name}</td>
                  <td>{inv.total} TND</td>
                  <td>
                    <span className={`badge ${inv.status === 'paid' ? 'badge-success' : inv.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                      {inv.status === 'paid' ? 'Payée' : inv.status === 'cancelled' ? 'Annulée' : 'Impayée'}
                    </span>
                  </td>
                  <td>{new Date(inv.created_at).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
