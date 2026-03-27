import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register } = useAuth();
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();

    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        await register(fullName, email, password);
      } else {
        await login(email, password);
      }
      navigate("/app/dashboard");
    } catch (submitError: unknown) {
      const message = submitError instanceof Error ? submitError.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-info-card">
          <p className="eyebrow">Resume Analyzer AI</p>
          <h2>From first upload to final application, keep everything in one workspace.</h2>
          <ul>
            <li>Role-specific ATS and AI analysis</li>
            <li>Personal dashboard with session-linked history</li>
            <li>Job suggestions with direct apply links</li>
          </ul>
          <Link to="/" className="auth-back-link">Back to Landing</Link>
        </aside>

        <div className="auth-card">
          <div className="auth-card-head">
            <h2>{mode === "login" ? "Welcome Back" : "Create Account"}</h2>
            <ThemeToggle compact />
          </div>
          <p className="muted">{mode === "login" ? "Sign in to continue your analysis workflow." : "Create your account and start improving your resume."}</p>

          <div className="auth-mode-row">
            <button
              type="button"
              className={`auth-mode-chip ${mode === "login" ? "active" : ""}`}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-mode-chip ${mode === "register" ? "active" : ""}`}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Register
            </button>
          </div>

          <form onSubmit={onSubmit} className="form-grid auth-form-grid">
            {mode === "register" ? (
              <label>
                Full Name
                <input name="fullName" placeholder="Enter your full name" required />
              </label>
            ) : null}
            <label>
              Email
              <input name="email" type="email" placeholder="you@example.com" required />
            </label>
            <label>
              Password
              <input name="password" type="password" placeholder="Minimum 8 characters" minLength={8} required />
            </label>

            {error ? <div className="error-banner">{error}</div> : null}

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <button
            className="switch-mode"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
          </button>

          <div style={{ marginTop: "1rem", textAlign: "center", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
            <Link to="/admin-login" style={{ color: "var(--muted)", fontSize: "0.875rem", textDecoration: "none" }}>
              🛡️ Admin Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
