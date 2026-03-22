import { useEffect, useState } from "react";
import { fetchDashboardSummary, fetchRecentSubmissions } from "../lib/api";
import type { DashboardSummary, RecentSubmission } from "../types";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recent, setRecent] = useState<RecentSubmission[]>([]);

  useEffect(() => {
    const load = async () => {
      const [summaryData, recentData] = await Promise.all([
        fetchDashboardSummary(),
        fetchRecentSubmissions(),
      ]);
      setSummary(summaryData);
      setRecent(recentData);
    };
    void load();
  }, []);

  const formatDateToIST = (value: string) => {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTimeToIST = (value: string) => {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <section>
      <header className="page-head">
        <h2>Dashboard</h2>
        <p>Your personal resume and AI analysis metrics.</p>
      </header>

      <div className="metrics-grid">
        <div className="metric-chip">
          <span>Total Resumes</span>
          <strong>{summary?.total_resumes || 0}</strong>
        </div>
        <div className="metric-chip">
          <span>Average ATS</span>
          <strong>{summary?.average_ats_score || 0}%</strong>
        </div>
        <div className="metric-chip">
          <span>AI Analyses</span>
          <strong>{summary?.ai_stats?.total_analyses || 0}</strong>
        </div>
        <div className="metric-chip">
          <span>AI Avg Score</span>
          <strong>{summary?.ai_stats?.average_score || 0}%</strong>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Top Roles</h3>
          <ul>
            {(summary?.top_roles || []).map((item) => (
              <li key={item.role}>
                {item.role}: {item.count}
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <h3>Daily Submissions (14 days • IST)</h3>
          <ul>
            {(summary?.daily_submissions || []).map((item) => (
              <li key={item.date}>
                {formatDateToIST(item.date)}: {item.count}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel">
        <h3>Recent Submissions</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>ATS</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr key={row.id}>
                  <td>{row.name || "-"}</td>
                  <td>{row.email || "-"}</td>
                  <td>{row.target_role || "-"}</td>
                  <td>{Math.round(row.ats_score || 0)}%</td>
                  <td>{formatDateTimeToIST(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
