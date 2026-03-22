import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

export default function LandingPage() {
  return (
    <div className="lp-wrap">
      <header className="lp-header">
        <div className="lp-brand">Resume Analyzer AI</div>
        <nav className="lp-nav">
          <a href="#services">Services</a>
          <a href="#process">Process</a>
          <a href="#features">Features</a>
          <a href="#tracks">Role Tracks</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="lp-actions">
          <ThemeToggle compact />
          <Link className="btn btn-secondary" to="/auth?mode=login">Sign In</Link>
          <Link className="btn btn-primary" to="/auth?mode=register">Start Free</Link>
        </div>
      </header>

      <main className="lp-main">
        <section className="lp-hero">
          <article className="lp-primary-card">
            <p className="lp-eyebrow">Career Strategy Platform</p>
            <h1>Find a better role with a resume that is built to win interviews.</h1>
            <p className="lp-lead">
              We combine role-specific ATS intelligence, detailed AI review, and live hiring opportunities
              into one workflow that feels like a real career design studio.
            </p>
            <div className="lp-hero-actions">
              <Link className="btn btn-primary" to="/auth?mode=register">Compare My Resume</Link>
              <Link className="btn btn-secondary" to="/auth?mode=login">Go to Workspace</Link>
            </div>

            <div className="lp-stats-row">
              <div>
                <p className="lp-stat-number">95%</p>
                <p className="lp-stat-label">Positive feedback</p>
              </div>
              <div>
                <p className="lp-stat-number">2.5K+</p>
                <p className="lp-stat-label">Resumes analyzed</p>
              </div>
              <div>
                <p className="lp-stat-number">38%</p>
                <p className="lp-stat-label">ATS score uplift</p>
              </div>
            </div>
          </article>

          <aside className="lp-insight-rail">
            <h3>What You Improve In One Session</h3>
            <div className="lp-insight-item">
              <p className="lp-insight-title">Keyword Coverage</p>
              <p className="lp-insight-copy">Identify and fix role-critical keywords missing in your resume.</p>
            </div>
            <div className="lp-insight-item">
              <p className="lp-insight-title">Section Quality</p>
              <p className="lp-insight-copy">Strengthen summaries, experience bullets, and measurable impact.</p>
            </div>
            <div className="lp-insight-item">
              <p className="lp-insight-title">Application Clarity</p>
              <p className="lp-insight-copy">Get a clean action plan before applying to new openings.</p>
            </div>

            <div className="lp-mini-kpis">
              <div>
                <strong>12 min</strong>
                <span>average analysis time</span>
              </div>
              <div>
                <strong>7+</strong>
                <span>targeted suggestions per run</span>
              </div>
            </div>
          </aside>
        </section>

        <section id="services" className="lp-section">
          <h2>Services</h2>
          <div className="lp-feature-grid">
            <article className="lp-feature-card">
              <h3>ATS Precision Audit</h3>
              <p>Section scoring, keyword gaps, formatting checks, and immediate fix guidance.</p>
            </article>
            <article className="lp-feature-card">
              <h3>AI Review Studio</h3>
              <p>Deep narrative feedback tailored to your target role and domain expectations.</p>
            </article>
            <article className="lp-feature-card">
              <h3>Hiring Radar</h3>
              <p>Role and location specific listings with direct apply links and priority ranking.</p>
            </article>
          </div>
        </section>

        <section id="process" className="lp-section lp-process-wrap">
          <h2>Process</h2>
          <div className="lp-process-row">
            <article className="lp-process-item">
              <span>01</span>
              <h3>Upload and Profile</h3>
              <p>Bring your resume and choose the exact role path you want to target.</p>
            </article>
            <article className="lp-process-item">
              <span>02</span>
              <h3>Analyze and Refine</h3>
              <p>Get ATS and AI insights, then iterate with focused action points.</p>
            </article>
            <article className="lp-process-item">
              <span>03</span>
              <h3>Apply with Confidence</h3>
              <p>Export your report and apply to matching opportunities immediately.</p>
            </article>
          </div>
        </section>

        <section id="features" className="lp-section">
          <h2>Features</h2>
          <div className="lp-mosaic">
            <article className="lp-mosaic-main">
              <h3>Single command center for resume growth</h3>
              <p>
                Analyzer, dashboard, and job discovery connect in one place so each new insight turns into
                a practical next step.
              </p>
            </article>
            <article className="lp-mosaic-card">
              <h3>Session-private dashboard</h3>
              <p>Only your own analyses and progress metrics are visible in your account.</p>
            </article>
            <article className="lp-mosaic-card">
              <h3>Exportable report</h3>
              <p>Download your final analysis and use it as your personalized improvement checklist.</p>
            </article>
          </div>
        </section>

        <section id="tracks" className="lp-section">
          <h2>Role Tracks</h2>
          <div className="lp-track-grid">
            <article className="lp-track-card">
              <h3>Software Development</h3>
              <p>Frontend, backend, full-stack, and devops role paths with targeted improvement prompts.</p>
            </article>
            <article className="lp-track-card">
              <h3>Data & Analytics</h3>
              <p>Data analyst and BI-focused scoring across SQL, dashboards, and project narrative quality.</p>
            </article>
            <article className="lp-track-card">
              <h3>Product & Operations</h3>
              <p>Role-fit analysis for product, business ops, and cross-functional problem-solving profiles.</p>
            </article>
            <article className="lp-track-card">
              <h3>Design & Creative</h3>
              <p>Portfolio clarity, project storytelling, and ATS readability for design-oriented roles.</p>
            </article>
          </div>
        </section>

        <section className="lp-section lp-outcome-section">
          <h2>Outcomes You Can Expect</h2>
          <div className="lp-outcome-grid">
            <article>
              <h3>Clear priority list</h3>
              <p>Know exactly what to edit first instead of guessing where your resume is weak.</p>
            </article>
            <article>
              <h3>Role-aligned wording</h3>
              <p>Use language that mirrors job descriptions while still sounding authentic and human.</p>
            </article>
            <article>
              <h3>Faster applications</h3>
              <p>Move from analysis to real applications with better confidence and fewer revisions.</p>
            </article>
          </div>
        </section>

        <section id="faq" className="lp-section">
          <h2>Frequently Asked Questions</h2>
          <div className="lp-faq-list">
            <article>
              <h3>Do I need to paste my resume manually?</h3>
              <p>No. Upload PDF or DOCX directly. You can still edit the extracted text before re-running AI analysis.</p>
            </article>
            <article>
              <h3>Can I track my progress over time?</h3>
              <p>Yes. Your dashboard keeps your own analysis history and scores, scoped to your logged-in account.</p>
            </article>
            <article>
              <h3>Will I get job opportunities too?</h3>
              <p>Yes. The job module suggests role-relevant listings with direct apply links based on your search.</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <p>Resume Analyzer AI • Your resume strategy workspace from first upload to final application.</p>
      </footer>
    </div>
  );
}
