import { useState, useEffect } from 'react';
import api from '../services/api';

export default function DossierPage() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    api.get('/patients/my-profile').then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="loading-screen">Chargement...</div>;

  const { patient, consultations, documents, invoices, prescriptions } = data;

  return (
    <div>
      <div className="card">
        <div>
          <h2>{patient.first_name} {patient.last_name}</h2>
          <p className="text-muted">{patient.email} | {patient.phone}</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {['info', 'consultations', 'prescriptions', 'documents', 'invoices'].map(tab => (
            <button
              key={tab}
              className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
              style={{
                borderRadius: 0, border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                margin: 0, padding: '16px 20px'
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'info' ? 'Informations' : tab === 'consultations' ? 'Consultations' : tab === 'prescriptions' ? 'Prescriptions' : tab === 'documents' ? 'Documents' : 'Factures'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'info' && (
        <div className="card">
          <div className="grid grid-2">
            <div><strong>Prénom:</strong> {patient.first_name}</div>
            <div><strong>Nom:</strong> {patient.last_name}</div>
            <div><strong>Email:</strong> {patient.email}</div>
            <div><strong>Téléphone:</strong> {patient.phone}</div>
            <div><strong>Date naissance:</strong> {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('fr-TN') : '-'}</div>
            <div><strong>Sexe:</strong> {patient.gender || '-'}</div>
            <div><strong>Groupe sanguin:</strong> {patient.blood_group || '-'}</div>
            <div><strong>Assurance:</strong> {patient.insurance_provider || '-'}</div>
            {patient.allergies && <div style={{ gridColumn: '1/3' }}><strong>Allergies:</strong> {patient.allergies}</div>}
          </div>
        </div>
      )}

      {activeTab === 'consultations' && (
        <div className="card">
          {consultations?.length === 0 ? (
            <p className="text-muted">Aucune consultation.</p>
          ) : (
            consultations?.map(c => (
              <div key={c.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="flex-between">
                  <div>
                    <strong>Dr. {c.doctor_first_name} {c.doctor_last_name}</strong>
                    <span className="text-muted text-sm" style={{ marginLeft: 10 }}>{c.specialization}</span>
                  </div>
                  <span className="text-sm">{new Date(c.created_at).toLocaleDateString('fr-TN')}</span>
                </div>
                {c.symptoms && <p className="mt-2"><strong>Symptômes:</strong> {c.symptoms}</p>}
                {c.diagnosis && <p><strong>Diagnostic:</strong> {c.diagnosis}</p>}
                {c.report && <p><strong>Rapport:</strong> {c.report}</p>}
                {c.prescribed_rest && <p><strong>Repos:</strong> {c.prescribed_rest}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'prescriptions' && (
        <div className="card">
          {prescriptions?.length === 0 ? (
            <p className="text-muted">Aucune prescription.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Médicament</th>
                    <th>Dosage</th>
                    <th>Durée</th>
                    <th>Instructions</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions?.map(p => (
                    <tr key={p.id}>
                      <td>{p.medication_name}</td>
                      <td>{p.dosage}</td>
                      <td>{p.duration}</td>
                      <td>{p.instructions || '-'}</td>
                      <td>{new Date(p.created_at).toLocaleDateString('fr-TN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card">
          {documents?.length === 0 ? (
            <p className="text-muted">Aucun document.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Titre</th>
                    <th>Médecin</th>
                    <th>Date</th>
                    <th>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {documents?.map(d => (
                    <tr key={d.id}>
                      <td><span className="badge badge-info">{d.type}</span></td>
                      <td>{d.title}</td>
                      <td>Dr. {d.doctor_first_name} {d.doctor_last_name}</td>
                      <td>{new Date(d.created_at).toLocaleDateString('fr-TN')}</td>
                      <td>
                        {d.pdf_url ? <a href={`http://localhost:5000/${d.pdf_url}`} target="_blank" className="btn btn-sm btn-outline">PDF</a> : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="card">
          {invoices?.length === 0 ? (
            <p className="text-muted">Aucune facture.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>N Facture</th>
                    <th>Montant</th>
                    <th>Total</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices?.map(inv => (
                    <tr key={inv.id}>
                      <td>{inv.invoice_number}</td>
                      <td>{inv.amount} TND</td>
                      <td><strong>{inv.total} TND</strong></td>
                      <td><span className={`badge badge-${inv.status === 'paid' ? 'success' : inv.status === 'cancelled' ? 'danger' : 'warning'}`}>{inv.status}</span></td>
                      <td>{new Date(inv.created_at).toLocaleDateString('fr-TN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
