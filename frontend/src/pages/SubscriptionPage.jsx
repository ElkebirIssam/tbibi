import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    api.get('/auth/profile').then(r => {
      if (r.data.profile) setPayment(r.data.profile);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <h2 className="mb-4"> Mon abonnement</h2>

      <div className="card" style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: 20 }}>
          <p><strong>Plan :</strong> <span className="badge badge-info">Professionnel</span></p>
          <p><strong>Statut :</strong>
            <span className={`badge ${user?.isActive ? 'badge-success' : 'badge-warning'}`} style={{ marginLeft: 8 }}>
              {user?.isActive ? '✅ Actif' : '⏳ En attente'}
            </span>
          </p>
          <p><strong>Email :</strong> {user?.email}</p>
        </div>

        {!user?.isActive && (
          <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <p className="text-sm">Votre compte n'est pas encore activé. Veuillez effectuer le paiement pour activer votre abonnement.</p>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <h4>Détails de l'abonnement</h4>
          <div className="grid grid-2" style={{ gap: 12, marginTop: 12 }}>
            <div>
              <p className="text-sm text-muted">Durée</p>
              <p className="font-bold">Mensuel</p>
            </div>
            <div>
              <p className="text-sm text-muted">Montant</p>
              <p className="font-bold">50 TND / mois</p>
            </div>
            <div>
              <p className="text-sm text-muted">Prochain renouvellement</p>
              <p className="font-bold">{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-TN')}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Fonctionnalités</p>
              <p className="text-sm">Gestion des patients, RDV, facturation, messagerie</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
