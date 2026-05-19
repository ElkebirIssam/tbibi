import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [page, limit, search]);

  async function fetchUsers() {
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.append('search', search);
      const res = await api.get(`/admin/users?${params}`);
      setUsers(res.data.data);
      setTotal(res.data.total);
    } catch {}
  }

  async function toggleActive(id) {
    try {
      await api.put(`/admin/users/${id}/toggle-active`);
      fetchUsers();
    } catch {}
  }

  async function deleteUser(id) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch {}
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <h2> Gestion des utilisateurs</h2>
        <input className="form-input" placeholder="Rechercher..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 200 }} />
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
                <th>Compte</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.first_name} {u.last_name}</td>
                  <td>{u.email}</td>
                  <td><span className="badge badge-info">{u.role}</span></td>
                  <td>
                    <span className={`badge ${u.is_verified ? 'badge-success' : 'badge-warning'}`}>
                      {u.is_verified ? ' Confirmé' : ' En attente'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {u.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString('fr-TN')}</td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => toggleActive(u.id)}>
                      {u.is_active ? 'Désactiver' : 'Activer'}
                    </button>
                    <button className="btn btn-sm btn-danger" style={{ marginLeft: 4 }} onClick={() => deleteUser(u.id)}>
                      Supprimer
                    </button>
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
