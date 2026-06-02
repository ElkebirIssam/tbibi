import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function ConsultationsPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('patientId') ? 'new' : 'list');
  const [consultations, setConsultations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [patients, setPatients] = useState([]);
  const [feeItems, setFeeItems] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [form, setForm] = useState({ feeItemId: '', symptoms: '', report: '', prescribedRest: '' });
  const [prescriptions, setPrescriptions] = useState([]);
  const [labAnalyses, setLabAnalyses] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/doctors/patients').then(r => {
      setPatients(r.data);
      const pid = searchParams.get('patientId');
      if (pid) setSelectedPatient(pid);
    }).catch(() => {});
    api.get('/fee-items').then(r => setFeeItems(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    api.get(`/consultations?page=${page}&limit=20`).then(r => {
      setConsultations(r.data.data || []);
      setTotal(r.data.total || 0);
    }).catch(() => {});
  }, [page]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    try {
      const consultation = (await api.post('/consultations', {
        patientId: selectedPatient,
        feeItemId: form.feeItemId || null,
        symptoms: form.symptoms,
        report: form.report,
        prescribedRest: form.prescribedRest,
      })).data;

      for (const p of prescriptions) {
        await api.post(`/consultations/${consultation.id}/prescriptions`, p);
      }
      for (const la of labAnalyses) {
        await api.post(`/consultations/${consultation.id}/lab-analyses`, la);
      }

      setMessage('Consultation enregistrée avec succès !');
      setForm({ feeItemId: '', symptoms: '', report: '', prescribedRest: '' });
      setPrescriptions([]);
      setLabAnalyses([]);
      setSelectedPatient('');
      api.get(`/consultations?page=1&limit=20`).then(r => {
        setConsultations(r.data.data || []);
        setTotal(r.data.total || 0);
        setPage(1);
      }).catch(() => {});
    } catch (err) {
      setMessage('Erreur: ' + (err.response?.data?.error || err.message));
    }
  }

  function addPrescription() {
    setPrescriptions([...prescriptions, { medicationName: '', dosage: '', frequency: '', duration: '', notes: '' }]);
  }

  function updatePrescription(i, field, value) {
    const updated = [...prescriptions];
    updated[i] = { ...updated[i], [field]: value };
    setPrescriptions(updated);
  }

  function addLabAnalysis() {
    setLabAnalyses([...labAnalyses, { analysisName: '', instructions: '' }]);
  }

  function updateLabAnalysis(i, field, value) {
    const updated = [...labAnalyses];
    updated[i] = { ...updated[i], [field]: value };
    setLabAnalyses(updated);
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <h2>🩺 Consultations</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${tab === 'list' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('list')}>Liste</button>
          <button className={`btn btn-sm ${tab === 'new' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('new')}>Nouvelle consultation</button>
        </div>
      </div>

      {message && <div className={`alert ${message.includes('succès') ? 'alert-success' : 'alert-error'}`}>{message}</div>}

      {tab === 'list' && (
        <div className="card">
          {consultations.length === 0 ? (
            <p className="text-muted">Aucune consultation.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Code</th>
                    <th>Acte</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.map(c => (
                    <tr key={c.id}>
                      <td>{new Date(c.created_at).toLocaleDateString('fr-TN')}</td>
                      <td>{c.first_name} {c.last_name}</td>
                      <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{c.patient_code}</code></td>
                      <td>{c.fee_name || '-'}</td>
                      <td>
                        <button className="btn btn-sm btn-outline" onClick={() => setSelected(c)}>Voir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > 20 && (
            <div className="flex-center mt-4" style={{ gap: 8 }}>
              <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Précédent</button>
              <span className="text-sm">Page {page} / {Math.ceil(total / 20)}</span>
              <button className="btn btn-sm btn-outline" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Suivant →</button>
            </div>
          )}
        </div>
      )}

      {tab === 'new' && (
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Patient</label>
              <select className="form-select" value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} required>
                <option value="">Sélectionner...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Acte</label>
              <select className="form-select" value={form.feeItemId} onChange={e => setForm({...form, feeItemId: e.target.value})}>
                <option value="">Sélectionner un acte...</option>
                {feeItems.map(f => (
                  <option key={f.id} value={f.id}>{f.name} - {Number(f.price).toFixed(2)} TND{f.category ? ` (${f.category})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Symptômes</label>
              <textarea className="form-textarea" value={form.symptoms} onChange={e => setForm({...form, symptoms: e.target.value})} />
            </div>

            <div className="form-group">
              <label>Rapport</label>
              <textarea className="form-textarea" value={form.report} onChange={e => setForm({...form, report: e.target.value})} />
            </div>

            <div className="form-group">
              <label>Repos prescrit</label>
              <input className="form-input" value={form.prescribedRest} onChange={e => setForm({...form, prescribedRest: e.target.value})} placeholder="ex: 7 jours" />
            </div>

            <div className="card" style={{ background: '#f8fafc' }}>
              <div className="flex-between mb-4">
                <strong>Prescriptions</strong>
                <button type="button" className="btn btn-sm btn-outline" onClick={addPrescription}>+ Ajouter</button>
              </div>
              {prescriptions.map((p, i) => (
                <div key={i} style={{ marginBottom: 12, padding: 12, background: '#fff', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div className="grid grid-4" style={{ gap: 8, marginBottom: 8 }}>
                    <input className="form-input" placeholder="Médicament" value={p.medicationName} onChange={e => updatePrescription(i, 'medicationName', e.target.value)} />
                    <input className="form-input" placeholder="Dosage" value={p.dosage} onChange={e => updatePrescription(i, 'dosage', e.target.value)} />
                    <input className="form-input" placeholder="Fréquence" value={p.frequency} onChange={e => updatePrescription(i, 'frequency', e.target.value)} />
                    <input className="form-input" placeholder="Durée" value={p.duration} onChange={e => updatePrescription(i, 'duration', e.target.value)} />
                  </div>
                  <input className="form-input" placeholder="Remarques" value={p.notes} onChange={e => updatePrescription(i, 'notes', e.target.value)} />
                </div>
              ))}
            </div>

            <div className="card" style={{ background: '#f8fafc' }}>
              <div className="flex-between mb-4">
                <strong>Analyses demandées</strong>
                <button type="button" className="btn btn-sm btn-outline" onClick={addLabAnalysis}>+ Ajouter</button>
              </div>
              {labAnalyses.map((la, i) => (
                <div key={i} className="grid grid-2" style={{ marginBottom: 12, gap: 8 }}>
                  <input className="form-input" placeholder="Type d'analyse" value={la.analysisName} onChange={e => updateLabAnalysis(i, 'analysisName', e.target.value)} />
                  <input className="form-input" placeholder="Instructions" value={la.instructions} onChange={e => updateLabAnalysis(i, 'instructions', e.target.value)} />
                </div>
              ))}
            </div>

            <button type="submit" className="btn btn-primary mt-4">Enregistrer la consultation</button>
          </form>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="flex-between">
              <h2>Détails de la consultation</h2>
              <button className="btn btn-sm btn-outline" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="mt-4">
              <div className="grid grid-2" style={{ gap: 12, marginBottom: 16 }}>
                <div><strong>Patient :</strong> {selected.first_name} {selected.last_name}</div>
                <div><strong>Code :</strong> {selected.patient_code}</div>
                <div><strong>Date :</strong> {new Date(selected.created_at).toLocaleDateString('fr-TN')}</div>
                <div><strong>Acte :</strong> {selected.fee_name || '-'}</div>
                <div><strong>Repos prescrit :</strong> {selected.prescribed_rest || '-'}</div>
              </div>
              {selected.symptoms && (
                <div className="mb-3">
                  <strong>Symptômes :</strong>
                  <p className="text-muted" style={{ whiteSpace: 'pre-wrap' }}>{selected.symptoms}</p>
                </div>
              )}
              {selected.report && (
                <div className="mb-3">
                  <strong>Rapport :</strong>
                  <p className="text-muted" style={{ whiteSpace: 'pre-wrap' }}>{selected.report}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
