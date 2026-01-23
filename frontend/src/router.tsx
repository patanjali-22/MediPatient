import { createBrowserRouter, redirect } from 'react-router-dom';
import { AppShell } from './ui/AppShell';
import { LoginPage } from './ui/LoginPage';
import { PatientsPage } from './ui/PatientsPage';
import { DashboardPage } from './ui/DashboardPage';
import { BillingPage } from './ui/BillingPage';
import { AnalyticsPage } from './ui/AnalyticsPage';
import { authStore } from './ui/authStore';

function requireAuth() {
  if (!authStore.getToken()) {
    throw redirect('/login');
  }
  return null;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        loader: () => redirect('/dashboard'),
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'dashboard',
        loader: requireAuth,
        element: <DashboardPage />,
      },
      {
        path: 'patients',
        loader: requireAuth,
        element: <PatientsPage />,
      },
      {
        path: 'billing',
        loader: requireAuth,
        element: <BillingPage />,
      },
      {
        path: 'analytics',
        loader: requireAuth,
        element: <AnalyticsPage />,
      },
    ],
  },
]);
