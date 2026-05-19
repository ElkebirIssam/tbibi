import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const code = searchParams.get('code');
    const email = searchParams.get('email');

    if (!code || !email) {
      setStatus('invalid');
      return;
    }

    api.get(`/auth/verify-email?code=${code}&email=${email}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [searchParams]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {status === 'loading' && <h1>⏳ Vérification en cours...</h1>}
        {status === 'success' && (
          <>
            <h1>✅ Email confirmé !</h1>
            <p>Votre adresse email a été vérifiée avec succès.</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: 16 }}>
              Se connecter
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1>❌ Échec de la vérification</h1>
            <p>Le lien de vérification est invalide ou a expiré.</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: 16 }}>
              Retour à la connexion
            </Link>
          </>
        )}
        {status === 'invalid' && (
          <>
            <h1>❌ Lien invalide</h1>
            <p>Aucun code de vérification fourni.</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: 16 }}>
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
