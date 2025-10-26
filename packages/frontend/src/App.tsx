import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

const queryClient = new QueryClient();

// Temporary: Skip auth check until Vincent SDK is properly configured
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // TODO: Re-enable auth check when Vincent SDK is fixed
  // const { isAuthenticated } = useVincent();
  // if (!isAuthenticated) {
  //   return <Navigate to="/" replace />;
  // }
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
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
