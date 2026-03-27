import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { fetchAdminAnalytics } from "../lib/api";
import { useAdmin } from "../context/AdminContext";
import type { AdminAnalytics } from "../types";

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#a855f7",
  "#e11d48",
];

export default function AdminPage() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { admin } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!admin) {
      navigate("/admin-login");
      return;
    }

    const load = async () => {
      try {
        const data = await fetchAdminAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error("Failed to load analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [admin, navigate]);

  if (!admin) {
    return null;
  }

  if (loading) {
    return (
      <section>
        <header className="page-head">
          <h2>Admin Analytics</h2>
          <p>Loading analytics data...</p>
        </header>
      </section>
    );
  }

  if (!analytics) {
    return (
      <section>
        <header className="page-head">
          <h2>Admin Analytics</h2>
          <p>Failed to load analytics data.</p>
        </header>
      </section>
    );
  }

  const { overview, daily_uploads, category_distribution, top_roles, model_usage, scores_by_category, ai_job_roles } =
    analytics;

  return (
    <section className="admin-analytics">
      <header className="page-head">
        <h2>Admin Analytics Dashboard</h2>
        <p>System-wide statistics and insights</p>
      </header>

      {/* Overview Cards */}
      <div className="metrics-grid" style={{ marginBottom: "2rem" }}>
        <div className="metric-chip">
          <span>Total Resumes</span>
          <strong>{overview.total_resumes}</strong>
        </div>
        <div className="metric-chip">
          <span>Total Users</span>
          <strong>{overview.total_users}</strong>
        </div>
        <div className="metric-chip">
          <span>AI Analyses</span>
          <strong>{overview.total_analyses}</strong>
        </div>
        <div className="metric-chip">
          <span>Avg ATS Score</span>
          <strong>{overview.avg_ats_score}%</strong>
        </div>
        <div className="metric-chip">
          <span>Avg AI Score</span>
          <strong>{overview.avg_ai_score}%</strong>
        </div>
      </div>

      {/* Daily Uploads - Bar Chart */}
      <div className="panel" style={{ marginBottom: "2rem" }}>
        <h3>Daily Resume Uploads (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={daily_uploads}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#3b82f6" name="Uploads" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Two Column Layout for Pie Charts */}
      <div className="grid-2" style={{ marginBottom: "2rem" }}>
        {/* Category Distribution - Pie Chart */}
        <div className="panel">
          <h3>Resume Distribution by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={category_distribution}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {category_distribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* AI Model Usage - Pie Chart */}
        <div className="panel">
          <h3>AI Model Usage Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={model_usage}
                dataKey="count"
                nameKey="model"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {model_usage.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Job Roles - Bar Chart */}
      <div className="panel" style={{ marginBottom: "2rem" }}>
        <h3>Top 10 Job Roles</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={top_roles} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="role" type="category" width={150} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8b5cf6" name="Count" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Two Column Layout for Additional Charts */}
      <div className="grid-2" style={{ marginBottom: "2rem" }}>
        {/* Average Scores by Category - Bar Chart */}
        <div className="panel">
          <h3>Average ATS Scores by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scores_by_category}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avg_ats_score" fill="#10b981" name="Avg ATS Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Analyzed Job Roles - Bar Chart */}
        <div className="panel">
          <h3>Top AI Analyzed Job Roles</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ai_job_roles}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="role" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#ec4899" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
