import { MotionConfig } from 'motion/react';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { RequireCompany, RequirePermission } from './components/layout/guards';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { canManageUsers } from './lib/permissions';
import Login from './pages/Login';

// Páginas internas carregadas sob demanda: o login não baixa gráficos nem tabelas.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Attendances = lazy(() => import('./pages/Attendances'));
const Patients = lazy(() => import('./pages/Patients'));
const PatientDetails = lazy(() => import('./pages/PatientDetails'));
const Places = lazy(() => import('./pages/Places'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));
const SelectCompany = lazy(() => import('./pages/SelectCompany'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageFallback() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }} aria-busy="true" aria-label="Carregando">
      <span className="skeleton" style={{ width: 160, height: 12 }} />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/select-company" element={<SelectCompany />} />
        <Route
          element={
            <RequireCompany>
              <AppLayout />
            </RequireCompany>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attendances" element={<Attendances />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/patients/:id" element={<PatientDetails />} />
          <Route path="/places" element={<Places />} />
          <Route path="/reports" element={<Reports />} />
          <Route
            path="/users"
            element={
              <RequirePermission check={canManageUsers}>
                <Users />
              </RequirePermission>
            }
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Providers>
        <AppRoutes />
      </Providers>
    </BrowserRouter>
  );
}
