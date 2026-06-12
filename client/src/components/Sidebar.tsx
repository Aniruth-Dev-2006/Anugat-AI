import { NavLink, useNavigate } from 'react-router-dom';
import {
  House, CalendarDays, FileUp, BarChart3,
  Building2, LogOut,
} from 'lucide-react';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/dashboard',  icon: House,        label: 'Home'            },
  { to: '/timetable',  icon: CalendarDays, label: 'Class Timetable' },
  { to: '/import',     icon: FileUp,       label: 'Import PDF'      },
  { to: '/analytics',  icon: BarChart3,    label: 'Analytics'       },
  { to: '/admin',      icon: Building2,    label: 'Admin Panel'     },
];

export default function Sidebar() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('samayak_token');
    localStorage.removeItem('samayak_user');
    navigate('/login');
  }

  return (
    <aside className="sidebar">
      {/* ── Brand ─────────────────────── */}
      <div className="sidebar-brand">
        <img src="/logo.png" alt="Anugat AI" className="sidebar-logo" />
        <span className="sidebar-brand-name">Samayak</span>
      </div>

      {/* ── Nav items ─────────────────── */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
            }
          >
            <Icon size={20} strokeWidth={1.75} className="sidebar-item-icon" />
            <span className="sidebar-item-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Log out ───────────────────── */}
      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={handleLogout} id="btn-logout">
          <LogOut size={18} strokeWidth={1.75} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
