import Sidebar from '../components/Sidebar';

export default function AnalyticsPage() {
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

        <div className="dash-card" style={{ marginTop: 24, padding: 32 }}>
          <p style={{ color: 'var(--text-muted)' }}>Detailed analytics reports coming soon.</p>
        </div>
      </main>
    </div>
  );
}
