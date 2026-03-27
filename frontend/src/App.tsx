import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AdminProvider } from "./context/AdminContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AdminPage from "./pages/Admin";
import AdminReportsPage from "./pages/AdminReports";
import AnalyzerPage from "./pages/Analyzer";
import AuthPage from "./pages/Auth";
import DashboardPage from "./pages/Dashboard";
import HomePage from "./pages/Home";
import LandingPage from "./pages/Landing";
import JobsPage from "./pages/Jobs";
import AdminLoginPage from "./pages/AdminLogin";
import "./App.css";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/admin-login" element={<AdminLoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/app" element={<HomePage />} />
                  <Route path="/app/analyzer" element={<AnalyzerPage />} />
                  <Route path="/app/dashboard" element={<DashboardPage />} />
                  <Route path="/app/jobs" element={<JobsPage />} />
                </Route>
              </Route>
              {/* Admin-only route */}
              <Route path="/app/admin" element={<Layout />}>
                <Route index element={<AdminPage />} />
              </Route>
              <Route path="/app/admin/reports" element={<Layout />}>
                <Route index element={<AdminReportsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </BrowserRouter>
        </AdminProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
