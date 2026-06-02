import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ProfilePage() {
  const { user, fetchProfile } = useAuth();
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneSent, setPhoneSent] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage('');
  }, []);

  async function handleSendPhoneCode() {
    setPhoneSent(false);
    setPhoneVerifying(false);
    setPhoneCode('');
    setMessage('');
    try {
      await api.post('/auth/send-phone-code');
      setPhoneSent(true);
      setMessage('Code de vérification envoyé par WhatsApp.');
    } catch (err) {
      setMessage('Erreur: ' + (err.response?.data?.error || err.message));
    }
  }

  async function handleVerifyPhone() {
    if (!phoneCode) return;
    setMessage('');
    try {
      await api.post('/auth/verify-phone', { code: phoneCode });
      setPhoneVerifying(true);
      await fetchProfile();
      setMessage('Téléphone vérifié avec succès.');
    } catch (err) {
      setMessage('Erreur: ' + (err.response?.data?.error || err.message));
    }
  }

  async function handleVerifyEmail() {
    setEmailSending(true);
    setEmailSent(false);
    setMessage('');
    try {
      await api.post('/auth/send-email-verification');
      setEmailSent(true);
      setMessage('Email de vérification envoyé. Vérifiez votre boîte de réception.');
    } catch (err) {
      setMessage('Erreur: ' + (err.response?.data?.error || err.message));
    } finally {
      setEmailSending(false);
    }
  }

  return (
    <div>
      <h2 className="mb-4">⚙️ Mon profil</h2>

      <div className="card">
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 15, marginBottom: 4 }}><strong>{user?.firstName} {user?.lastName}</strong> <span className="badge badge-info">{user?.role}</span></p>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>{user?.email}</p>
        </div>

        {message && <div className={`alert ${message.includes('succès') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>{message}</div>}

        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 15 }}>📱 Vérification téléphone</h4>
          {user?.phoneVerified ? (
            <p><span className="badge badge-success">Téléphone vérifié</span></p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {user?.phone ? (
                <>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Téléphone: {user.phone}</span>
                  <button className="btn btn-outline" onClick={handleSendPhoneCode} style={{ fontSize: 13, padding: '6px 14px' }}>
                    {phoneSent ? 'Renvoyer le code' : 'Vérifier'}
                  </button>
                  {phoneSent && (
                    <>
                      <input className="form-input" style={{ width: 110, fontSize: 13, padding: '6px 10px' }} placeholder="Code à 6 chiffres" value={phoneCode} onChange={e => setPhoneCode(e.target.value)} />
                      <button className="btn btn-primary" style={{ fontSize: 13, padding: '6px 14px' }} onClick={handleVerifyPhone}>
                        Confirmer
                      </button>
                    </>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Aucun numéro de téléphone enregistré.</p>
              )}
            </div>
          )}
        </div>

        <div>
          <h4 style={{ margin: '0 0 12px', fontSize: 15 }}>✉️ Vérification email</h4>
          {user?.isVerified ? (
            <p><span className="badge badge-success">Email vérifié</span></p>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 8px' }}>Votre adresse email n'est pas encore vérifiée.</p>
              <button className="btn btn-outline" onClick={handleVerifyEmail} disabled={emailSending} style={{ fontSize: 13, padding: '6px 14px' }}>
                {emailSending ? 'Envoi en cours...' : emailSent ? 'Email envoyé ✓' : 'Vérifier mon email'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}