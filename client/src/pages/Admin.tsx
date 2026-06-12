import { useState, useEffect } from 'react';
import { Building2, Presentation, BookOpen, Users, Trash2, Plus, AlertTriangle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import './Admin.css';

type Tab = 'TIMETABLES' | 'DEPARTMENTS' | 'ROOMS' | 'COURSES' | 'FACULTY';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('TIMETABLES');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState<any>(null);
  
  const [semesters, setSemesters] = useState<any[]>([]);
  const [semestersLoaded, setSemestersLoaded] = useState(false);
  // Initialize empty - always validated against live API list below
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  const fetchTab = async (tab: Tab) => {
    setLoading(true);
    setError('');
    try {
      const endpoint = tab.toLowerCase();
      const url = selectedSemester ? `http://localhost:3001/api/admin/${endpoint}?semesterId=${selectedSemester}` : `http://localhost:3001/api/admin/${endpoint}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('samayak_token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('http://localhost:3001/api/timetable/semesters', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('samayak_token')}` }
    })
    .then(r => r.json())
    .then(data => {
      setSemesters(data);
      const stored = localStorage.getItem('active_semester_id');
      const storedExists = stored && data.some((s: any) => s.id === stored);
      if (storedExists) {
        setSelectedSemester(stored!);
      } else if (data.length > 0) {
        setSelectedSemester(data[0].id);
        localStorage.setItem('active_semester_id', data[0].id);
      }
      setSemestersLoaded(true);
    }).catch(() => { setSemestersLoaded(true); });
  }, []);

  useEffect(() => {
    if (selectedSemester) fetchTab(activeTab);
  }, [activeTab, selectedSemester]);

  useEffect(() => {
    if (!selectedSemester) return;
    fetch(`http://localhost:3001/api/timetable/metadata?semesterId=${selectedSemester}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('samayak_token')}` }
    })
    .then(r => r.json())
    .then(m => setMetadata(m))
    .catch(() => {});
  }, [selectedSemester]);

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      const res = await fetch(`http://localhost:3001/api/admin/${activeTab.toLowerCase()}/${recordToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('samayak_token')}` }
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || 'Failed to delete');
      } else {
        fetchTab(activeTab);
      }
    } catch (e: any) {
      alert('Error deleting record.');
    } finally {
      setRecordToDelete(null);
    }
  };

  const handleDelete = (id: string) => {
    setRecordToDelete(id);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:3001/api/admin/${activeTab.toLowerCase()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('samayak_token')}`
        },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const result = await res.json();
        alert(result.error || 'Failed to create');
        return;
      }
      setShowModal(false);
      setFormData({});
      fetchTab(activeTab);
    } catch (e: any) {
      alert('Error creating record.');
    }
  };

  const renderTabs = () => (
    <div className="admin-tabs">
      <button className={activeTab === 'TIMETABLES' ? 'active' : ''} onClick={() => setActiveTab('TIMETABLES')}><Presentation size={16}/> Timetables</button>
      <button className={activeTab === 'DEPARTMENTS' ? 'active' : ''} onClick={() => setActiveTab('DEPARTMENTS')}><Building2 size={16}/> Departments</button>
      <button className={activeTab === 'ROOMS' ? 'active' : ''} onClick={() => setActiveTab('ROOMS')}><Presentation size={16}/> Rooms</button>
      <button className={activeTab === 'COURSES' ? 'active' : ''} onClick={() => setActiveTab('COURSES')}><BookOpen size={16}/> Courses</button>
      <button className={activeTab === 'FACULTY' ? 'active' : ''} onClick={() => setActiveTab('FACULTY')}><Users size={16}/> Faculty</button>
    </div>
  );

  const renderTable = () => {
    if (loading) return <div className="admin-loading">Loading...</div>;
    if (error) return <div className="admin-error"><AlertTriangle size={16}/> {error}</div>;
    if (data.length === 0) return <div className="admin-empty">No records found.</div>;

    if (activeTab === 'TIMETABLES') {
      return (
        <table className="admin-table">
          <thead><tr><th>Semester</th><th>Branch</th><th>Department</th><th>Actions</th></tr></thead>
          <tbody>
            {data.map(s => (
              <tr key={s.id}>
                <td><strong>Sem {s.number}{s.section ? ` (${s.section})` : ''}</strong></td>
                <td>{s.branch?.name} ({s.branch?.program})</td>
                <td>{s.branch?.department?.name}</td>
                <td>
                  <button className="btn-icon delete" onClick={() => handleDelete(s.id)}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === 'DEPARTMENTS') {
      return (
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Code</th><th>Linked Data</th><th>Actions</th></tr></thead>
          <tbody>
            {data.map(d => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td><span className="badge-gray">{d.shortCode}</span></td>
                <td className="admin-meta">
                  {d._count?.rooms} Rooms · {d._count?.faculty} Faculty
                </td>
                <td>
                  <button className="btn-icon delete" onClick={() => handleDelete(d.id)}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === 'ROOMS') {
      return (
        <table className="admin-table">
          <thead><tr><th>Room</th><th>Type</th><th>Capacity</th><th>Department</th><th>Actions</th></tr></thead>
          <tbody>
            {data.map(r => (
              <tr key={r.id}>
                <td><strong>{r.roomNumber}</strong></td>
                <td><span className={`badge-type ${(r.type || 'CLASSROOM').toLowerCase()}`}>{r.type}</span></td>
                <td>{r.capacity ? `${r.capacity} seats` : <span className="text-warning">Missing</span>}</td>
                <td>{r.department?.shortCode}</td>
                <td>
                  <button className="btn-icon delete" onClick={() => handleDelete(r.id)}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === 'COURSES') {
      return (
        <table className="admin-table">
          <thead><tr><th>Code</th><th>Name</th><th>Credits</th><th>Branch</th><th>Actions</th></tr></thead>
          <tbody>
            {data.map(c => (
              <tr key={c.id}>
                <td><strong>{c.code}</strong></td>
                <td>{c.name}</td>
                <td>
                  {c.isZeroCredit ? <span className="badge-warning">0 Cr</span> : `${c.credits} Cr`}
                </td>
                <td>{c.branch?.name} (Sem {c.semester})</td>
                <td>
                  <button className="btn-icon delete" onClick={() => handleDelete(c.id)}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === 'FACULTY') {
      return (
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Actions</th></tr></thead>
          <tbody>
            {data.map(f => (
              <tr key={f.id}>
                <td><strong>{f.name}</strong></td>
                <td className="admin-meta">{f.email}</td>
                <td><span className={`badge-role ${(f.role || 'PROFESSOR').toLowerCase()}`}>{f.role}</span></td>
                <td>{f.department?.shortCode || 'N/A'}</td>
                <td>
                  <button className="btn-icon delete" onClick={() => handleDelete(f.id)}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <header className="dash-header">
          <div>
            <h1 className="dash-welcome">Admin Panel</h1>
            <p className="dash-date">Manage Departments, Rooms, Courses, and Faculty</p>
            {metadata && metadata.branch && (
              <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 13, color: '#1a4e7a', fontWeight: 500 }}>
                <span style={{ background: '#e0f2fe', padding: '4px 8px', borderRadius: 4 }}>Program: {metadata.branch.program}</span>
                <span style={{ background: '#e0f2fe', padding: '4px 8px', borderRadius: 4 }}>Department: {metadata.branch.department?.shortCode || metadata.branch.department?.name}</span>
                <span style={{ background: '#e0f2fe', padding: '4px 8px', borderRadius: 4 }}>Branch: {metadata.branch.shortCode || metadata.branch.name}</span>
                <span style={{ background: '#e0f2fe', padding: '4px 8px', borderRadius: 4 }}>Semester: {metadata.number}{metadata.section}</span>
              </div>
            )}
          </div>
          <div className="dash-header-actions" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select 
              className="form-input" 
              style={{ width: 250, padding: '8px 12px' }}
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                localStorage.setItem('active_semester_id', e.target.value);
              }}
            >
              {semesters.map(s => (
                <option key={s.id} value={s.id}>
                  {s.branch?.department?.shortCode || s.branch?.department?.name} · {s.branch?.program} {s.branch?.shortCode || s.branch?.name} · Sem {s.number}{s.section ? ` (Section ${s.section})` : ''}
                </option>
              ))}
              {!semestersLoaded && <option value="">Loading...</option>}
              {semestersLoaded && semesters.length === 0 && <option value="">No Timetables Found</option>}
            </select>
            
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} strokeWidth={2}/>
              Add New
            </button>
          </div>
        </header>

        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: '#fff', padding: 24, borderRadius: 12, width: 400 }}>
              <h2 style={{ marginBottom: 16 }}>Add New {activeTab}</h2>
              <form onSubmit={handleCreate}>
                {activeTab === 'DEPARTMENTS' && (
                  <>
                    <input required placeholder="Department Name" style={{ width: '100%', padding: 8, marginBottom: 12 }} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <input required placeholder="Short Code (e.g. CSE)" style={{ width: '100%', padding: 8, marginBottom: 12 }} onChange={e => setFormData({...formData, shortCode: e.target.value})} />
                  </>
                )}
                {activeTab === 'ROOMS' && (
                  <>
                    <input required placeholder="Room Number (e.g. 204)" style={{ width: '100%', padding: 8, marginBottom: 12 }} onChange={e => setFormData({...formData, roomNumber: e.target.value})} />
                    <input required placeholder="Capacity (e.g. 60)" type="number" style={{ width: '100%', padding: 8, marginBottom: 12 }} onChange={e => setFormData({...formData, capacity: e.target.value})} />
                    <select required style={{ width: '100%', padding: 8, marginBottom: 12 }} onChange={e => setFormData({...formData, type: e.target.value})}>
                      <option value="">Select Type...</option>
                      <option value="CLASSROOM">Classroom</option>
                      <option value="LAB">Lab</option>
                    </select>
                    {/* Note: Requires a real department ID in production, hardcoding standard one for demo form simplicity if empty */}
                    <input required placeholder="Department ID" style={{ width: '100%', padding: 8, marginBottom: 12 }} onChange={e => setFormData({...formData, departmentId: e.target.value})} />
                  </>
                )}
                {/* Courses and Faculty forms can follow the same pattern */}
                {(activeTab === 'COURSES' || activeTab === 'FACULTY') && (
                  <p style={{ color: 'gray', marginBottom: 16, fontSize: 13 }}>Please use the CSV Bulk Import tool to add {activeTab.toLowerCase()}.</p>
                )}

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ padding: '8px 16px', background: 'var(--brand-blue)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {recordToDelete && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: '#fff', padding: 24, borderRadius: 12, width: 400 }}>
              <h2 style={{ marginBottom: 16 }}>Confirm Deletion</h2>
              <p style={{ color: '#64748b', marginBottom: 24 }}>
                Are you sure you want to delete this {activeTab.slice(0, -1).toLowerCase()}? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setRecordToDelete(null)} style={{ padding: '8px 16px', background: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button type="button" onClick={confirmDelete} style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 500 }}>Delete</button>
              </div>
            </div>
          </div>
        )}

        <div className="admin-container">
          {renderTabs()}
          <div className="admin-table-wrap">
            {renderTable()}
          </div>
        </div>
      </main>
    </div>
  );
}
