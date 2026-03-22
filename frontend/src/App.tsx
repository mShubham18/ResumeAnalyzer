import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AnalyzerPage from "./pages/Analyzer";
import AuthPage from "./pages/Auth";
import DashboardPage from "./pages/Dashboard";
import HomePage from "./pages/Home";
import LandingPage from "./pages/Landing";
import JobsPage from "./pages/Jobs";
import "./App.css";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/app" element={<HomePage />} />
                <Route path="/app/analyzer" element={<AnalyzerPage />} />
                <Route path="/app/dashboard" element={<DashboardPage />} />
                <Route path="/app/jobs" element={<JobsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
