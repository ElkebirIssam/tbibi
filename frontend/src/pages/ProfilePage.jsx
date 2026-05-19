import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  async function handleUpdate(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await api.put('/auth/profile', {
        phone: form.get('phone'),
        address: form.get('address'),
      });
      alert('Profil mis à jour');
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message));
    }
  }

  return (
    <div>
      <h2 className="mb-4">⚙️ Mon profil</h2>

      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Rôle:</strong> <span className="badge badge-info">{user?.role}</span></p>
        </div>

        <form onSubmit={handleUpdate}>
          <div className="grid grid-2">
            <div className="form-group">
              <label>Prénom</label>
              <input className="form-input" value={user?.firstName || ''} disabled />
            </div>
            <div className="form-group">
              <label>Nom</label>
              <input className="form-input" value={user?.lastName || ''} disabled />
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input name="phone" className="form-input" defaultValue={user?.phone || ''} />
            </div>
            <div className="form-group">
              <label>Adresse</label>
              <input name="address" className="form-input" defaultValue={user?.address || ''} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary mt-4">Mettre à jour</button>
        </form>
      </div>
    </div>
  );
}
