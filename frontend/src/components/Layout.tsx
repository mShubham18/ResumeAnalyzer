import { BriefcaseBusiness, FileSearch, Home, LayoutDashboard, LogOut } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { name: "Home", path: "/app", icon: Home },
  { name: "Resume Analyzer", path: "/app/analyzer", icon: FileSearch },
  { name: "Dashboard", path: "/app/dashboard", icon: LayoutDashboard },
  { name: "Job Suggestions", path: "/app/jobs", icon: BriefcaseBusiness },
];

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="sidebar-head-row">
            <div>
              <h1 className="brand">Resume Analyzer AI</h1>
              <p className="subtitle">AI Resume Intelligence</p>
            </div>
            <ThemeToggle compact />
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={`nav-item ${active ? "active" : ""}`}>
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="account-card">
          <p className="account-name">{user?.full_name || "User"}</p>
          <p className="account-email">{user?.email || "-"}</p>
          <button className="btn btn-ghost" onClick={() => void logout()}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  );
}
