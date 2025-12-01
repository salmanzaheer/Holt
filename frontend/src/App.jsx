import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Settings from "./pages/Settings";
import TwoFactorAuth from "./pages/TwoFactorAuth";
import Sharing from "./pages/Sharing";
import Passwords from "./pages/Passwords";
import Layout from "./components/Layout";

function PrivateRoute({ children, title }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return user ? (
    <Layout title={title}>{children}</Layout>
  ) : (
    <Navigate to="/login" />
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return user ? <Navigate to="/" /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PrivateRoute title="Dashboard">
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <PrivateRoute title="Upload">
            <Upload />
          </PrivateRoute>
        }
      />
      <Route
        path="/passwords"
        element={
          <PrivateRoute title="Password Vault">
            <Passwords />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute title="Settings">
            <Settings />
          </PrivateRoute>
        }
      />
      <Route
        path="/2fa"
        element={
          <PrivateRoute title="Two-Factor Authentication">
            <TwoFactorAuth />
          </PrivateRoute>
        }
      />
      <Route
        path="/sharing"
        element={
          <PrivateRoute title="Sharing">
            <Sharing />
          </PrivateRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
