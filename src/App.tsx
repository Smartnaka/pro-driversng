import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminDashboard } from './pages/AdminDashboard';
import { BookingPage } from './pages/BookingPage';
import { CarDetailsPage } from './pages/CarDetailsPage';
import { CarsPage } from './pages/CarsPage';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { DriverProfilePage } from './pages/DriverProfilePage';
import { DriversPage } from './pages/DriversPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20">
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex min-h-screen flex-col bg-white text-slate-900">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/drivers" element={<DriversPage />} />
              <Route path="/drivers/:id" element={<DriverProfilePage />} />
              <Route path="/cars" element={<CarsPage />} />
              <Route path="/cars/:id" element={<CarDetailsPage />} />
              <Route path="/book" element={<BookingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/driver"
                element={
                  <ProtectedRoute allowedRoles={['DRIVER', 'ADMIN']}>
                    <DriverDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/owner"
                element={
                  <ProtectedRoute allowedRoles={['VEHICLE_OWNER', 'ADMIN']}>
                    <OwnerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
