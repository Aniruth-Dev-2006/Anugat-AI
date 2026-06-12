import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line
} from 'recharts';
import { Building2, Clock, TrendingDown, Activity } from 'lucide-react';
import StatCard from '../components/StatCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PERIODS_LABELS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${API_URL}/api/analytics/dashboard`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('samayak_token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#64748b' }}>Loading analytics...</div>
        </main>
      </div>
    );
  }

  // Formatting Data for Charts
  const pieData = [
    { name: 'Occupied', value: analytics?.occupiedRatio || 0 },
    { name: 'Idle', value: analytics?.emptyRatio || 0 }
  ];

  const barData = analytics?.underRunning?.map((c: any) => ({
    name: c.code,
    Scheduled: c.scheduled,
    Required: c.required
  })) || [];

  // Flatten heatmap data into average period congestion
  const lineData = PERIODS_LABELS.map((p, idx) => {
    let sum = 0;
    if (analytics?.heatmapData) {
      for (let d = 0; d < 6; d++) {
        sum += analytics.heatmapData[d][idx];
      }
    }
    return { name: p, Traffic: parseFloat((sum / 6).toFixed(2)) * 100 };
  });

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <header className="dash-header">
          <div>
            <h1 className="dash-welcome">Analytics</h1>
            <p className="dash-date">Deep dive into institutional metrics</p>
          </div>
        </header>

        {/* ── Stat Cards ────────────────────── */}
        <section className="stat-grid" aria-label="Key metrics" style={{ marginTop: '24px' }}>
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
            value={analytics ? analytics.underRunningCount?.toString() : '...'}
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
          {/* Room Utilisation Pie Chart */}
          <div className="dash-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Overall Room Utilisation</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} dataKey="value" stroke="none">
                    <Cell fill="#3b82f6" />
                    <Cell fill="#e2e8f0" />
                  </Pie>
                  <RechartsTooltip formatter={(value) => `${value}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center' }}>
              Shows the ratio of time rooms are occupied vs sitting completely empty.
            </p>
          </div>

          {/* Period Congestion Line Chart */}
          <div className="dash-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Average Traffic per Period</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={lineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip formatter={(value) => `${value}%`} />
                  <Line type="monotone" dataKey="Traffic" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 10 }}>
              The percentage of rooms occupied during each period, averaged across the entire week.
            </p>
          </div>
        </div>

        {/* Under-running Courses Bar Chart */}
        <div className="dash-card" style={{ padding: 24, marginTop: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Under-running Courses</h3>
          {barData.length === 0 ? (
            <p style={{ color: '#10b981', fontWeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              All courses are meeting their required contact hours!
            </p>
          ) : (
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ paddingTop: 20 }} />
                  <Bar dataKey="Scheduled" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Required" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
