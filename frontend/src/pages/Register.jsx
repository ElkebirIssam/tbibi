import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Register() {
  const [role, setRole] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verifyLink, setVerifyLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [specializations, setSpecializations] = useState([]);

  useEffect(() => {
    if (role === 'doctor') {
      api.get('/specializations?all=true').then(r => setSpecializations(r.data)).catch(() => {});
    }
  }, [role]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, role };
      const res = await api.post('/auth/register', payload);
      const { verificationCode, email } = res.data;
      setSuccess('Inscription réussie !');
      if (verificationCode) {
        setVerifyLink(`/verify-email?code=${verificationCode}&email=${form.email}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  }

  const roles = [
    { id: 'patient', label: 'Patient', icon: '👤', desc: 'Accédez à votre dossier médical et prenez rendez-vous' },
    { id: 'doctor', label: 'Médecin', icon: '🩺', desc: 'Gérez vos patients, consultations et documents' },
  ];

  if (!role) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 480 }}>
          <h1>🏥 Tbibi.tn</h1>
          <p style={{ marginBottom: 28 }}>Je suis...</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {roles.map(r => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '20px 24px',
                  border: '2px solid var(--border)',
                  borderRadius: 12,
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 16,
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = '#f0f4ff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; }}
              >
                <span style={{ fontSize: 32 }}>{r.icon}</span>
                <div>
                  <strong style={{ fontSize: 18, display: 'block' }}>{r.label}</strong>
                  <span style={{ fontSize: 13, color: 'var(--text-light)' }}>{r.desc}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="auth-link" style={{ marginTop: 24 }}>
            Déjà un compte ? <Link to="/login">Se connecter</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <div className="flex-between" style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: 20 }}>{role === 'patient' ? '👤 Inscription Patient' : '🩺 Inscription Médecin'}</h1>
          <button className="btn btn-sm btn-outline" onClick={() => { setRole(null); setForm({}); setError(''); setSuccess(''); }}>
            ← Changer
          </button>
        </div>
        <p style={{ marginBottom: 20 }}>Remplissez le formulaire ci-dessous</p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && (
          <div className="alert alert-success" style={{ lineHeight: 1.8 }}>
            <strong>{success}</strong>
            {verifyLink && (
              <div style={{ marginTop: 8 }}>
                <Link to={verifyLink} className="btn btn-sm btn-success" style={{ color: '#fff', textDecoration: 'none', marginTop: 8 }}>
                  ✅ Cliquez ici pour confirmer votre email
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-2">
            <div className="form-group">
              <label>Prénom *</label>
              <input name="firstName" className="form-input" value={form.firstName || ''} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Nom *</label>
              <input name="lastName" className="form-input" value={form.lastName || ''} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input type="email" name="email" className="form-input" value={form.email || ''} onChange={handleChange} required />
          </div>

          {role === 'patient' && (
            <>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Date de naissance *</label>
                  <input type="date" name="dateOfBirth" className="form-input" value={form.dateOfBirth || ''} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Lieu de naissance</label>
                  <input name="birthPlace" className="form-input" value={form.birthPlace || ''} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Sexe *</label>
                  <select name="gender" className="form-select" value={form.gender || ''} onChange={handleChange} required>
                    <option value="">Sélectionner...</option>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Groupe sanguin</label>
                  <select name="bloodGroup" className="form-select" value={form.bloodGroup || ''} onChange={handleChange}>
                    <option value="">--</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Ville</label>
                  <input name="city" className="form-input" value={form.city || ''} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Téléphone *</label>
                  <input name="phone" className="form-input" value={form.phone || ''} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Adresse</label>
                <textarea name="address" className="form-textarea" rows={2} value={form.address || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Maladies chroniques / Antécédents</label>
                <textarea name="chronicDiseases" className="form-textarea" rows={2} value={form.chronicDiseases || ''} onChange={handleChange} placeholder="Diabète, hypertension, asthme..." />
              </div>
              <div className="form-group">
                <label>Allergies</label>
                <textarea name="allergies" className="form-textarea" rows={2} value={form.allergies || ''} onChange={handleChange} placeholder="Médicaments, aliments, etc." />
              </div>
            </>
          )}

          {role === 'doctor' && (
            <>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Spécialité *</label>
                  <select name="specializationId" className="form-select" value={form.specializationId || ''} onChange={handleChange} required>
                    <option value="">Sélectionner...</option>
                    {specializations.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Numéro de licence *</label>
                  <input name="licenseNumber" className="form-input" value={form.licenseNumber || ''} onChange={handleChange} required />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Téléphone *</label>
                  <input name="phone" className="form-input" value={form.phone || ''} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Ville</label>
                  <input name="city" className="form-input" value={form.city || ''} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label>Adresse du cabinet *</label>
                <textarea name="cabinetAddress" className="form-textarea" rows={2} value={form.cabinetAddress || ''} onChange={handleChange} required />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Mot de passe *</label>
            <input type="password" name="password" className="form-input" value={form.password || ''} onChange={handleChange} required minLength={6} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Inscription...' : "S'inscrire"}
          </button>
        </form>

        <div className="auth-link">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
