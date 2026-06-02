import { useState, useEffect } from 'react';
import api from '../services/api';

export default function CaissePage() {
  const [todayInvoices, setTodayInvoices] = useState([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [unpaidTotal, setUnpaidTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await api.get('/invoices?limit=100');
      const allInvoices = res.data.data || [];

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayEnd = todayStart + 86400000;

      const todayPaid = allInvoices.filter(inv => {
        const d = new Date(inv.created_at).getTime();
        return d >= todayStart && d < todayEnd && inv.status === 'paid';
      });
      const unpaid = allInvoices.filter(inv => inv.status !== 'paid');

      setTodayInvoices(todayPaid);
      setUnpaidInvoices(unpaid);
      setTodayTotal(todayPaid.reduce((acc, inv) => acc + parseFloat(inv.total || 0), 0));
      setUnpaidTotal(unpaid.reduce((acc, inv) => acc + parseFloat(inv.total || 0), 0));
    } catch {}
    setLoading(false);
  }

  if (loading) return <div className="text-center text-muted mt-4">Chargement...</div>;

  return (
    <div>
      <div className="flex-between mb-4">
        <h2> Caisse</h2>
        <span className="text-sm text-muted">{new Date().toLocaleDateString('fr-TN')}</span>
      </div>

      <div className="grid grid-3 mb-4" style={{ gap: 16 }}>
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <div className="text-sm text-muted">Notes aujourd'hui</div>
          <div className="font-bold" style={{ fontSize: 28 }}>{todayInvoices.length}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <div className="text-sm text-muted">Total encaissé</div>
          <div className="font-bold" style={{ fontSize: 28, color: 'var(--success)' }}>
            {todayTotal.toFixed(2)} TND
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <div className="text-sm text-muted">Impayé (total)</div>
          <div className="font-bold" style={{ fontSize: 28, color: 'var(--danger)' }}>
            {unpaidTotal.toFixed(2)} TND
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <h3 className="mb-2">Notes du jour</h3>
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
              {todayInvoices.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted">Aucune note aujourd'hui</td></tr>
              )}
              {todayInvoices.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number || '-'}</td>
                  <td>{inv.first_name} {inv.last_name}</td>
                  <td>{inv.total} TND</td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: inv.status === 'paid' ? '#d1fae5' : inv.status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                      color: inv.status === 'paid' ? '#065f46' : inv.status === 'cancelled' ? '#991b1b' : '#92400e',
                    }}>
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

      <div className="card">
        <h3 className="mb-2">Notes impayées</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Patient</th>
                <th>Montant</th>
                <th>Date</th>
                <th>Date remb.</th>
              </tr>
            </thead>
            <tbody>
              {unpaidInvoices.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted">Aucune note impayée</td></tr>
              )}
              {unpaidInvoices.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number || '-'}</td>
                  <td>{inv.first_name} {inv.last_name}</td>
                  <td><strong>{inv.total} TND</strong></td>
                  <td>{new Date(inv.created_at).toLocaleDateString('fr-TN')}</td>
                  <td>
                    {inv.promised_payment_date
                      ? new Date(inv.promised_payment_date.split('T')[0] + 'T00:00:00').toLocaleDateString('fr-TN')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}