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

// ── Types ──────────────────────────────────────────────────────
interface User {
  name: string;
  email: string;
  role: string;
}

// ── Under-running courses list (demo) ─────────────────────────
const UNDER_RUNNING = [
  { code: 'CS609', name: 'Universal Human Values', scheduled: 3, actual: 1, shortfall: 2 },
  { code: 'CS603', name: 'Machine Learning',        scheduled: 5, actual: 3, shortfall: 2 },
  { code: 'CS602', name: 'Computer Networks',       scheduled: 5, actual: 4, shortfall: 1 },
  { code: 'CS608', name: 'ML Lab',                  scheduled: 4, actual: 3, shortfall: 1 },
];

// ── Day × Period legend ───────────────────────────────────────
const PERIODS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [today, setToday] = useState('');

  useEffect(() => {
    // Auth guard
    const raw = localStorage.getItem('samayak_user');
    if (!raw) { navigate('/login'); return; }
    setUser(JSON.parse(raw));

    // Formatted date
    const d = new Date();
    setToday(d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  }, [navigate]);

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
          <div className="dash-header-actions">
            <button className="btn-secondary" id="btn-refresh">
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
            value="74%"
            delta="+6% this week"
            deltaPositive={true}
            icon={Building2}
            iconColor="#3DA1FF"
            accent="#3DA1FF"
          />
          <StatCard
            label="P(Empty Room)"
            value="0.31"
            subLabel="Per slot avg"
            icon={Clock}
            iconColor="#8B5CF6"
            accent="#8B5CF6"
          />
          <StatCard
            label="Under-running"
            value="4"
            subLabel="Courses flagged"
            icon={TrendingDown}
            iconColor="#F59E0B"
            accent="#F59E0B"
          />
          <StatCard
            label="Idle Room-Hrs"
            value="2.8h"
            subLabel="Avg per day"
            icon={Activity}
            iconColor="#10B981"
            accent="#10B981"
          />
        </section>

        {/* ── Demo badge ────────────────────── */}
        <div className="demo-notice">
          <ShieldCheck size={14} strokeWidth={2} />
          Showing demo data · Import a timetable PDF to see real analytics
        </div>

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

          <ThreeHeatmap height={400} />

          {/* Period axis labels */}
          <div className="period-axis">
            {PERIODS.map(p => (
              <span key={p} className="period-label">{p}</span>
            ))}
          </div>
        </section>

        {/* ── Bottom row ────────────────────── */}
        <div className="bottom-row">

          {/* Utilisation ring */}
          <section className="dash-card ring-section">
            <h2 className="section-title">Utilisation</h2>
            <p className="section-sub">Room slots filled</p>
            <div className="ring-center">
              <ThreeRing value={0.74} size={200} />
            </div>
            <div className="ring-stats">
              <div className="ring-stat">
                <span className="ring-stat-value" style={{ color: '#1a4e7a' }}>74%</span>
                <span className="ring-stat-label">Occupied</span>
              </div>
              <div className="ring-stat-divider" />
              <div className="ring-stat">
                <span className="ring-stat-value" style={{ color: '#BFDBFE' }}>26%</span>
                <span className="ring-stat-label">Empty</span>
              </div>
            </div>
          </section>

          {/* Under-running courses */}
          <section className="dash-card under-section">
            <h2 className="section-title">Under-running Courses</h2>
            <p className="section-sub">Classes scheduled but fewer held</p>

            <div className="under-list">
              {UNDER_RUNNING.map(c => (
                <div key={c.code} className="under-item">
                  <div className="under-item-left">
                    <span className="under-code">{c.code}</span>
                    <span className="under-name">{c.name}</span>
                  </div>
                  <div className="under-item-right">
                    <div className="under-bar-wrap">
                      <div
                        className="under-bar-fill"
                        style={{ width: `${(c.actual / c.scheduled) * 100}%` }}
                      />
                    </div>
                    <span className="under-fraction">
                      {c.actual}/{c.scheduled}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-ghost" style={{ marginTop: 16 }} id="btn-view-all-courses">
              View all
            </button>
          </section>

        </div>
      </main>
    </div>
  );
}
