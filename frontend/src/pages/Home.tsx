import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <section>
      <div className="hero">
        <p className="eyebrow">Resume Analyzer AI</p>
        <h1>Welcome back. Let’s optimize your resume and job search.</h1>
        <p>
          Run a complete analysis workflow and track your personal progress from a single dashboard.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/app/analyzer">
            Start Resume Analysis
          </Link>
          <Link className="btn btn-secondary" to="/app/jobs">
            Explore Job Suggestions
          </Link>
        </div>
      </div>
    </section>
  );
}
