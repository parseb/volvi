import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { VincentProvider } from '@lit-protocol/vincent-app-sdk/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vincentConfig } from './config/vincent';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { useVincent } from './hooks/useVincent';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useVincent();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/callback" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <VincentProvider {...vincentConfig}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </VincentProvider>
    </QueryClientProvider>
  );
}
