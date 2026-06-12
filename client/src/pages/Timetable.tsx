import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import './Admin.css';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const PERIODS = [
  { id: 'I', time: '08:00 - 08:50' },
  { id: 'II', time: '09:00 - 09:50' },
  { id: 'III', time: '10:00 - 10:50' },
  { id: 'IV', time: '11:00 - 11:50' },
  { id: 'V', time: '12:00 - 12:50' },
  { id: 'VI', time: '13:30 - 14:20' },
  { id: 'VII', time: '14:30 - 15:20' },
  { id: 'VIII', time: '15:30 - 16:20' },
  { id: 'IX', time: '16:30 - 17:20' }
];

export default function TimetablePage() {
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState<any>(null);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [semestersLoaded, setSemestersLoaded] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  // Initialize empty - will be set after semesters load and validated against the live list
  const [selectedSemester, setSelectedSemester] = useState<string>('');

  // Load semesters list on mount; auto-select first if nothing stored
  useEffect(() => {
    fetch('http://localhost:3001/api/timetable/semesters', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('samayak_token')}` }
    })
    .then(r => r.json())
    .then(data => {
      setSemesters(data);
      setSemestersLoaded(true);
      const stored = localStorage.getItem('active_semester_id');
      // Check if stored ID still exists in the list
      const storedExists = stored && data.some((s: any) => s.id === stored);
      if (!storedExists && data.length > 0) {
        // Stored ID is stale or missing — pick the first available
        setSelectedSemester(data[0].id);
        localStorage.setItem('active_semester_id', data[0].id);
      } else if (storedExists) {
        setSelectedSemester(stored!);
      }
    }).catch(() => { setSemestersLoaded(true); });
  }, []);

  useEffect(() => {
    if (!selectedSemester) {
      setLoading(false);
      setSlots([]);
      return;
    }
    setLoading(true);
    setError('');

    const fetchSlots = async () => {
      try {
        const url = `http://localhost:3001/api/timetable?semesterId=${selectedSemester}`;
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('samayak_token')}` }
        });
        console.log('[Timetable] GET', url, '->', res.status);
        if (res.ok) {
          const data = await res.json();
          console.log('[Timetable] Loaded', data.length, 'slots');
          setSlots(data);
        } else {
          const text = await res.text();
          console.error('[Timetable] API error:', res.status, text);
          setError(`API error ${res.status}: ${text}`);
        }
      } catch (err) {
        console.error('Failed to fetch timetable slots', err);
        setError('Network error fetching timetable');
      } finally {
        setLoading(false);
      }
    };
    const fetchMetadata = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/timetable/metadata?semesterId=${selectedSemester}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('samayak_token')}` }
        });
        if (res.ok) setMetadata(await res.json());
      } catch (err) {}
    };
    fetchSlots();
    fetchMetadata();
  }, [selectedSemester]);

  const getSlots = (day: string, period: string) => {
    return slots.filter(s => s.day === day && s.period === period);
  };

  const getShortForm = (name: string | undefined) => {
    if (!name) return '';
    const match = name.match(/\(([^)]+)\)$/);
    if (match) return match[1];
    
    // If the name is already short (like "OEIII/MOOC"), just return it as is
    if (name.length <= 12) return name;
    
    // Fallback: take the first letter of each word (split by spaces or slashes)
    return name.split(/[\s/]+/).filter(w => w.length > 0).map(w => w[0]).join('').substring(0, 4).toUpperCase();
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <header className="dash-header">
          <div>
            <h1 className="dash-welcome">Master Class Timetable</h1>
            <p className="dash-date">View the currently loaded semester schedule</p>
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
            
            <button 
              className="btn-secondary" 
              style={{ borderColor: '#ef4444', color: '#ef4444' }}
              onClick={() => setShowClearModal(true)}
            >
              Clear
            </button>
          </div>
        </header>

        {showClearModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 400 }}>
              <div className="modal-header">
                <h2>Clear Timetable</h2>
                <button className="btn-icon" onClick={() => setShowClearModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: 16 }}>Are you sure you want to delete the currently selected timetable? This action cannot be undone.</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button className="btn-secondary" onClick={() => setShowClearModal(false)}>Cancel</button>
                  <button className="btn-primary" style={{ background: '#ef4444' }} onClick={async () => {
                    try {
                      const res = await fetch(`http://localhost:3001/api/timetable/semesters/${selectedSemester}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('samayak_token')}` }
                      });
                      if (res.ok) {
                        setSlots([]);
                        setShowClearModal(false);
                        // Refresh semesters list
                        const sRes = await fetch('http://localhost:3001/api/timetable/semesters', {
                          headers: { 'Authorization': `Bearer ${localStorage.getItem('samayak_token')}` }
                        });
                        const sData = await sRes.json();
                        setSemesters(sData);
                        if (sData.length > 0) {
                          setSelectedSemester(sData[0].id);
                          localStorage.setItem('active_semester_id', sData[0].id);
                        } else {
                          setSelectedSemester('');
                          localStorage.removeItem('active_semester_id');
                        }
                      }
                    } catch (e) {}
                  }}>Yes, Delete It</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="admin-container" style={{ padding: 24, overflowX: 'auto' }}>
          {loading || !semestersLoaded ? (
            <div className="admin-loading">Loading timetable...</div>
          ) : error ? (
            <div style={{ padding: '40px 20px', color: '#ef4444', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>⚠️ Error loading timetable</div>
              <code style={{ fontSize: 13 }}>{error}</code>
            </div>
          ) : !selectedSemester || semesters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <h3 style={{ color: '#475569', marginBottom: 8 }}>No timetable loaded</h3>
              <p style={{ fontSize: 14 }}>Upload a timetable PDF from the Import page to get started.</p>
              <a href="/import" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: '#1a4e7a', color: 'white', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Go to Import →</a>
            </div>
          ) : slots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🗓️</div>
              <h3 style={{ color: '#475569', marginBottom: 8 }}>No slots for this semester</h3>
              <p style={{ fontSize: 14 }}>This semester exists but has no timetable slots. Try re-uploading the PDF.</p>
            </div>
          ) : (
            <table className="admin-table" style={{ minWidth: 800 }}>
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Day</th>
                  {PERIODS.map(p => (
                    <React.Fragment key={p.id}>
                      {p.id === 'VI' && (
                        <th style={{ width: 40, background: '#f8fafc', borderLeft: '2px dashed #cbd5e1', borderRight: '2px dashed #cbd5e1' }}></th>
                      )}
                      <th style={{ textAlign: 'center' }}>
                        <div>{p.id}</div>
                        <div style={{ fontSize: 11, color: '#536778', fontWeight: 400, marginTop: 4 }}>{p.time}</div>
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day}>
                    <td><strong>{day}</strong></td>
                    {PERIODS.map(period => {
                      const periodSlots = getSlots(day, period.id);
                      const isAfterLunch = period.id === 'VI';
                      
                      return (
                        <React.Fragment key={period.id}>
                          {isAfterLunch && (
                            <td rowSpan={1} style={{ textAlign: 'center', verticalAlign: 'middle', background: '#f8fafc', color: '#94a3b8', fontSize: 11, fontWeight: 500, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                              LUNCH
                            </td>
                          )}
                          <td style={{ textAlign: 'center', verticalAlign: 'top', height: 80, padding: '4px' }}>
                            {periodSlots.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {periodSlots.map((slot: any, idx: number) => {
                                  const shortForm = getShortForm(slot.course?.name) || slot.course?.code;
                                  const roomDisplay = slot.room?.roomNumber && slot.room?.roomNumber !== 'TBD' ? slot.room?.roomNumber : '';
                                  
                                  return (
                                    <div key={idx} style={{ background: '#F4F8FD', padding: '6px', borderRadius: '6px', border: '1px solid #D1E5F7', fontSize: 12 }}>
                                      <div style={{ fontWeight: 700, color: '#1a4e7a' }}>{shortForm}</div>
                                      {roomDisplay && <div style={{ color: '#536778', marginTop: 2, fontSize: 11 }}>{roomDisplay}</div>}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div style={{ color: '#ccc', fontSize: 11, paddingTop: 12 }}>-</div>
                            )}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
