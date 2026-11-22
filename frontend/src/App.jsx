import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import HomeDashboard from './pages/HomeDashboard';
import CreateConferencePage from './pages/CreateConferencePage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import ChairDashboard from './pages/ChairDashboard';
import ReviewerDashboard from './pages/ReviewerDashboard';
import AuthorDashboard from './pages/AuthorDashboard';
import SubmitPaperPage from './pages/SubmitPaperPage';

function ProtectedRoute({ children, requireAdmin = false }) {
  const { currentUser, isSuperAdmin, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="sc-fullscreen-loader">
        <div className="sc-spinner" />
        <p>Loading ScholarConf...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />

          {/* Authenticated Dashboards & Forms */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <HomeDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-conference"
            element={
              <ProtectedRoute>
                <CreateConferencePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/conference/:conferenceId/chair"
            element={
              <ProtectedRoute>
                <ChairDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/conference/:conferenceId/reviewer"
            element={
              <ProtectedRoute>
                <ReviewerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/conference/:conferenceId/author"
            element={
              <ProtectedRoute>
                <AuthorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/conference/:conferenceId/submit"
            element={
              <ProtectedRoute>
                <SubmitPaperPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
