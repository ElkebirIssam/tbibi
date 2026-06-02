import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function PatientsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [allLinked, setAllLinked] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState('choose');
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState([]);
  const [form, setForm] = useState({});
  const [limit, setLimit] = useState(20);
  const [doctors, setDoctors] = useState([]);
  const [assurances, setAssurances] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (['doctor', 'assistant', 'nurse'].includes(user?.role)) {
      api.get('/patients/assurances/list').then(r => setAssurances(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/doctors/patients').then(r => {
        const data = Array.isArray(r.data) ? r.data : r.data.data || [];
        setAllLinked(data);
      }).catch(() => {});
    }
  }, [user, refreshKey]);

  useEffect(() => {
    if (search.length > 1) {
      const q = search.toLowerCase();
      const filtered = allLinked.filter(p =>
        p.first_name?.toLowerCase().includes(q) ||
        p.last_name?.toLowerCase().includes(q) ||
        p.patient_code?.toLowerCase().includes(q) ||
        p.national_id?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q)
      );
      setTotal(filtered.length);
      setPatients(filtered.slice((page - 1) * limit, page * limit));
    } else {
      setPatients(allLinked);
      setTotal(allLinked.length);
    }
  }, [search, page, limit, allLinked]);

  useEffect(() => {
    if (['assistant', 'nurse'].includes(user?.role)) {
      api.get('/patients/doctors?limit=-1').then(r => {
        setDoctors(Array.isArray(r.data) ? r.data : r.data.data || []);
      }).catch(() => {});
    }
  }, [user]);

  async function handleOpenDossier(patientId) {
    navigate(`/patients/${patientId}`);
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.post('/patients', form);
      setShowModal(false);
      setModalStep('choose');
      setForm({});
      setSearch('');
      setRefreshKey(k => k + 1);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <h2>👥 Patients</h2>
          {['assistant', 'nurse', 'doctor', 'super_admin'].includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setModalStep('choose'); setForm({}); setLinkSearch(''); setLinkResults([]); }}>+ Nouveau patient</button>
        )}
      </div>

      <div className="card">
        <div className="form-group">
          <input
            className="form-input"
            placeholder="Rechercher un patient (code, nom, carte d'identité, téléphone, email...)"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Nom</th>
                <th>CIN</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted">Aucun patient trouvé</td></tr>
              )}
              {patients.map(p => (
                <tr key={p.id}>
                  <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{p.patient_code}</code></td>
                  <td>{p.first_name} {p.last_name}</td>
                  <td>{p.national_id || '-'}</td>
                  <td>{p.email}</td>
                  <td>{p.phone}</td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => handleOpenDossier(p.id)}>Dossier</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setModalStep('choose'); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            {modalStep === 'choose' && (
              <>
                <h2>Nouveau patient</h2>
                <p className="text-muted mb-3">Comment souhaitez-vous ajouter un patient ?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button className="btn btn-outline" style={{ padding: '20px 16px', fontSize: 16, textAlign: 'left' }} onClick={() => setModalStep('link')}>
                    <strong>🔗 Lier un patient existant</strong>
                    <br /><span className="text-sm text-muted">Rechercher un patient déjà inscrit sur la plateforme et le lier à votre cabinet</span>
                  </button>
                  <button className="btn btn-primary" style={{ padding: '20px 16px', fontSize: 16, textAlign: 'left' }} onClick={() => setModalStep('create')}>
                    <strong>➕ Créer un nouveau patient</strong>
                    <br /><span className="text-sm" style={{ opacity: 0.8 }}>Ajouter un nouveau patient et créer son dossier</span>
                  </button>
                </div>
                <div className="modal-actions" style={{ marginTop: 16 }}>
                  <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setModalStep('choose'); }}>Annuler</button>
                </div>
              </>
            )}
            {modalStep === 'link' && (
              <>
                <div className="flex-between">
                  <h2>Lier un patient</h2>
                  <button className="btn btn-sm btn-outline" onClick={() => setModalStep('choose')}>← Retour</button>
                </div>
                <div className="form-group">
                  <input className="form-input" placeholder="Rechercher par nom, code, CIN, email, téléphone..." value={linkSearch} onChange={e => { setLinkSearch(e.target.value); if (e.target.value.length > 1) { const linkedIds = new Set(allLinked.map(p => p.id)); api.get(`/patients/search?q=${e.target.value}&limit=10`).then(r => { const all = r.data.data || []; setLinkResults(all.filter(p => !linkedIds.has(p.id))); }).catch(() => setLinkResults([])); } else { setLinkResults([]); } }} />
                </div>
                {linkResults.length > 0 && (
                  <div style={{ maxHeight: 280, overflowY: 'auto', marginTop: 8 }}>
                    {linkResults.map(p => (
                      <div key={p.id} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <strong>{p.first_name} {p.last_name}</strong>
                          <span className="text-sm text-muted" style={{ marginLeft: 8 }}>{p.patient_code}</span>
                          <br /><span className="text-sm">{p.email || p.phone}</span>
                        </div>
                        <button className="btn btn-sm btn-primary" onClick={async () => { try { await api.post('/doctors/assign-patient', { patientId: p.id }); setShowModal(false); setModalStep('choose'); setLinkSearch(''); setLinkResults([]); setSearch(''); setRefreshKey(k => k + 1); } catch (err) { alert(err.response?.data?.error || 'Erreur'); } }}>Lier</button>
                      </div>
                    ))}
                  </div>
                )}
                {linkSearch.length > 1 && linkResults.length === 0 && <p className="text-muted text-sm mt-2">Aucun patient trouvé.</p>}
              </>
            )}
            {modalStep === 'create' && (
              <>
                <div className="flex-between">
                  <h2>Nouveau patient</h2>
                  <button className="btn btn-sm btn-outline" onClick={() => setModalStep('choose')}>← Retour</button>
                </div>
                <form onSubmit={handleCreate}>
                  <div className="grid grid-2">
                    <div className="form-group">
                      <label>Prénom</label>
                      <input className="form-input" value={form.firstName || ''} onChange={e => setForm({...form, firstName: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>Nom</label>
                      <input className="form-input" value={form.lastName || ''} onChange={e => setForm({...form, lastName: e.target.value})} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" className="form-input" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Téléphone</label>
                    <input className="form-input" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} />
                  </div>
              <div className="form-group">
                <label>Carte d'identité (CIN)</label>
                <input className="form-input" value={form.nationalId || ''} onChange={e => setForm({...form, nationalId: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Assurance</label>
                <select className="form-select" value={form.insuranceProvider || ''} onChange={e => setForm({...form, insuranceProvider: e.target.value})}>
                  <option value="">Sélectionner...</option>
                  {assurances.map(a => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>
              {['assistant', 'nurse'].includes(user?.role) && doctors.length > 0 && (
                    <div className="form-group">
                      <label>Lier au médecin</label>
                      <select className="form-select" value={form.doctorId || ''} onChange={e => setForm({...form, doctorId: e.target.value})} required>
                        <option value="">Sélectionner...</option>
                        {doctors.map(d => (
                          <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name} - {d.specialization || 'Généraliste'}</option>
                        ))}
                      </select>
                      <p className="text-sm text-muted mt-1">Le patient sera automatiquement lié à ce médecin.</p>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Mot de passe</label>
                    <input type="password" className="form-input" value={form.password || ''} onChange={e => setForm({...form, password: e.target.value})} required minLength={6} />
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setModalStep('choose'); }}>Annuler</button>
                    <button type="submit" className="btn btn-primary">Créer</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
