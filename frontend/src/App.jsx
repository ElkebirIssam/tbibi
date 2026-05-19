import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import PatientsPage from './pages/PatientsPage';
import PatientDetail from './pages/PatientDetail';
import ConsultationsPage from './pages/ConsultationsPage';
import MessagesPage from './pages/MessagesPage';
import InvoicesPage from './pages/InvoicesPage';
import CaissePage from './pages/CaissePage';
import SubscriptionPage from './pages/SubscriptionPage';
import FindDoctorPage from './pages/FindDoctorPage';
import AdminUsers from './pages/AdminUsers';
import AdminPayments from './pages/AdminPayments';
import AssistantsPage from './pages/AssistantsPage';
import ProfilePage from './pages/ProfilePage';
import SpecializationsPage from './pages/SpecializationsPage';
import DossierPage from './pages/DossierPage';
import NotificationsPage from './pages/NotificationsPage';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Chargement...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="patients" element={<PrivateRoute roles={['doctor', 'assistant', 'nurse', 'super_admin']}><PatientsPage /></PrivateRoute>} />
        <Route path="patients/:id" element={<PatientDetail />} />
        <Route path="consultations" element={<PrivateRoute roles={['doctor']}><ConsultationsPage /></PrivateRoute>} />
        <Route path="assistants" element={<PrivateRoute roles={['doctor']}><AssistantsPage /></PrivateRoute>} />
        <Route path="messagerie" element={<MessagesPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="trouver-medecin" element={<FindDoctorPage />} />
        <Route path="invoices" element={<PrivateRoute roles={['doctor', 'assistant', 'nurse', 'super_admin']}><InvoicesPage /></PrivateRoute>} />
        <Route path="caisse" element={<PrivateRoute roles={['doctor', 'assistant', 'nurse', 'super_admin']}><CaissePage /></PrivateRoute>} />
        <Route path="subscription" element={<PrivateRoute roles={['doctor']}><SubscriptionPage /></PrivateRoute>} />
        <Route path="admin/users" element={<PrivateRoute roles={['super_admin']}><AdminUsers /></PrivateRoute>} />
        <Route path="admin/payments" element={<PrivateRoute roles={['super_admin']}><AdminPayments /></PrivateRoute>} />
        <Route path="admin/specializations" element={<PrivateRoute roles={['super_admin']}><SpecializationsPage /></PrivateRoute>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="dossier" element={<PrivateRoute roles={['patient']}><DossierPage /></PrivateRoute>} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
