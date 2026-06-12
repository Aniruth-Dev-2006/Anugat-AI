import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage  from './pages/Login';
import Dashboard  from './pages/Dashboard';
import ImportPage from './pages/Import';
import AdminPage from './pages/Admin';
import TimetablePage from './pages/Timetable';
import AnalyticsPage from './pages/Analytics';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Other pages */}
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/import"    element={<ImportPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/admin"     element={<AdminPage />} />
        {/* Default */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
