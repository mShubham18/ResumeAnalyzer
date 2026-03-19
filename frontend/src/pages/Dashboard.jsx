import { Eye, Download, Award, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', score: 4000, views: 2400 },
  { name: 'Feb', score: 3000, views: 1398 },
  { name: 'Mar', score: 2000, views: 9800 },
  { name: 'Apr', score: 2780, views: 3908 },
  { name: 'May', score: 1890, views: 4800 },
  { name: 'Jun', score: 2390, views: 3800 },
  { name: 'Jul', score: 3490, views: 4300 },
];

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1 className="page-title">Analytics Dashboard</h1>
        <p className="page-subtitle">Track your resume performance over time.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(0, 180, 219, 0.1)', borderRadius: '12px', color: 'var(--primary)' }}>
            <Eye size={28} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Total Views</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>1,248</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(138, 43, 226, 0.1)', borderRadius: '12px', color: 'var(--secondary)' }}>
            <Download size={28} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Downloads</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>842</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(225, 0, 255, 0.1)', borderRadius: '12px', color: 'var(--accent)' }}>
            <Award size={28} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>Avg. ATS Score</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>86%</div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', height: '400px' }}>
        <h3 style={{ marginBottom: '2rem' }}>Performance Trends</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00B4DB" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#00B4DB" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="#A0AABF" />
            <YAxis stroke="#A0AABF" />
            <Tooltip 
              contentStyle={{ background: 'rgba(10, 14, 23, 0.9)', border: '1px solid rgba(0, 180, 219, 0.2)', borderRadius: '8px' }} 
            />
            <Area type="monotone" dataKey="score" stroke="#00B4DB" fillOpacity={1} fill="url(#colorScore)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
