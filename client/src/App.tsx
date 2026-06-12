import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage  from './pages/Login';
import Dashboard  from './pages/Dashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Stub pages — to be built next */}
        <Route path="/timetable" element={<Dashboard />} />
        <Route path="/import"    element={<Dashboard />} />
        <Route path="/analytics" element={<Dashboard />} />
        <Route path="/admin"     element={<Dashboard />} />
        {/* Default */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
