const Builder = () => {
  return (
    <div className="builder-container">
      <div className="page-header">
        <h1 className="page-title">Resume Builder</h1>
        <p className="page-subtitle">Dynamically craft and edit your resume templates.</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 200px)' }}>
        {/* Editor Form View - Left Pane */}
        <div className="glass-panel" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
           <h3>Personal Information</h3>
           <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
              <input type="text" placeholder="Full Name" style={{ 
                width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' 
              }} />
              <input type="email" placeholder="Email" style={{ 
                width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' 
              }} />
              <input type="text" placeholder="Job Title" style={{ 
                width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' 
              }} />
           </div>
           
           <h3 style={{ marginTop: '2rem' }}>Experience</h3>
           <button className="btn btn-secondary" style={{ marginTop: '1rem', width: '100%' }}>+ Add Experience</button>
        </div>

        {/* Live Preview View - Right Pane */}
        <div className="glass-panel" style={{ flex: 1, padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <h3>Live Preview</h3>
              <p>Your beautiful resume will format live here.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Builder;
