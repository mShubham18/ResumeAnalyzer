import { FormEvent, ReactElement, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { analyzeWithAi, fetchJobRoles, uploadResume } from "../lib/api";
import type { AiAnalysis, JobListing, JobRolesMap, ResumeAnalysis } from "../types";

function toDebugMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const serverDetail = (error.response?.data as { detail?: string } | undefined)?.detail;
    return serverDetail || error.message || "Request failed";
  }
  return error instanceof Error ? error.message : "Request failed";
}

function SummaryScore({ label, score }: { label: string; score: number }) {
  return (
    <div className="metric-chip">
      <span>{label}</span>
      <strong>{Math.round(score)}%</strong>
    </div>
  );
}

function cleanInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function renderReport(report: string) {
  const lines = (report || "").split("\n");
  const blocks: ReactElement[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) {
      return;
    }
    blocks.push(
      <ul key={`list-${blocks.length}`}>
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{cleanInlineMarkdown(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      listItems.push(line.slice(2));
      continue;
    }

    flushList();

    if (line.startsWith("### ")) {
      blocks.push(<h4 key={`h4-${blocks.length}`}>{cleanInlineMarkdown(line.slice(4))}</h4>);
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(<h3 key={`h3-${blocks.length}`}>{cleanInlineMarkdown(line.slice(3))}</h3>);
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(<h2 key={`h2-${blocks.length}`}>{cleanInlineMarkdown(line.slice(2))}</h2>);
      continue;
    }

    blocks.push(<p key={`p-${blocks.length}`}>{cleanInlineMarkdown(line)}</p>);
  }

  flushList();
  return blocks;
}

export default function AnalyzerPage() {
  const [rolesMap, setRolesMap] = useState<JobRolesMap>({});
  const [category, setCategory] = useState("");
  const [role, setRole] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [standardAnalysis, setStandardAnalysis] = useState<ResumeAnalysis | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [suggestedJobs, setSuggestedJobs] = useState<JobListing[]>([]);
  const [loadingStandard, setLoadingStandard] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [debugError, setDebugError] = useState("");

  useEffect(() => {
    const loadRoles = async () => {
      const roles = await fetchJobRoles();
      setRolesMap(roles);
      const firstCategory = Object.keys(roles)[0] || "";
      setCategory(firstCategory);
      const firstRole = firstCategory ? Object.keys(roles[firstCategory] || {})[0] || "" : "";
      setRole(firstRole);
    };
    void loadRoles();
  }, []);

  const categories = useMemo(() => Object.keys(rolesMap), [rolesMap]);
  const roles = useMemo(() => (category ? Object.keys(rolesMap[category] || {}) : []), [category, rolesMap]);

  const submitStandard = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      return;
    }
    const requestStamp = Date.now();
    setDebugError("");
    setLoadingStandard(true);
    try {
      console.log("[Analyzer][upload] start", {
        requestStamp,
        fileName: file.name,
        fileSize: file.size,
        category,
        role,
      });
      const result = await uploadResume({ file, target_category: category, target_role: role });
      console.log("[Analyzer][upload] success", {
        requestStamp,
        hasText: Boolean(result.text),
        textLength: result.text?.length || 0,
        hasAnalytics: Boolean(result.analytics),
        hasAi: Boolean(result.ai_analysis),
        suggestedJobs: result.suggested_jobs?.length || 0,
      });
      setStandardAnalysis(result.analytics);
      setResumeText(result.text);
      setAiAnalysis(result.ai_analysis || null);
      setSuggestedJobs(result.suggested_jobs || []);
    } catch (error: unknown) {
      const message = toDebugMessage(error);
      console.error("[Analyzer][upload] failed", { requestStamp, error });
      setDebugError(message);
    } finally {
      setLoadingStandard(false);
    }
  };

  const submitAi = async () => {
    if (!resumeText.trim()) {
      return;
    }
    const requestStamp = Date.now();
    setDebugError("");
    setLoadingAi(true);
    try {
      console.log("[Analyzer][ai] start", {
        requestStamp,
        textLength: resumeText.length,
        category,
        role,
      });
      const result = await analyzeWithAi({
        resume_text: resumeText,
        target_category: category,
        target_role: role,
      });
      console.log("[Analyzer][ai] success", {
        requestStamp,
        hasAnalysis: Boolean(result.analysis),
        score: result.analysis?.score,
      });
      setAiAnalysis(result.analysis);
    } catch (error: unknown) {
      const message = toDebugMessage(error);
      console.error("[Analyzer][ai] failed", { requestStamp, error });
      setDebugError(message);
    } finally {
      setLoadingAi(false);
    }
  };

  const downloadReport = () => {
    if (!aiAnalysis) {
      return;
    }
    const standardLines = standardAnalysis
      ? [
          `ATS Score: ${Math.round(standardAnalysis.ats_score || 0)}%`,
          `Keyword Match: ${Math.round(standardAnalysis.keyword_match?.score || 0)}%`,
          `Format Score: ${Math.round(standardAnalysis.format_score || 0)}%`,
          `Section Score: ${Math.round(standardAnalysis.section_score || 0)}%`,
        ]
      : [];
    const report = [
      "Resume Analyzer AI Report",
      `Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
      `Target Category: ${category}`,
      `Target Role: ${role}`,
      "",
      "Standard Analysis",
      ...standardLines,
      "",
      "AI Analysis",
      `Resume Score: ${Math.round(aiAnalysis.score || 0)}%`,
      `ATS Score: ${Math.round(aiAnalysis.ats_score || 0)}%`,
      "",
      aiAnalysis.full_response || "",
    ].join("\n");

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resume-ai-report-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section>
      <header className="page-head">
        <h2>Resume Analyzer</h2>
        <p>Upload once to run ATS checks and detailed AI analysis for your selected role.</p>
      </header>

      <div className="panel">
        {debugError ? <div className="error-banner">Debug: {debugError}</div> : null}
        <div className="inline-fields">
          <label>
            Category
            <select
              value={category}
              onChange={(e) => {
                const nextCategory = e.target.value;
                setCategory(nextCategory);
                const nextRole = Object.keys(rolesMap[nextCategory] || {})[0] || "";
                setRole(nextRole);
              }}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <form className="form-grid" onSubmit={submitStandard}>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={loadingStandard}>
            {loadingStandard ? "Analyzing with our AI Model" : "Analyze Resume"}
          </button>
        </form>

        <div className="form-grid refined-form">
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={8}
            placeholder="Resume text appears here after upload, or paste text manually to re-run AI analysis"
          />
          <div className="action-row">
            <button className="btn btn-secondary" type="button" onClick={submitAi} disabled={loadingAi}>
              {loadingAi ? "Analyzing with our AI Model" : "Re-run AI Analysis"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={downloadReport} disabled={!aiAnalysis}>
              Download Report
            </button>
          </div>
        </div>
      </div>

      {standardAnalysis ? (
        <div className="result-stack">
          <h3>Standard Analysis</h3>
          <div className="metrics-grid">
            <SummaryScore label="ATS Score" score={standardAnalysis.ats_score || 0} />
            <SummaryScore label="Keyword Match" score={standardAnalysis.keyword_match?.score || 0} />
            <SummaryScore label="Format" score={standardAnalysis.format_score || 0} />
            <SummaryScore label="Sections" score={standardAnalysis.section_score || 0} />
          </div>
          <div className="panel">
            <h4>Missing Skills</h4>
            <p>{standardAnalysis.keyword_match?.missing_skills?.join(", ") || "None"}</p>
            <h4>Suggestions</h4>
            <ul>
              {(standardAnalysis.suggestions || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {aiAnalysis ? (
        <div className="result-stack">
          <h3>AI Analysis</h3>
          <div className="metrics-grid">
            <SummaryScore label="Resume Score" score={aiAnalysis.score || 0} />
            <SummaryScore label="ATS Score" score={aiAnalysis.ats_score || 0} />
          </div>
          <div className="panel">
            {aiAnalysis.error ? <p>{aiAnalysis.error}</p> : null}
            <h4>Strengths</h4>
            <ul>
              {(aiAnalysis.strengths || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h4>Areas for Improvement</h4>
            <ul>
              {(aiAnalysis.weaknesses || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h4>Detailed Report</h4>
            <div className="analysis-report markdown-report">
              {renderReport(aiAnalysis.full_response || "No report available")}
            </div>
          </div>
        </div>
      ) : null}

      {suggestedJobs.length ? (
        <div className="result-stack">
          <h3>Suggested Jobs To Apply</h3>
          <div className="jobs-grid">
            {suggestedJobs.map((job) => (
              <article key={`${job.source}-${job.id}`} className="panel job-card">
                <h4>{job.title}</h4>
                <p className="muted">{job.company}</p>
                <p>
                  {job.location} {job.job_type ? `• ${job.job_type}` : ""}
                </p>
                <a href={job.url} target="_blank" rel="noreferrer" className="job-link">
                  Open Job
                </a>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
