import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import '@/index.css';

const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const MemberDashboardPage = lazy(() => import('@/pages/MemberDashboardPage').then(m => ({ default: m.MemberDashboardPage })));

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<AppLoadingScreen />}>
        <LoginPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/login/:memberId",
    element: (
      <Suspense fallback={<AppLoadingScreen />}>
        <LoginPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/admin/dashboard",
    element: (
      <ProtectedRoute allowedRole="admin">
        <Suspense fallback={<AppLoadingScreen />}>
          <AdminDashboardPage />
        </Suspense>
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/member/dashboard",
    element: (
      <ProtectedRoute allowedRole="member">
        <Suspense fallback={<AppLoadingScreen />}>
          <MemberDashboardPage />
        </Suspense>
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
  },
]);

const rootEl = document.getElementById('root')!;
const appLoader = document.getElementById('app-loader');

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);

if (appLoader) {
  appLoader.remove();
}
