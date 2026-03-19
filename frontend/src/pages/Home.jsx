import { ArrowRight, BarChart2, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="home-container">
      <div className="page-header hero-header">
        <h1 className="page-title animate-fade-in">Smart AI Resume Analyzer</h1>
        <p className="page-subtitle animate-fade-in" style={{ animationDelay: '0.1s' }}>
          Your Intelligent Career Partner for ATS-Optimized Resumes.
        </p>
        
        <div style={{ marginTop: '2rem', animationDelay: '0.2s' }} className="animate-fade-in">
          <Link to="/analyzer" className="btn btn-primary">
            Analyze Resume <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '4rem' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}><Shield size={36} /></div>
          <h3>ATS Compatibility Score</h3>
          <p className="text-muted">Ensure your resume effortlessly passes through Applicant Tracking Systems.</p>
        </div>
        
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ color: 'var(--secondary)', marginBottom: '1rem' }}><BarChart2 size={36} /></div>
          <h3>Keyword Gap Analysis</h3>
          <p className="text-muted">Identify missing vital keywords and skills compared to target roles.</p>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ color: 'var(--accent)', marginBottom: '1rem' }}><Zap size={36} /></div>
          <h3>AI Optimization Engine</h3>
          <p className="text-muted">Get real-time feedback and smart content enhancement suggestions.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
