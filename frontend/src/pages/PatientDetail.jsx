import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function PatientDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [message, setMessage] = useState('');
  const [assurances, setAssurances] = useState([]);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [accessStatus, setAccessStatus] = useState({});
  const [accessPopup, setAccessPopup] = useState(null);
  const [prescriptionPopup, setPrescriptionPopup] = useState(null);
  const [certificatePopup, setCertificatePopup] = useState(null);
  const [labAnalysisPopup, setLabAnalysisPopup] = useState(null);

  useEffect(() => {
    api.get('/patients/assurances/list').then(r => setAssurances(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    api.get(`/patients/${id}`).then(r => {
      setData(r.data);
      if (['doctor', 'assistant', 'nurse'].includes(user?.role)) {
        api.post('/doctors/assign-patient', { patientId: id }).catch(() => {});
      }
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (data?.patient) {
      setForm({
        phone: data.patient.phone || '',
        address: data.patient.address || '',
        date_of_birth: data.patient.date_of_birth ? data.patient.date_of_birth.slice(0, 10) : '',
        birth_place: data.patient.birth_place || '',
        city: data.patient.city || '',
        gender: data.patient.gender || '',
        blood_group: data.patient.blood_group || '',
        allergies: data.patient.allergies || '',
        chronic_diseases: data.patient.chronic_diseases || '',
        emergency_contact_name: data.patient.emergency_contact_name || '',
        emergency_contact_phone: data.patient.emergency_contact_phone || '',
        insurance_provider: data.patient.insurance_provider || '',
        insurance_number: data.patient.insurance_number || '',
        national_id: data.patient.national_id || '',
      });
    }
  }, [data]);

  if (!data) return <div className="loading-screen">Chargement...</div>;

  const { patient, consultations, invoices } = data;
  const canEdit = ['assistant', 'nurse', 'doctor', 'super_admin'].includes(user?.role);
  const myConsultations = consultations?.filter(c => user?.profile?.id === c.doctor_id) || [];
  const otherConsultations = consultations?.filter(c => user?.profile?.id !== c.doctor_id) || [];

  async function handleSave(e) {
    e.preventDefault();
    setMessage('');
    try {
      await api.put(`/patients/${id}`, form);
      setMessage('✅ Dossier patient mis à jour avec succès');
      setEditMode(false);
      const r = await api.get(`/patients/${id}`);
      setData(r.data);
    } catch (err) {
      setMessage('Erreur: ' + (err.response?.data?.error || err.message));
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  return (
    <div>
      <Link to="/patients" className="btn btn-outline btn-sm mb-4">← Retour</Link>

      <div className="card">
        <div className="flex-between">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2>{patient.first_name} {patient.last_name}</h2>
              <code style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 6, fontSize: 13 }}>{patient.patient_code}</code>
            </div>
            <p className="text-muted">{patient.email} | {patient.phone}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canEdit && !editMode && (
              <button className="btn btn-outline" onClick={() => setEditMode(true)}>Modifier</button>
            )}
            {user?.role === 'doctor' && (
              <Link to={`/consultations?patientId=${patient.id}`} className="btn btn-primary">
                Nouvelle consultation
              </Link>
            )}
          </div>
        </div>
      </div>

      {message && <div className={`alert ${message.includes('succès') ? 'alert-success' : 'alert-error'}`}>{message}</div>}

      <div className="card" style={{ padding: '0' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {['info', 'consultations', 'invoices'].map(tab => (
            <button
              key={tab}
              className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: 0, border: 'none', borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent', margin: 0, padding: '16px 20px' }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'info' ? 'Informations' : tab === 'consultations' ? 'Consultations' : 'Notes d\'honoraires'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'info' && !editMode && (
        <div>
          <div className="card mb-4">
            <h4 style={{ marginBottom: 12, color: '#475569' }}>🧑‍⚕️ Identité</h4>
            <div className="grid grid-2">
              <div><strong>Prénom:</strong> {patient.first_name}</div>
              <div><strong>Nom:</strong> {patient.last_name}</div>
              <div><strong>CIN:</strong> {patient.national_id || '-'}</div>
              <div><strong>Email:</strong> {patient.email}</div>
              <div><strong>Téléphone:</strong> {patient.phone || '-'}</div>
              <div><strong>Adresse:</strong> {patient.address || '-'}</div>
            </div>
          </div>

          <div className="card mb-4">
            <h4 style={{ marginBottom: 12, color: '#475569' }}>📋 Informations médicales</h4>
            <div className="grid grid-2">
              <div><strong>Date de naissance:</strong> {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('fr-TN') : '-'}</div>
              <div><strong>Lieu de naissance:</strong> {patient.birth_place || '-'}</div>
              <div><strong>Sexe:</strong> {patient.gender || '-'}</div>
              <div><strong>Groupe sanguin:</strong> {patient.blood_group || '-'}</div>
              <div><strong>Ville:</strong> {patient.city || '-'}</div>
            </div>
            {patient.allergies && <div style={{ marginTop: 8 }}><strong>Allergies:</strong> {patient.allergies}</div>}
            {patient.chronic_diseases && <div style={{ marginTop: 4 }}><strong>Maladies chroniques:</strong> {patient.chronic_diseases}</div>}
          </div>

          <div className="card mb-4">
            <h4 style={{ marginBottom: 12, color: '#475569' }}>🆘 Contact d'urgence</h4>
            <div className="grid grid-2">
              <div><strong>Nom:</strong> {patient.emergency_contact_name || '-'}</div>
              <div><strong>Téléphone:</strong> {patient.emergency_contact_phone || '-'}</div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 12, color: '#475569' }}>🛡️ Assurance</h4>
            <div className="grid grid-2">
              <div><strong>Assureur:</strong> {patient.insurance_provider || '-'}</div>
              <div><strong>N° d'assuré:</strong> {patient.insurance_number || '-'}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'consultations' && (
        <div>
          {user?.role === 'doctor' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
              {myConsultations.length > 0 && (
                <div className="card">
                  <h4 style={{ marginBottom: 12, color: '#2d3748' }}>📋 Mes Consultations</h4>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr><th>Date</th><th>Acte</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {myConsultations.map(c => (
                          <tr key={c.id}>
                            <td>{new Date(c.created_at).toLocaleDateString('fr-TN')}</td>
                            <td><span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{c.fee_name || '-'}</span></td>
                            <td>
                              <button className="btn btn-sm btn-outline"
                                onClick={() => setSelectedConsultation({ ...c, hasFullAccess: true })}>Voir</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="card">
                <h4 style={{ marginBottom: 12, color: '#2d3748' }}>🏥 Consultations d'autres médecins</h4>
                {otherConsultations.length === 0 ? (
                  <p className="text-muted">Aucune consultation d'autres médecins.</p>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr><th>Médecin</th><th>Spécialité</th><th>Date</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {otherConsultations.map(c => {
                          const hasAccess = accessStatus[c.id];
                          return (
                            <tr key={c.id}>
                              <td><strong>Dr. {c.doctor_first_name} {c.doctor_last_name}</strong></td>
                              <td><span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{c.specialization || '-'}</span></td>
                              <td>{new Date(c.created_at).toLocaleDateString('fr-TN')}</td>
                              <td>
                                <button className="btn btn-sm btn-outline" style={{ marginRight: 6 }}
                                  onClick={() => {
                                    if (hasAccess) {
                                      setSelectedConsultation({ ...c, hasFullAccess: true });
                                    } else {
                                      api.get(`/consultations/${c.id}/check-access`).then(r => {
                                        if (r.data.hasAccess) {
                                          setAccessStatus(s => ({ ...s, [c.id]: true }));
                                          setSelectedConsultation({ ...c, hasFullAccess: true });
                                        } else {
                                          setSelectedConsultation({ ...c, locked: true });
                                        }
                                      }).catch(() => setSelectedConsultation({ ...c, locked: true }));
                                    }
                                  }}>Voir</button>
                                {!hasAccess && (
                                  <button className="btn btn-sm btn-primary"
                                    onClick={async () => {
                                      try {
                                        const res = await api.get(`/consultations/${c.id}/access-status`);
                                        setAccessPopup({
                                          consultationId: c.id,
                                          doctorStatus: res.data.status,
                                          patientStatus: res.data.patient_status,
                                          consultation: c,
                                        });
                                      } catch (err) {
                                        alert('Erreur lors de la vérification du statut.');
                                      }
                                    }}>Accès</button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              {consultations?.length === 0 ? (
                <p className="text-muted">Aucune consultation.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Médecin</th><th>Spécialité</th><th>Date</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {consultations?.map(c => (
                        <tr key={c.id}>
                          <td><strong>Dr. {c.doctor_first_name} {c.doctor_last_name}</strong></td>
                          <td><span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{c.specialization || '-'}</span></td>
                          <td>{new Date(c.created_at).toLocaleDateString('fr-TN')}</td>
                          <td>
                            <button className="btn btn-sm btn-outline"
                              onClick={() => setSelectedConsultation({ ...c, hasFullAccess: true })}>Voir</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {accessPopup && (
        <div className="modal-overlay" onClick={() => setAccessPopup(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="flex-between">
              <h3>🔐 Demande d'accès</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setAccessPopup(null)}>✕</button>
            </div>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
              <AccessStatusBox
                label="Médecin traitant"
                status={accessPopup.doctorStatus}
                otherStatus={accessPopup.patientStatus}
                onResend={async () => {
                  try {
                    const side = accessPopup.patientStatus === 'approved' ? 'doctor' : 'both';
                    await api.post(`/consultations/${accessPopup.consultationId}/request-access`, { resendSide: side });
                    const res = await api.get(`/consultations/${accessPopup.consultationId}/access-status`);
                    setAccessPopup({ ...accessPopup, doctorStatus: res.data.status, patientStatus: res.data.patient_status });
                    window.dispatchEvent(new CustomEvent('notification-update'));
                  } catch (err) {
                    alert(err.response?.data?.error || 'Erreur');
                  }
                }}
              />
              <AccessStatusBox
                label="Patient"
                status={accessPopup.patientStatus}
                otherStatus={accessPopup.doctorStatus}
                onResend={async () => {
                  try {
                    const side = accessPopup.doctorStatus === 'approved' ? 'patient' : 'both';
                    await api.post(`/consultations/${accessPopup.consultationId}/request-access`, { resendSide: side });
                    const res = await api.get(`/consultations/${accessPopup.consultationId}/access-status`);
                    setAccessPopup({ ...accessPopup, doctorStatus: res.data.status, patientStatus: res.data.patient_status });
                    window.dispatchEvent(new CustomEvent('notification-update'));
                  } catch (err) {
                    alert(err.response?.data?.error || 'Erreur');
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {selectedConsultation && (
        <div className="modal-overlay" onClick={() => setSelectedConsultation(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="flex-between" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>📋 Consultation médicale</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setSelectedConsultation(null)}>✕</button>
            </div>
            {selectedConsultation.locked ? (
              <div className="mt-4">
                <div className="alert alert-error">
                  Vous n'avez pas accès à cette consultation. Cliquez sur <strong>Accès</strong> pour envoyer une demande au médecin.
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                  <span style={{ background: '#f1f5f9', padding: '4px 12px', borderRadius: 20, fontSize: 13, color: '#475569' }}>
                    🩺 Dr. {selectedConsultation.doctor_first_name} {selectedConsultation.doctor_last_name}
                  </span>
                  <span style={{ background: '#dbeafe', padding: '4px 12px', borderRadius: 20, fontSize: 13, color: '#1e40af' }}>
                    {selectedConsultation.specialization}
                  </span>
                  <span style={{ background: '#f0fdf4', padding: '4px 12px', borderRadius: 20, fontSize: 13, color: '#166534' }}>
                    📅 {new Date(selectedConsultation.created_at).toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {selectedConsultation.fee_name && (
                    <span style={{ background: '#fef3c7', padding: '4px 12px', borderRadius: 20, fontSize: 13, color: '#92400e' }}>
                      💉 {selectedConsultation.fee_name}
                    </span>
                  )}
                  {selectedConsultation.prescribed_rest && selectedConsultation.prescribed_rest !== '0' && (
                    <span style={{ background: '#fce7f3', padding: '4px 12px', borderRadius: 20, fontSize: 13, color: '#9d174d' }}>
                      🛌 Repos {selectedConsultation.prescribed_rest} jours
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {selectedConsultation.symptoms && (
                    <div style={{ background: '#fafafa', borderRadius: 8, padding: 14, border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><span>🤒</span> Symptômes</div>
                      <p style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{selectedConsultation.symptoms}</p>
                    </div>
                  )}
                  {selectedConsultation.diagnosis && (
                    <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 14, border: '1px solid #dcfce7' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><span>🔬</span> Diagnostic</div>
                      <p style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{selectedConsultation.diagnosis}</p>
                    </div>
                  )}
                  {selectedConsultation.report && (
                    <div style={{ background: '#fefce8', borderRadius: 8, padding: 14, border: '1px solid #fef08a' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#854d0e', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><span>📄</span> Rapport</div>
                      <p style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{selectedConsultation.report}</p>
                    </div>
                  )}
                </div>

                {!selectedConsultation.symptoms && !selectedConsultation.diagnosis && !selectedConsultation.report && (
                  <p style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>Aucune information médicale détaillée.</p>
                )}

                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={async () => {
                      try {
                        const res = await api.get(`/consultations/${selectedConsultation.id}/prescriptions`);
                        setPrescriptionPopup({ consultation: selectedConsultation, prescriptions: res.data });
                      } catch (err) {
                        alert(err.response?.data?.error || 'Erreur lors du chargement des prescriptions');
                      }
                    }}>
                    💊 Ordonnance
                  </button>
                  <button className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => {
                      setCertificatePopup(selectedConsultation);
                    }}>
                    📜 Certificat
                  </button>
                  <button className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={async () => {
                      try {
                        const res = await api.get(`/consultations/${selectedConsultation.id}/lab-analyses`);
                        setLabAnalysisPopup({ consultation: selectedConsultation, analyses: res.data });
                      } catch (err) {
                        alert(err.response?.data?.error || 'Erreur lors du chargement des analyses');
                      }
                    }}>
                    🧪 Analyses
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {prescriptionPopup && (
        <div className="modal-overlay" onClick={() => setPrescriptionPopup(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="flex-between no-print" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>💊 Ordonnance médicale</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-outline" onClick={() => window.print()}>🖨️ Imprimer / PDF</button>
                <button className="btn btn-sm btn-outline" onClick={() => setPrescriptionPopup(null)}>✕</button>
              </div>
            </div>
            {prescriptionPopup.prescriptions?.length === 0 ? (
              <p className="text-muted">Aucune ordonnance pour cette consultation.</p>
            ) : (
              <div className="print-document">
                <style>{`
                  @media print {
                    body { font-family: 'Times New Roman', serif; font-size: 12pt; margin: 0; padding: 0; }
                    .no-print { display: none !important; }
                    .print-document { padding: 30px 25px; }
                    @page { margin: 15mm 12mm; }
                  }
                `}</style>

                {/* Top row: Logo left / Doctor info right */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30, paddingBottom: 16, borderBottom: '2px solid #1e293b' }}>
                  {/* Logo */}
                  <div style={{ textAlign: 'center' }}>
                    <img src="/img/images.jfif" alt="Logo médical" style={{ width: 60, height: 60, objectFit: 'contain' }} />
                  </div>

                  {/* Doctor info */}
                  <div style={{ textAlign: 'right', maxWidth: 300 }}>
                    <h2 style={{ margin: 0, fontSize: 18, color: '#1e293b', fontWeight: 700 }}>
                      Dr. {user?.firstName} {user?.lastName}
                    </h2>
                    <p style={{ margin: '3px 0', fontSize: 12, color: '#475569' }}>
                      {user?.profile?.specialization_name || 'Médecin'}
                    </p>
                    <p style={{ margin: '2px 0', fontSize: 11, color: '#64748b' }}>
                      {user?.profile?.cabinet_address && `${user.profile.cabinet_address}`}<br />
                      {user?.profile?.city || ''}
                      {user?.phone && ` — Tél: ${user.phone}`}
                    </p>
                    {user?.profile?.license_number && (
                      <p style={{ margin: '2px 0', fontSize: 10, color: '#94a3b8' }}>
                        N° d'agrément : {user.profile.license_number}
                      </p>
                    )}
                  </div>
                </div>

                {/* Patient line */}
                <p style={{ fontSize: 13, color: '#1e293b', marginBottom: 20 }}>
                  <strong>M.</strong> / <strong>Mme</strong> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{patient.first_name} {patient.last_name}</span>
                </p>

                {/* Date line */}
                <p style={{ fontSize: 12, color: '#475569', marginBottom: 24 }}>
                  <em>Le {new Date(prescriptionPopup.consultation.created_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' })}</em>
                </p>

                {/* Prescription items */}
                <div style={{ marginBottom: 32 }}>
                  {prescriptionPopup.prescriptions.map((p, i) => (
                    <div key={i} style={{ marginBottom: 16, paddingLeft: 20 }}>
                      <p style={{ margin: '2px 0', fontSize: 14, lineHeight: 1.8 }}>
                        <strong style={{ fontSize: 15 }}>{p.medication_name}</strong>
                        {p.dosage && ` — ${p.dosage}`}
                      </p>
                      <p style={{ margin: '2px 0', fontSize: 12, color: '#475569', paddingLeft: 16 }}>
                        {p.frequency && `${p.frequency}`}{p.duration && ` — pendant ${p.duration}`}
                      </p>
                      {p.notes && (
                        <p style={{ margin: '2px 0', fontSize: 11, color: '#64748b', fontStyle: 'italic', paddingLeft: 16 }}>
                          {p.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div style={{ marginTop: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    <p style={{ margin: '2px 0' }}>Cachet et signature du médecin</p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12 }}>
                    <p style={{ margin: '2px 0', color: '#475569' }}>
                      Fait à {user?.profile?.city || '________'}, le {new Date().toLocaleDateString('fr-TN')}
                    </p>
                    <p style={{ margin: '2px 0', color: '#475569', fontWeight: 600 }}>
                      Dr. {user?.firstName} {user?.lastName}
                    </p>
                    <div style={{ marginTop: 6, width: 140, height: 1, borderTop: '1px solid #94a3b8', display: 'inline-block' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {certificatePopup && (
        <div className="modal-overlay" onClick={() => setCertificatePopup(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="flex-between" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>📜 Certificat médical</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-outline" onClick={() => window.print()}>🖨️ Imprimer / PDF</button>
                <button className="btn btn-sm btn-outline" onClick={() => setCertificatePopup(null)}>✕</button>
              </div>
            </div>
            <div className="print-document">
              <style>{`
                @media print {
                  body { font-family: 'Times New Roman', serif; font-size: 12pt; margin: 0; padding: 0; }
                  .no-print { display: none !important; }
                  .print-document { padding: 20px; }
                  @page { margin: 20mm 15mm; }
                }
              `}</style>
              {/* Letterhead */}
              <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #1e293b' }}>
                <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b', fontWeight: 700 }}>
                  Dr. {user?.firstName} {user?.lastName}
                </h2>
                <p style={{ margin: '4px 0', fontSize: 14, color: '#475569' }}>
                  {user?.profile?.specialization_name || 'Médecin'}
                </p>
                <p style={{ margin: '2px 0', fontSize: 12, color: '#64748b' }}>
                  {user?.profile?.cabinet_address && `${user.profile.cabinet_address}, `}{user?.profile?.city || ''}
                  {user?.phone && ` | Tél: ${user.phone}`}
                </p>
                {user?.profile?.license_number && (
                  <p style={{ margin: '2px 0', fontSize: 11, color: '#94a3b8' }}>
                    N° d'agrément : {user.profile.license_number}
                  </p>
                )}
              </div>

              {/* Patient info */}
              <div style={{ marginBottom: 20, padding: 12, background: '#f8fafc', borderRadius: 6, fontSize: 13 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '2px 8px', color: '#475569', width: 120, fontWeight: 600 }}>Patient</td>
                      <td style={{ padding: '2px 8px' }}>{patient.first_name} {patient.last_name}</td>
                      <td style={{ padding: '2px 8px', color: '#475569', width: 100, fontWeight: 600 }}>N° Dossier</td>
                      <td style={{ padding: '2px 8px' }}>{patient.patient_code || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 8px', color: '#475569', fontWeight: 600 }}>CIN</td>
                      <td style={{ padding: '2px 8px' }}>{patient.national_id || '-'}</td>
                      <td style={{ padding: '2px 8px', color: '#475569', fontWeight: 600 }}>Date</td>
                      <td style={{ padding: '2px 8px' }}>{new Date(certificatePopup.created_at).toLocaleDateString('fr-TN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Title */}
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', textAlign: 'center', marginBottom: 24, textTransform: 'uppercase', letterSpacing: 1 }}>
                Certificat Médical
              </h3>

              {/* Body */}
              <div style={{ fontSize: 14, color: '#1e293b', lineHeight: 2, textAlign: 'justify' }}>
                <p>Je soussigné, <strong>Docteur {user?.firstName} {user?.lastName}</strong>, {user?.profile?.specialization_name || 'médecin'},</p>
                <p>Certifie avoir examiné le patient <strong>{patient.first_name} {patient.last_name}</strong>, né le {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('fr-TN') : '________'}, {patient.national_id ? `CIN N° ${patient.national_id}, ` : ''}domicilié à {patient.city || '________'}.</p>
                <p>Examiné en date du {new Date(certificatePopup.created_at).toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.</p>
                {certificatePopup.symptoms && (
                  <p><strong>Symptômes présentés :</strong> {certificatePopup.symptoms}</p>
                )}
                {certificatePopup.diagnosis && (
                  <p><strong>Diagnostic retenu :</strong> {certificatePopup.diagnosis}</p>
                )}
                {certificatePopup.prescribed_rest && certificatePopup.prescribed_rest !== '0' && (
                  <p>Prescrit un arrêt de travail de <strong>{certificatePopup.prescribed_rest} jours</strong> à compter de ce jour.</p>
                )}
              </div>

              {/* Footer */}
              <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  <p style={{ margin: '2px 0' }}>Cachet et signature du médecin</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13 }}>
                  <p style={{ margin: '2px 0', color: '#475569' }}>
                    Fait à {user?.profile?.city || '________'}, le {new Date().toLocaleDateString('fr-TN')}
                  </p>
                  <p style={{ margin: '2px 0', color: '#475569', fontWeight: 600 }}>
                    Dr. {user?.firstName} {user?.lastName}
                  </p>
                  <div style={{ marginTop: 8, width: 120, height: 1, borderTop: '1px solid #94a3b8', display: 'inline-block' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {labAnalysisPopup && (
        <div className="modal-overlay" onClick={() => setLabAnalysisPopup(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="flex-between" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>🧪 Analyses médicales</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-outline" onClick={() => window.print()}>🖨️ Imprimer / PDF</button>
                <button className="btn btn-sm btn-outline" onClick={() => setLabAnalysisPopup(null)}>✕</button>
              </div>
            </div>
            {labAnalysisPopup.analyses?.length === 0 ? (
              <p className="text-muted">Aucune analyse pour cette consultation.</p>
            ) : (
              <div className="print-document">
                <style>{`
                  @media print {
                    body { font-family: 'Times New Roman', serif; font-size: 12pt; margin: 0; padding: 0; }
                    .no-print { display: none !important; }
                    .print-document { padding: 20px; }
                    @page { margin: 20mm 15mm; }
                  }
                `}</style>
                {/* Letterhead */}
                <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #1e293b' }}>
                  <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b', fontWeight: 700 }}>
                    Dr. {user?.firstName} {user?.lastName}
                  </h2>
                  <p style={{ margin: '4px 0', fontSize: 14, color: '#475569' }}>
                    {user?.profile?.specialization_name || 'Médecin'}
                  </p>
                  <p style={{ margin: '2px 0', fontSize: 12, color: '#64748b' }}>
                    {user?.profile?.cabinet_address && `${user.profile.cabinet_address}, `}{user?.profile?.city || ''}
                    {user?.phone && ` | Tél: ${user.phone}`}
                  </p>
                  {user?.profile?.license_number && (
                    <p style={{ margin: '2px 0', fontSize: 11, color: '#94a3b8' }}>
                      N° d'agrément : {user.profile.license_number}
                    </p>
                  )}
                </div>

                {/* Patient info */}
                <div style={{ marginBottom: 20, padding: 12, background: '#f8fafc', borderRadius: 6, fontSize: 13 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '2px 8px', color: '#475569', width: 120, fontWeight: 600 }}>Patient</td>
                        <td style={{ padding: '2px 8px' }}>{patient.first_name} {patient.last_name}</td>
                        <td style={{ padding: '2px 8px', color: '#475569', width: 100, fontWeight: 600 }}>N° Dossier</td>
                        <td style={{ padding: '2px 8px' }}>{patient.patient_code || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '2px 8px', color: '#475569', fontWeight: 600 }}>CIN</td>
                        <td style={{ padding: '2px 8px' }}>{patient.national_id || '-'}</td>
                        <td style={{ padding: '2px 8px', color: '#475569', fontWeight: 600 }}>Date</td>
                        <td style={{ padding: '2px 8px' }}>{new Date(labAnalysisPopup.consultation.created_at).toLocaleDateString('fr-TN')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Title */}
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', textAlign: 'center', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Demande d'Analyses Médicales
                </h3>

                {/* Analyses table */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ textAlign: 'left', padding: 10, fontSize: 13, borderBottom: '2px solid #cbd5e1', color: '#475569' }}>Type d'analyse</th>
                      <th style={{ textAlign: 'left', padding: 10, fontSize: 13, borderBottom: '2px solid #cbd5e1', color: '#475569' }}>Instructions</th>
                      <th style={{ textAlign: 'center', padding: 10, fontSize: 13, borderBottom: '2px solid #cbd5e1', color: '#475569' }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labAnalysisPopup.analyses.map((la, i) => (
                      <tr key={i}>
                        <td style={{ padding: 10, borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{la.analysis_name}</td>
                        <td style={{ padding: 10, borderBottom: '1px solid #e2e8f0' }}>{la.instructions || '-'}</td>
                        <td style={{ padding: 10, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <span style={{
                            background: la.status === 'completed' ? '#dcfce7' : '#fef3c7',
                            color: la.status === 'completed' ? '#16a34a' : '#d97706',
                            padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600
                          }}>
                            {la.status === 'completed' ? 'Terminé' : 'En attente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer */}
                <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    <p style={{ margin: '2px 0' }}>Cachet et signature du médecin</p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13 }}>
                    <p style={{ margin: '2px 0', color: '#475569' }}>
                      Fait à {user?.profile?.city || '________'}, le {new Date().toLocaleDateString('fr-TN')}
                    </p>
                    <p style={{ margin: '2px 0', color: '#475569', fontWeight: 600 }}>
                      Dr. {user?.firstName} {user?.lastName}
                    </p>
                    <div style={{ marginTop: 8, width: 120, height: 1, borderTop: '1px solid #94a3b8', display: 'inline-block' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="card">
          {invoices?.length === 0 ? (
            <p className="text-muted">Aucune note d'honoraires.</p>
          ) : (
            <div>
              {invoices?.map(inv => (
                <div key={inv.id} style={{ marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                  <div className="flex-between" style={{ marginBottom: 12 }}>
                    <div>
                      <strong>N° {inv.invoice_number}</strong>
                      <span className="text-muted text-sm" style={{ marginLeft: 12 }}>{new Date(inv.created_at).toLocaleDateString('fr-TN')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <strong style={{ fontSize: 16 }}>{Number(inv.total).toFixed(2)} TND</strong>
                      <span className={`badge badge-${inv.status === 'paid' ? 'success' : inv.status === 'cancelled' ? 'danger' : 'warning'}`}>{inv.status === 'paid' ? 'Payée' : inv.status === 'cancelled' ? 'Annulée' : 'Impayée'}</span>
                    </div>
                  </div>
                  {inv.items?.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      <table style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: 13 }}>Description</th>
                            <th style={{ textAlign: 'right', padding: '4px 8px', fontSize: 13 }}>Qté</th>
                            <th style={{ textAlign: 'right', padding: '4px 8px', fontSize: 13 }}>Prix unit.</th>
                            <th style={{ textAlign: 'right', padding: '4px 8px', fontSize: 13 }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inv.items.map((item, i) => (
                            <tr key={i}>
                              <td style={{ padding: '4px 8px' }}>{item.description}</td>
                              <td style={{ textAlign: 'right', padding: '4px 8px' }}>{item.quantity}</td>
                              <td style={{ textAlign: 'right', padding: '4px 8px' }}>{Number(item.unit_price).toFixed(2)}</td>
                              <td style={{ textAlign: 'right', padding: '4px 8px' }}><strong>{Number(item.total).toFixed(2)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccessStatusBox({ label, status, otherStatus, onResend }) {
  const statusLabel = !status ? 'Non demandé' : status === 'pending' ? '⏳ En attente' : status === 'approved' ? '✅ Accepté' : '❌ Refusé';
  const statusColor = !status ? '#6b7280' : status === 'pending' ? '#d97706' : status === 'approved' ? '#16a34a' : '#dc2626';
  const otherDenied = otherStatus === 'denied';
  const showButton = !status || (status === 'pending' && !otherDenied);

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>{label}</div>
      <div style={{
        fontSize: 13, color: statusColor, fontWeight: 500, marginBottom: 16,
        background: status === 'pending' ? '#fef3c7' : status === 'approved' ? '#dcfce7' : status === 'denied' ? '#fee2e2' : '#f3f4f6',
        padding: '6px 12px', borderRadius: 6, display: 'inline-block'
      }}>
        {statusLabel}
      </div>
      {showButton && (
        <div>
          <button className="btn btn-sm btn-primary" onClick={onResend}>
            {!status ? 'Envoyer la demande' : status === 'pending' ? (otherDenied ? '' : 'Renvoyer la demande') : ''}
          </button>
        </div>
      )}
    </div>
  );
}
