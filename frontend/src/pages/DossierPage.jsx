import { useState, useEffect } from 'react';
import api from '../services/api';

export default function DossierPage() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [detailConsultation, setDetailConsultation] = useState(null);
  const [assurances, setAssurances] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/patients/assurances/list').then(r => setAssurances(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/patients/my-profile').then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="loading-screen">Chargement...</div>;

  const { patient, consultations, appointments } = data;

  function startEdit() {
    setForm({
      phone: patient.phone || '',
      email: patient.email || '',
      date_of_birth: patient.date_of_birth ? patient.date_of_birth.slice(0, 10) : '',
      gender: patient.gender || '',
      blood_group: patient.blood_group || '',
      allergies: patient.allergies || '',
      chronic_diseases: patient.chronic_diseases || '',
      insurance_provider: patient.insurance_provider || '',
      insurance_number: patient.insurance_number || '',
      city: patient.city || '',
      emergency_contact_name: patient.emergency_contact_name || '',
      emergency_contact_phone: patient.emergency_contact_phone || '',
    });
    setEditing(true);
    setMessage('');
  }

  async function saveEdit() {
    try {
      await api.put('/auth/profile', form);
      const r = await api.get('/patients/my-profile');
      setData(r.data);
      setEditing(false);
      setMessage('Profil mis à jour');
    } catch (err) {
      setMessage('Erreur: ' + (err.response?.data?.error || err.message));
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function openDetail(c) {
    setDetailConsultation(c);
  }

  function getConsultationPrescriptions(consultationId) {
    return data.prescriptions?.filter(p => p.consultation_id === consultationId) || [];
  }

  const tabs = ['info', 'consultations', 'rdv'];

  return (
    <div>
      <div className="card">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2>{patient.first_name} {patient.last_name}</h2>
            <code style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 6, fontSize: 13 }}>{patient.patient_code}</code>
          </div>
          <p className="text-muted">{patient.email} | {patient.phone}</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
              style={{
                borderRadius: 0, border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                margin: 0, padding: '16px 20px'
              }}
              onClick={() => { setActiveTab(tab); setEditing(false); setMessage(''); }}
            >
              {tab === 'info' ? '📋 Informations' : tab === 'consultations' ? '🩺 Consultations' : '📅 Rendez-vous'}
            </button>
          ))}
        </div>
      </div>

      {message && <div className={`alert ${message.includes('Erreur') ? 'alert-error' : 'alert-success'}`} style={{ marginTop: 12 }}>{message}</div>}

      {activeTab === 'info' && (
        <div className="card">
          {!editing ? (
            <>
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <h4 style={{ margin: 0 }}>Informations personnelles</h4>
                <button className="btn btn-sm btn-outline" onClick={startEdit}>✏️ Modifier</button>
              </div>
              <div className="grid grid-2">
                <div><strong>Prénom:</strong> {patient.first_name}</div>
                <div><strong>Nom:</strong> {patient.last_name}</div>
                <div><strong>Email:</strong> {patient.email}</div>
                <div><strong>Téléphone:</strong> {patient.phone}</div>
                <div><strong>Date naissance:</strong> {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('fr-TN') : '-'}</div>
                <div><strong>Sexe:</strong> {patient.gender || '-'}</div>
                <div><strong>Ville:</strong> {patient.city || '-'}</div>
                <div><strong>Groupe sanguin:</strong> {patient.blood_group || '-'}</div>
                <div><strong>Assurance:</strong> {patient.insurance_provider || '-'}</div>
                <div><strong>N° assuré:</strong> {patient.insurance_number || '-'}</div>
                <div><strong>Contact urgence:</strong> {patient.emergency_contact_name || '-'}</div>
                <div><strong>Tél urgence:</strong> {patient.emergency_contact_phone || '-'}</div>
              </div>
              {patient.allergies && <p className="mt-2"><strong>Allergies:</strong> {patient.allergies}</p>}
              {patient.chronic_diseases && <p><strong>Maladies chroniques:</strong> {patient.chronic_diseases}</p>}
            </>
          ) : (
            <>
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <h4 style={{ margin: 0 }}>Modifier mes informations</h4>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm btn-outline" onClick={() => setEditing(false)}>Annuler</button>
                  <button className="btn btn-sm btn-primary" onClick={saveEdit}>Enregistrer</button>
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Téléphone</label>
                  <input name="phone" className="form-input" value={form.phone} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Date de naissance</label>
                  <input type="date" name="date_of_birth" className="form-input" value={form.date_of_birth} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Sexe</label>
                  <select name="gender" className="form-select" value={form.gender} onChange={handleChange}>
                    <option value="">Sélectionner...</option>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Groupe sanguin</label>
                  <select name="blood_group" className="form-select" value={form.blood_group} onChange={handleChange}>
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
                <div className="form-group">
                  <label>Ville</label>
                  <input name="city" className="form-input" value={form.city} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Assurance</label>
                  <select name="insurance_provider" className="form-select" value={form.insurance_provider} onChange={handleChange}>
                    <option value="">Sélectionner...</option>
                    {assurances.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>N° d'assuré</label>
                  <input name="insurance_number" className="form-input" value={form.insurance_number} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Contact urgence (nom)</label>
                  <input name="emergency_contact_name" className="form-input" value={form.emergency_contact_name} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Contact urgence (tél)</label>
                  <input name="emergency_contact_phone" className="form-input" value={form.emergency_contact_phone} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label>Allergies</label>
                <textarea name="allergies" className="form-textarea" rows={2} value={form.allergies} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Maladies chroniques</label>
                <textarea name="chronic_diseases" className="form-textarea" rows={2} value={form.chronic_diseases} onChange={handleChange} />
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'consultations' && (
        <div className="card">
          {consultations?.length === 0 ? (
            <p className="text-muted">Aucune consultation.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {consultations?.map(c => (
                <div key={c.id} style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>Dr. {c.doctor_first_name} {c.doctor_last_name}</strong>
                    <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{c.specialization}</span>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{new Date(c.created_at).toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={() => openDetail(c)} style={{ borderRadius: 8 }}>Détails</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {detailConsultation && (
        <div className="modal-overlay" onClick={() => setDetailConsultation(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580, padding: '28px 32px', borderRadius: 16 }}>
            <div className="flex-between" style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Détails de la consultation</h2>
              <button className="btn btn-sm btn-outline" onClick={() => setDetailConsultation(null)} style={{ width: 34, height: 34, borderRadius: '50%', padding: 0, fontSize: 16, lineHeight: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
              <div className="flex-between">
                <div>
                  <strong style={{ fontSize: 16 }}>Dr. {detailConsultation.doctor_first_name} {detailConsultation.doctor_last_name}</strong>
                  <span style={{ fontSize: 13, color: '#64748b', marginLeft: 8 }}>{detailConsultation.specialization}</span>
                </div>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {new Date(detailConsultation.created_at).toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              {detailConsultation.fee_name && (
                <div style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
                  <strong>Acte:</strong> {detailConsultation.fee_name}
                </div>
              )}
            </div>

            {detailConsultation.symptoms && (
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Symptômes</h4>
                <p style={{ fontSize: 13, color: '#4b5563', margin: 0, lineHeight: 1.6 }}>{detailConsultation.symptoms}</p>
              </div>
            )}
            {detailConsultation.diagnosis && (
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Diagnostic</h4>
                <p style={{ fontSize: 13, color: '#4b5563', margin: 0, lineHeight: 1.6 }}>{detailConsultation.diagnosis}</p>
              </div>
            )}
            {detailConsultation.report && (
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Rapport</h4>
                <p style={{ fontSize: 13, color: '#4b5563', margin: 0, lineHeight: 1.6 }}>{detailConsultation.report}</p>
              </div>
            )}
            {detailConsultation.prescribed_rest && (
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Repos prescrit</h4>
                <p style={{ fontSize: 13, color: '#4b5563', margin: 0 }}>{detailConsultation.prescribed_rest}</p>
              </div>
            )}

            {getConsultationPrescriptions(detailConsultation.id).length > 0 && (
              <div style={{ marginTop: 4 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' }}>Prescriptions</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {getConsultationPrescriptions(detailConsultation.id).map(p => (
                    <div key={p.id} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff' }}>
                      <div className="flex-between">
                        <strong style={{ fontSize: 14, color: '#1f2937' }}>{p.medication_name}</strong>
                        {p.dosage && <span style={{ fontSize: 13, color: '#6b7280' }}>{p.dosage}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                        {p.duration && <span>Durée: {p.duration}</span>}
                        {p.instructions && <span style={{ marginLeft: 12 }}>Instructions: {p.instructions}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'rdv' && (
        <div className="card">
          {appointments?.length === 0 ? (
            <p className="text-muted">Aucun rendez-vous.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {appointments?.map(a => (
                <div key={a.id} style={{
                  padding: '14px 16px', borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: a.has_consultation ? '#f1f5f9' : '#fff',
                  opacity: a.has_consultation ? 0.65 : 1,
                }}>
                  <div className="flex-between" style={{ marginBottom: 6 }}>
                    <div>
                      <strong style={{ fontSize: 14 }}>Dr. {a.doctor_first_name} {a.doctor_last_name}</strong>
                      <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{a.specialization || 'Médecin généraliste'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {a.has_consultation && (
                        <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Consultation faite</span>
                      )}
                      <span className={`badge badge-${a.status === 'confirmed' ? 'success' : a.status === 'cancelled' ? 'danger' : 'warning'}`}>
                        {a.status === 'confirmed' ? 'Confirmé' : a.status === 'cancelled' ? 'Annulé' : 'En attente'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      {new Date(a.start_time).toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      {' '}
                      {new Date(a.start_time).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(a.end_time).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {a.booked_for && <span style={{ fontSize: 12, color: '#94a3b8' }}>Pour: {a.booked_for}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <a href="/calendar" className="btn btn-primary">Prendre un rendez-vous</a>
          </div>
        </div>
      )}
    </div>
  );
}