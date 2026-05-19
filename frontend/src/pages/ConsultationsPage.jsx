import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function ConsultationsPage() {
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(searchParams.get('patientId') || '');
  const [form, setForm] = useState({ symptoms: '', diagnosis: '', report: '', prescribedRest: '' });
  const [prescriptions, setPrescriptions] = useState([]);
  const [labAnalyses, setLabAnalyses] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/doctors/patients').then(r => setPatients(r.data)).catch(() => {});
  }, []);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    try {
      const consultation = (await api.post('/consultations', {
        patientId: selectedPatient,
        symptoms: form.symptoms,
        diagnosis: form.diagnosis,
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
      setForm({ symptoms: '', diagnosis: '', report: '', prescribedRest: '' });
      setPrescriptions([]);
      setLabAnalyses([]);
    } catch (err) {
      setMessage('Erreur: ' + (err.response?.data?.error || err.message));
    }
  }

  async function generateDoc(type) {
    if (!selectedPatient) return alert('Sélectionnez un patient');
    try {
      const consultation = (await api.get(`/doctors/patients`)).data;
      const recentConsultations = (await api.get(`/patients/${selectedPatient}`)).data.consultations;
      if (!recentConsultations?.length) return alert('Aucune consultation trouvée');
      const consultationId = recentConsultations[recentConsultations.length - 1].id;

      if (type === 'prescription') {
        await api.post(`/consultations/${selectedPatient}/${consultationId}/generate-prescription`);
      } else if (type === 'certificate') {
        await api.post(`/consultations/${selectedPatient}/${consultationId}/generate-certificate`);
      }
      alert('Document généré !');
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message));
    }
  }

  return (
    <div>
      <h2 className="mb-4">🩺 Nouvelle consultation</h2>

      {message && <div className={`alert ${message.includes('succès') ? 'alert-success' : 'alert-error'}`}>{message}</div>}

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

          <div className="grid grid-2">
            <div className="form-group">
              <label>Symptômes</label>
              <textarea className="form-textarea" value={form.symptoms} onChange={e => setForm({...form, symptoms: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Diagnostic</label>
              <textarea className="form-textarea" value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} />
            </div>
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
              <div key={i} className="grid grid-4" style={{ marginBottom: 12, gap: 8 }}>
                <input className="form-input" placeholder="Médicament" value={p.medicationName} onChange={e => updatePrescription(i, 'medicationName', e.target.value)} />
                <input className="form-input" placeholder="Dosage" value={p.dosage} onChange={e => updatePrescription(i, 'dosage', e.target.value)} />
                <input className="form-input" placeholder="Fréquence" value={p.frequency} onChange={e => updatePrescription(i, 'frequency', e.target.value)} />
                <input className="form-input" placeholder="Durée" value={p.duration} onChange={e => updatePrescription(i, 'duration', e.target.value)} />
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
                <input className="form-input" placeholder="Analyse" value={la.analysisName} onChange={e => updateLabAnalysis(i, 'analysisName', e.target.value)} />
                <input className="form-input" placeholder="Instructions" value={la.instructions} onChange={e => updateLabAnalysis(i, 'instructions', e.target.value)} />
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <button type="submit" className="btn btn-primary">Enregistrer la consultation</button>
            <button type="button" className="btn btn-outline" onClick={() => generateDoc('prescription')}>Générer ordonnance</button>
            <button type="button" className="btn btn-outline" onClick={() => generateDoc('certificate')}>Générer certificat</button>
          </div>
        </form>
      </div>
    </div>
  );
}
