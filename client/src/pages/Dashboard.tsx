import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Clock, TrendingDown, Activity,
  FileUp, RefreshCw, ShieldCheck,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import ThreeHeatmap from '../components/ThreeHeatmap';
import ThreeRing from '../components/ThreeRing';
import './Dashboard.css';

const PERIODS_TIME = [
  { id: 'I', time: '08:00', end: '08:50', startMs: 8*60, endMs: 8*60+50 },
  { id: 'II', time: '09:00', end: '09:50', startMs: 9*60, endMs: 9*60+50 },
  { id: 'III', time: '10:00', end: '10:50', startMs: 10*60, endMs: 10*60+50 },
  { id: 'IV', time: '11:00', end: '11:50', startMs: 11*60, endMs: 11*60+50 },
  { id: 'V', time: '12:00', end: '12:50', startMs: 12*60, endMs: 12*60+50 },
  { id: 'VI', time: '13:30', end: '14:20', startMs: 13*60+30, endMs: 14*60+20 },
  { id: 'VII', time: '14:30', end: '15:20', startMs: 14*60+30, endMs: 15*60+20 },
  { id: 'VIII', time: '15:30', end: '16:20', startMs: 15*60+30, endMs: 16*60+20 },
  { id: 'IX', time: '16:30', end: '17:20', startMs: 16*60+30, endMs: 17*60+20 }
];

// ── Types ──────────────────────────────────────────────────────
interface User {
  name: string;
  email: string;
  role: string;
}

// No more hardcoded data

// ── Day × Period legend ───────────────────────────────────────
const PERIODS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [today, setToday] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedSemester, setSelectedSemester] = useState<string>('');

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/api/analytics/dashboard${selectedSemester ? `?semesterId=${selectedSemester}` : ''}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('samayak_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    }
  };

  useEffect(() => {
    // Auth guard
    const raw = localStorage.getItem('samayak_user');
    if (!raw) { navigate('/login'); return; }
    setUser(JSON.parse(raw));

    // Formatted date
    const d = new Date();
    setToday(d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // update clock every min
    return () => clearInterval(timer);
  }, [navigate]);

  useEffect(() => {
    // Fetch overall analytics once
    fetchAnalytics();
  }, []);

  const currentMs = currentTime.getHours() * 60 + currentTime.getMinutes();

  return (
    <div className="app-shell">
      {/* ── Sidebar ──────────────────────────── */}
      <Sidebar />

      {/* ── Main ─────────────────────────────── */}
      <main className="main-content">

        {/* Header */}
        <header className="dash-header">
          <div>
            <h1 className="dash-welcome">
              Welcome back, <span className="dash-name">{user?.name ?? '—'}</span>
            </h1>
            <p className="dash-date">{today}</p>
          </div>
          <div className="dash-header-actions" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn-secondary" id="btn-refresh" onClick={() => fetchAnalytics()}>
              <RefreshCw size={15} strokeWidth={2} />
              Refresh
            </button>
            <button className="btn-primary" id="btn-upload-pdf" onClick={() => navigate('/import')}>
              <FileUp size={15} strokeWidth={2} />
              Upload PDF
            </button>
          </div>
        </header>

        {/* ── Stat Cards ────────────────────── */}
        <section className="stat-grid" aria-label="Key metrics">
          <StatCard
            label="Room Utilisation"
            value={analytics ? `${analytics.roomUtilisation}%` : '...'}
            delta="Overall usage"
            deltaPositive={true}
            icon={Building2}
            iconColor="#3DA1FF"
            accent="#3DA1FF"
          />
          <StatCard
            label="P(Empty Room)"
            value={analytics ? analytics.pEmpty : '...'}
            subLabel="Per slot avg"
            icon={Clock}
            iconColor="#8B5CF6"
            accent="#8B5CF6"
          />
          <StatCard
            label="Under-running"
            value={analytics ? analytics.underRunningCount.toString() : '...'}
            subLabel="Courses flagged"
            icon={TrendingDown}
            iconColor="#F59E0B"
            accent="#F59E0B"
          />
          <StatCard
            label="Idle Room-Hrs"
            value={analytics ? `${analytics.avgEmptyRoomHrsPerDay}h` : '...'}
            subLabel="Avg per day"
            icon={Activity}
            iconColor="#10B981"
            accent="#10B981"
          />
        </section>

        {/* ── 3D Heatmap ────────────────────── */}
        <section className="dash-card heatmap-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Occupancy Heatmap</h2>
              <p className="section-sub">Room occupancy by day × period — drag to rotate</p>
            </div>
            {/* Legend */}
            <div className="heatmap-legend">
              <span className="legend-dot" style={{ background: '#BFDBFE' }} />
              <span className="legend-text">Empty</span>
              <span className="legend-dot" style={{ background: '#1a4e7a' }} />
              <span className="legend-text">Full</span>
            </div>
          </div>

          <ThreeHeatmap height={400} data={analytics?.heatmapData || Array(6).fill(Array(9).fill(0))} />

          {/* Period axis labels */}
          <div className="period-axis">
            {PERIODS.map(p => (
              <span key={p} className="period-label">{p}</span>
            ))}
          </div>
        </section>

        {/* ── Under-running Classes ────────────────────── */}
        <section className="dash-card live-schedule-section" style={{ marginTop: 24 }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">Under-running Classes</h2>
              <p className="section-sub">Courses with fewer scheduled slots than required credits</p>
            </div>
            <div style={{ fontWeight: 600, color: '#ef4444', background: '#fef2f2', padding: '6px 12px', borderRadius: 8 }}>
              {analytics?.underRunning?.length || 0} Alert{analytics?.underRunning?.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16, maxHeight: 400, overflowY: 'auto', paddingRight: 12 }}>
            {!analytics?.underRunning || analytics.underRunning.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#10b981', fontWeight: 500 }}>
                ✅ All courses meet their minimum credit hours requirement!
              </div>
            ) : (
              analytics.underRunning.map((c: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: 12 }}>
                    <TrendingDown size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a4e7a', margin: '0 0 4px 0' }}>{c.code} — {c.name}</h3>
                    <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
                      Scheduled: <strong style={{ color: '#ef4444' }}>{c.scheduled}</strong> hrs / week
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', paddingLeft: 16, borderLeft: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Required</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{c.required} <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>hrs</span></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
