import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import { Spinner } from './components/ui';

// Pages
import LoginPage          from './pages/LoginPage';
import DashboardPage      from './pages/DashboardPage';
import ClientsPage        from './pages/ClientsPage';
import ClientDetailPage   from './pages/ClientDetailPage';
import NewClientPage      from './pages/NewClientPage';
import ContratsPage       from './pages/ContratsPage';
import NewContratPage     from './pages/NewContratPage';
import ContratDetailPage  from './pages/ContratDetailPage';
import QuittancesPage     from './pages/QuittancesPage';
import SinistresPage      from './pages/SinistresPage';
import NewSinistrePage    from './pages/NewSinistrePage';
import SinistreDetailPage from './pages/SinistreDetailPage';
import ReportingPage      from './pages/ReportingPage';
import ParametresPage     from './pages/ParametresPage';

// Route guard
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

// Placeholder pages pour les routes futures
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-6 max-w-4xl mx-auto">
    <h1 className="text-2xl font-bold text-ink font-display">{title}</h1>
    <p className="text-ink-muted mt-2">Cette section est en cours de développement.</p>
  </div>
);

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"         element={<DashboardPage />} />

          {/* Clients */}
          <Route path="/clients"            element={<ClientsPage />} />
          <Route path="/clients/nouveau"    element={<NewClientPage />} />
          <Route path="/clients/:id"        element={<ClientDetailPage />} />
          <Route path="/clients/:id/modifier" element={<Placeholder title="Modifier client" />} />

          {/* Contrats */}
          <Route path="/contrats"           element={<ContratsPage />} />
          <Route path="/contrats/nouveau"   element={<NewContratPage />} />
          <Route path="/contrats/:id"       element={<ContratDetailPage />} />

          {/* Sinistres */}
          <Route path="/sinistres"          element={<SinistresPage />} />
          <Route path="/sinistres/nouveau"  element={<NewSinistrePage />} />
          <Route path="/sinistres/:id"      element={<SinistreDetailPage />} />

          {/* Paiements */}
          <Route path="/quittances"         element={<QuittancesPage />} />

          {/* Reporting */}
          <Route path="/reporting"          element={<ReportingPage />} />

          {/* Paramètres */}
          <Route path="/parametres"         element={<ParametresPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
