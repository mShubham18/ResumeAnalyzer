import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Filter } from "lucide-react";
import { fetchAdminReports } from "../lib/api";
import { useAdmin } from "../context/AdminContext";
import type { AdminReports } from "../types";

export default function AdminReportsPage() {
  const [reportsData, setReportsData] = useState<AdminReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const { admin } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!admin) {
      navigate("/admin-login");
      return;
    }
    loadReports();
  }, [admin, navigate]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (selectedYear) filters.year = selectedYear;
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedRole) filters.role = selectedRole;

      const data = await fetchAdminReports(filters);
      setReportsData(data);
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    loadReports();
  };

  const handleClearFilters = () => {
    setSelectedYear("");
    setSelectedCategory("");
    setSelectedRole("");
    setTimeout(() => loadReports(), 100);
  };

  const downloadCSV = () => {
    if (!reportsData?.records.length) return;

    const headers = [
      "ID",
      "Name",
      "Email",
      "Phone",
      "Owner Email",
      "Target Role",
      "Category",
      "LinkedIn",
      "GitHub",
      "ATS Score",
      "AI Score",
      "Model Used",
      "Created At",
    ];

    const csvRows = [
      headers.join(","),
      ...reportsData.records.map((record) =>
        [
          record.id,
          `"${record.name || ""}"`,
          record.email || "",
          record.phone || "",
          record.owner_email || "",
          `"${record.target_role || ""}"`,
          `"${record.target_category || ""}"`,
          record.linkedin || "",
          record.github || "",
          record.ats_score || "",
          record.ai_score || "",
          `"${record.model_used || ""}"`,
          record.created_at || "",
        ].join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `resume_reports_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!admin) {
    return null;
  }

  if (loading) {
    return (
      <section>
        <header className="page-head">
          <h2>Admin Reports</h2>
          <p>Loading reports data...</p>
        </header>
      </section>
    );
  }

  return (
    <section className="admin-reports">
      <header className="page-head">
        <h2>Admin Reports</h2>
        <p>Filter and export user resume data</p>
      </header>

      {/* Filters Section */}
      <div className="panel" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <Filter size={20} />
          <h3 style={{ margin: 0 }}>Filters</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500 }}>
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                background: "var(--surface-2)",
                color: "var(--text)",
              }}
            >
              <option value="">All Years</option>
              {reportsData?.filters.years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500 }}>
              Category/Field
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                background: "var(--surface-2)",
                color: "var(--text)",
              }}
            >
              <option value="">All Categories</option>
              {reportsData?.filters.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500 }}>
              Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                background: "var(--surface-2)",
                color: "var(--text)",
              }}
            >
              <option value="">All Roles</option>
              {reportsData?.filters.roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-primary" onClick={handleApplyFilters}>
            Apply Filters
          </button>
          <button className="btn btn-ghost" onClick={handleClearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3>
            Results ({reportsData?.records.length || 0} record{reportsData?.records.length !== 1 ? "s" : ""})
          </h3>
          <button
            className="btn btn-primary"
            onClick={downloadCSV}
            disabled={!reportsData?.records.length}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Download size={16} />
            Download CSV
          </button>
        </div>

        {reportsData?.records.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--line)", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem", fontWeight: 600 }}>Name</th>
                  <th style={{ padding: "0.75rem", fontWeight: 600 }}>Email</th>
                  <th style={{ padding: "0.75rem", fontWeight: 600 }}>Phone</th>
                  <th style={{ padding: "0.75rem", fontWeight: 600 }}>Category</th>
                  <th style={{ padding: "0.75rem", fontWeight: 600 }}>Role</th>
                  <th style={{ padding: "0.75rem", fontWeight: 600 }}>ATS Score</th>
                  <th style={{ padding: "0.75rem", fontWeight: 600 }}>AI Score</th>
                  <th style={{ padding: "0.75rem", fontWeight: 600 }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {reportsData.records.map((record) => (
                  <tr key={record.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "0.75rem" }}>{record.name || "-"}</td>
                    <td style={{ padding: "0.75rem" }}>{record.email || "-"}</td>
                    <td style={{ padding: "0.75rem" }}>{record.phone || "-"}</td>
                    <td style={{ padding: "0.75rem" }}>{record.target_category || "-"}</td>
                    <td style={{ padding: "0.75rem" }}>{record.target_role || "-"}</td>
                    <td style={{ padding: "0.75rem" }}>{record.ats_score ? `${record.ats_score}%` : "-"}</td>
                    <td style={{ padding: "0.75rem" }}>{record.ai_score ? `${record.ai_score}%` : "-"}</td>
                    <td style={{ padding: "0.75rem" }}>
                      {record.created_at ? new Date(record.created_at).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: "center", color: "var(--muted)", padding: "2rem" }}>
            No records found. Try adjusting your filters.
          </p>
        )}
      </div>
    </section>
  );
}
