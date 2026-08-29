import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import { Spinner } from './components/ui';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import NewClientPage from './pages/NewClientPage';
import ContratsPage from './pages/ContratsPage';
import NewContratPage from './pages/NewContratPage';
import ContratDetailPage from './pages/ContratDetailPage';
import QuittancesPage from './pages/QuittancesPage';
import SinistresPage from './pages/SinistresPage';
import NewSinistrePage from './pages/NewSinistrePage';
import SinistreDetailPage from './pages/SinistreDetailPage';
import ReportingPage from './pages/ReportingPage';
import ParametresPage from './pages/ParametresPage';
import NotificationsPage from './pages/NotificationsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !profile) navigate('/login', { replace: true });
  }, [profile, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface" role="status">
        <Spinner className="w-10 h-10 text-brand" />
      </div>
    );
  }
  return profile ? <>{children}</> : null;
}

/** Restrict to admin role (URL guard; sidebar already hides links). */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" role="status">
        <Spinner className="w-8 h-8 text-brand" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/nouveau" element={<NewClientPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />

          <Route path="/contrats" element={<ContratsPage />} />
          <Route path="/contrats/nouveau" element={<NewContratPage />} />
          <Route path="/contrats/:id" element={<ContratDetailPage />} />

          <Route path="/sinistres" element={<SinistresPage />} />
          <Route path="/sinistres/nouveau" element={<NewSinistrePage />} />
          <Route path="/sinistres/:id" element={<SinistreDetailPage />} />

          <Route path="/quittances" element={<QuittancesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          <Route
            path="/reporting"
            element={
              <AdminRoute>
                <ReportingPage />
              </AdminRoute>
            }
          />
          <Route
            path="/parametres"
            element={
              <AdminRoute>
                <ParametresPage />
              </AdminRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
