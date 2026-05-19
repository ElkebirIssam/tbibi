import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    fetchPayments();
  }, [page, limit]);

  async function fetchPayments() {
    try {
      const res = await api.get(`/admin/payments?page=${page}&limit=${limit}`);
      setPayments(res.data.data);
      setTotal(res.data.total);
    } catch {}
  }

  async function verifyPayment(id, userId) {
    try {
      await api.put(`/admin/payments/${id}/verify`);
      fetchPayments();
    } catch {}
  }

  return (
    <div>
      <h2 className="mb-4"> Vérification des paiements</h2>
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Montant</th>
                <th>Réf. Transaction</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted">Aucun paiement en attente</td></tr>
              )}
              {payments.map(p => (
                <tr key={p.id}>
                  <td>{p.first_name} {p.last_name}</td>
                  <td><span className="badge badge-info">{p.role}</span></td>
                  <td>{p.amount} TND</td>
                  <td>{p.transaction_ref || '-'}</td>
                  <td>
                    <span className={`badge ${p.is_verified ? 'badge-success' : 'badge-warning'}`}>
                      {p.is_verified ? 'Vérifié' : 'En attente'}
                    </span>
                  </td>
                  <td>{new Date(p.created_at).toLocaleDateString('fr-TN')}</td>
                  <td>
                    {!p.is_verified && (
                      <button className="btn btn-sm btn-success" onClick={() => verifyPayment(p.id, p.user_id)}>
                         Vérifier
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
      </div>
    </div>
  );
}
