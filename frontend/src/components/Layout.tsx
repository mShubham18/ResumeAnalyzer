import { BriefcaseBusiness, FileSearch, Home, LayoutDashboard, LogOut, Shield, FileText } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdmin } from "../context/AdminContext";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { name: "Home", path: "/app", icon: Home, adminOnly: false },
  { name: "Resume Analyzer", path: "/app/analyzer", icon: FileSearch, adminOnly: false },
  { name: "Dashboard", path: "/app/dashboard", icon: LayoutDashboard, adminOnly: false },
  { name: "Job Suggestions", path: "/app/jobs", icon: BriefcaseBusiness, adminOnly: false },
  { name: "Admin Analytics", path: "/app/admin", icon: Shield, adminOnly: true },
  { name: "Reports", path: "/app/admin/reports", icon: FileText, adminOnly: true },
];

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { admin, logout: adminLogout } = useAdmin();

  const handleLogout = async () => {
    if (admin) {
      await adminLogout();
    } else {
      await logout();
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="sidebar-head-row">
            <div>
              <h1 className="brand">Resume Analyzer AI</h1>
              <p className="subtitle">{admin ? "Admin Panel" : "AI Resume Intelligence"}</p>
            </div>
            <ThemeToggle compact />
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            // If admin logged in, ONLY show admin items
            if (admin && !item.adminOnly) {
              return null;
            }
            // If regular user, hide admin-only items
            if (!admin && item.adminOnly) {
              return null;
            }
            
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
          {admin ? (
            <>
              <p className="account-name">Administrator</p>
              <p className="account-email">{admin.email}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--accent-start)", marginTop: "0.25rem" }}>
                🛡️ Admin Access
              </p>
            </>
          ) : (
            <>
              <p className="account-name">{user?.full_name || "User"}</p>
              <p className="account-email">{user?.email || "-"}</p>
            </>
          )}
          <button className="btn btn-ghost" onClick={() => void handleLogout()}>
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
