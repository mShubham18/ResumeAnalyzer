import { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

const Analyzer = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Assuming FastAPI runs on 8000
      const response = await axios.post('http://localhost:8000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to analyze resume. Make sure the API is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="analyzer-container">
      <div className="page-header">
        <h1 className="page-title">Resume Analyzer</h1>
        <p className="page-subtitle">Upload your resume to get deep ATS insights.</p>
      </div>

      {!result ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem', color: 'var(--primary)' }}>
            <Upload size={64} style={{ margin: '0 auto' }} />
          </div>
          <h3 style={{ marginBottom: '1rem' }}>Upload Resume (PDF/DOCX)</h3>
          
          <input 
            type="file" 
            id="file-upload" 
            accept=".pdf,.docx,.doc" 
            onChange={handleFileChange}
            style={{ display: 'none' }} 
          />
          
          <label htmlFor="file-upload" className="btn btn-secondary" style={{ marginBottom: '1rem', width: '100%' }}>
            {file ? file.name : 'Choose File'}
          </label>
          
          <button 
            className="btn btn-primary" 
            onClick={handleUpload} 
            disabled={!file || loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Analyzing...' : 'Analyze Resume'}
          </button>
        </div>
      ) : (
        <div className="results-container">
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3><FileText size={20} style={{ display: 'inline', marginRight: '10px' }}/> {result.filename}</h3>
              <p className="text-muted">Successfully parsed {result.text?.length || 0} characters.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => setResult(null)}>Analyze Another</button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
             <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle color="var(--primary)" /> Top Skills Found
                </h3>
                <p className="text-muted" style={{ marginTop: '1rem' }}>
                   *Note: The actual AI analysis results will render here natively from the API response object.*
                </p>
             </div>
             <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle color="var(--warning, #FFA726)" /> Missing Recommendations
                </h3>
                <p className="text-muted" style={{ marginTop: '1rem' }}>
                   *Note: Detailed feedback and score cards are generated from the Python API backend data.*
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analyzer;
