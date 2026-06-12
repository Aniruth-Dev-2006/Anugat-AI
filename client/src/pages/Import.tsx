import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, BookOpen, Info, ArrowRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import './Import.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type JobStatus = 'QUEUED' | 'PARSING' | 'INTEGRATING' | 'DONE' | 'FAILED';

interface ImportJob {
  id: string;
  filename: string;
  status: JobStatus;
  summary?: {
    createdRooms: number;
    matchedRooms: number;
    createdCourses: number;
    matchedCourses: number;
    slotsCreated: number;
    failedRows: number;
    failReasons: string[];
    error?: string;
  };
}

const PROGRAMS = ['BTECH', 'MTECH', 'MCA', 'MBA', 'MSC', 'PHD'];

export default function ImportPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState('');
  const [semesters, setSemesters] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mode: 'new' = create new timetable, 'existing' = update existing semester
  const [importMode, setImportMode] = useState<'new' | 'existing'>('new');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');

  // New semester form fields
  const [semForm, setSemForm] = useState({
    program: 'BTECH',
    deptName: 'Computer Science and Engineering',
    deptShort: 'CSE',
    branchName: 'B.Tech Computer Science and Engineering',
    branchShort: 'CS',
    semesterNumber: '6',
    section: 'A',
  });

  useEffect(() => {
    fetch(`${API_URL}/api/timetable/semesters`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('samayak_token')}` }
    })
    .then(r => r.json())
    .then(data => setSemesters(Array.isArray(data) ? data : []))
    .catch(() => {});
  }, []);

  // Poll for job status
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (job && (job.status === 'QUEUED' || job.status === 'PARSING' || job.status === 'INTEGRATING')) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/api/import/status/${job.id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('samayak_token')}` }
          });
          if (res.ok) setJob(await res.json());
        } catch (e) {}
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [job?.id, job?.status]);

  const handleFile = (selected: File) => {
    setError('');
    if (selected.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }
    setFile(selected);
    setJob(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    if (importMode === 'existing' && selectedSemesterId) {
      formData.append('semesterId', selectedSemesterId);
    } else {
      // New timetable — send all form fields
      formData.append('semesterNumber', semForm.semesterNumber);
      formData.append('section', semForm.section.toUpperCase().trim() || '');
      formData.append('program', semForm.program);
      formData.append('deptName', semForm.deptName);
      formData.append('deptShort', semForm.deptShort);
      formData.append('branchName', semForm.branchName);
      formData.append('branchShort', semForm.branchShort);
    }

    try {
      const res = await fetch(`${API_URL}/api/import/timetable`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('samayak_token')}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setJob({ id: data.jobId, filename: file.name, status: 'QUEUED' });
    } catch (err: any) {
      setError(err.message || 'Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };


  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <header className="dash-header" style={{ marginBottom: '24px' }}>
          <div>
            <h1 className="dash-welcome">Import Timetable PDF</h1>
            <p className="dash-date">Upload a department timetable PDF — OCR will extract and load the schedule automatically.</p>
            <p className="dash-date" style={{ color: '#ef4444', fontWeight: 500, marginTop: '4px' }}>Note: For multi-page PDFs, only the first page will be parsed and analyzed.</p>
          </div>
        </header>

        <div className="import-container">

          {/* ── Mode Selector ──────────────────────────────── */}
          <div className="dash-card" style={{ marginBottom: 20, padding: '20px 24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              <BookOpen size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
              Step 1 — Choose Import Mode
            </h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setImportMode('new')}
                style={{
                  flex: 1, padding: '14px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                  border: importMode === 'new' ? '2px solid #1a4e7a' : '2px solid #e2e8f0',
                  background: importMode === 'new' ? '#eef6ff' : '#f8fafc',
                  color: importMode === 'new' ? '#1a4e7a' : '#64748b',
                  transition: 'all 0.15s'
                }}
              >
                ✦ Create New Timetable
                <div style={{ fontSize: 12, fontWeight: 400, marginTop: 4, opacity: 0.8 }}>
                  Upload a completely new semester's schedule
                </div>
              </button>
              <button
                onClick={() => setImportMode('existing')}
                style={{
                  flex: 1, padding: '14px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                  border: importMode === 'existing' ? '2px solid #7c3aed' : '2px solid #e2e8f0',
                  background: importMode === 'existing' ? '#f5f3ff' : '#f8fafc',
                  color: importMode === 'existing' ? '#7c3aed' : '#64748b',
                  transition: 'all 0.15s'
                }}
              >
                ↻ Update Existing Timetable
                <div style={{ fontSize: 12, fontWeight: 400, marginTop: 4, opacity: 0.8 }}>
                  Replace slots of an existing semester
                </div>
              </button>
            </div>
          </div>

          {/* ── Semester Details (new mode) ──────────────────── */}
          {importMode === 'new' && (
            <div className="dash-card" style={{ marginBottom: 20, padding: '20px 24px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                Step 2 — Semester Details
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Info size={13} /> These fields will auto-fill from OCR if found in the PDF header. You can override them manually.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>PROGRAM</label>
                  <select
                    className="form-input"
                    value={semForm.program}
                    onChange={e => {
                      const newProgram = e.target.value;
                      setSemForm(p => {
                        let newBranchShort = p.branchShort;
                        let newSection = p.section;
                        // Auto-adjust defaults for PG courses
                        if (newProgram === 'MTECH' || newProgram === 'MCA') {
                          newSection = ''; // Usually no sections for PG
                          if (newBranchShort === 'CS') newBranchShort = 'MCS';
                        } else if (newProgram === 'BTECH') {
                          if (newBranchShort === 'MCS') newBranchShort = 'CS';
                        }
                        return { ...p, program: newProgram, section: newSection, branchShort: newBranchShort };
                      });
                    }}
                    style={{ width: '100%' }}
                  >
                    {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>DEPARTMENT SHORT CODE</label>
                  <input className="form-input" style={{ width: '100%' }} placeholder="e.g. CSE, ECE, ME" value={semForm.deptShort}
                    onChange={e => setSemForm(p => ({ ...p, deptShort: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>DEPARTMENT FULL NAME</label>
                  <input className="form-input" style={{ width: '100%' }} placeholder="e.g. Computer Science and Engineering" value={semForm.deptName}
                    onChange={e => setSemForm(p => ({ ...p, deptName: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>BRANCH SHORT CODE</label>
                  <input className="form-input" style={{ width: '100%' }} placeholder="e.g. CS, EC" value={semForm.branchShort}
                    onChange={e => setSemForm(p => ({ ...p, branchShort: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>BRANCH FULL NAME</label>
                  <input className="form-input" style={{ width: '100%' }} placeholder="e.g. B.Tech CSE" value={semForm.branchName}
                    onChange={e => setSemForm(p => ({ ...p, branchName: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>SEMESTER NO.</label>
                    <input className="form-input" style={{ width: '100%' }} type="number" min={1} max={12} value={semForm.semesterNumber}
                      onChange={e => setSemForm(p => ({ ...p, semesterNumber: e.target.value }))} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>SECTION (optional)</label>
                    <input className="form-input" style={{ width: '100%' }} placeholder="A, B, C…" maxLength={2} value={semForm.section}
                      onChange={e => setSemForm(p => ({ ...p, section: e.target.value }))} />
                  </div>
                </div>
              </div>
              {/* Preview tag */}
              <div style={{ marginTop: 14, padding: '8px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 13, color: '#166534', fontWeight: 500 }}>
                📋 Will create / update: <strong>{semForm.program}</strong> · <strong>{semForm.deptShort}</strong> · <strong>{semForm.branchShort}</strong> · Semester <strong>{semForm.semesterNumber}{semForm.section ? ` (${semForm.section.toUpperCase()})` : ''}</strong>
              </div>
            </div>
          )}

          {/* ── Existing Semester Selector ──────────────────── */}
          {importMode === 'existing' && (
            <div className="dash-card" style={{ marginBottom: 20, padding: '20px 24px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                Step 2 — Select Timetable to Update
              </h3>
              {semesters.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>No existing timetables found. Use "Create New" mode instead.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {semesters.map(s => (
                    <label key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                      border: selectedSemesterId === s.id ? '2px solid #7c3aed' : '2px solid #e2e8f0',
                      background: selectedSemesterId === s.id ? '#f5f3ff' : '#f8fafc',
                      transition: 'all 0.15s'
                    }}>
                      <input type="radio" name="sem" value={s.id} checked={selectedSemesterId === s.id}
                        onChange={() => setSelectedSemesterId(s.id)} style={{ accentColor: '#7c3aed' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                          {s.branch?.program} — {s.branch?.shortCode || s.branch?.name} — Semester {s.number}{s.section ? ` (Section ${s.section})` : ''}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          Dept: {s.branch?.department?.shortCode || s.branch?.department?.name || 'N/A'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Upload Box ──────────────────────────────────── */}
          <div className="dash-card" style={{ marginBottom: 20, padding: '20px 24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              Step 3 — Upload PDF
            </h3>
            <div
              className={`dropzone ${isDragging ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
              }}
              onClick={() => !file && fileInputRef.current?.click()}
            >
              <input
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {!file ? (
                <div className="dropzone-empty">
                  <div className="drop-icon-wrap"><UploadCloud size={32} /></div>
                  <h3>Click to upload or drag and drop</h3>
                  <p>BIT Mesra standard PDF format (Max 10MB)</p>
                </div>
              ) : (
                <div className="dropzone-file">
                  <FileText size={48} className="file-icon" />
                  <div className="file-info">
                    <h4>{file.name}</h4>
                    <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  {!job && (
                    <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                      Change File
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && <div className="import-error"><AlertCircle size={16} /> {error}</div>}

          {file && !job && (
            <div className="import-actions">
              <button
                className="btn-primary"
                onClick={handleUpload}
                disabled={uploading || (importMode === 'existing' && !selectedSemesterId)}
                style={{ opacity: (importMode === 'existing' && !selectedSemesterId) ? 0.5 : 1 }}
              >
                {uploading ? <><Loader2 size={16} className="spin" /> Uploading...</> : '🚀 Start Import Pipeline'}
              </button>
              {importMode === 'existing' && !selectedSemesterId && (
                <span style={{ fontSize: 13, color: '#ef4444', marginLeft: 12 }}>Please select a timetable to update above.</span>
              )}
            </div>
          )}

          {/* ── Job Status & Summary ─────────────────────────── */}
          {job && (
            <div className="job-status-card">
              <div className="job-header">
                <h3>Pipeline Status</h3>
                <span className={`status-badge ${job.status.toLowerCase()}`}>
                  {job.status === 'DONE' && <CheckCircle2 size={14} />}
                  {job.status === 'FAILED' && <AlertCircle size={14} />}
                  {['QUEUED', 'PARSING', 'INTEGRATING'].includes(job.status) && <Loader2 size={14} className="spin" />}
                  {job.status}
                </span>
              </div>

              <div className="pipeline-steps">
                <div className={`step ${job.status !== 'QUEUED' ? 'active' : ''}`}>
                  <div className="step-dot"></div>
                  <span>Parsing PDF (OCR)</span>
                </div>
                <div className="step-line"></div>
                <div className={`step ${['INTEGRATING', 'DONE', 'FAILED'].includes(job.status) ? 'active' : ''}`}>
                  <div className="step-dot"></div>
                  <span>Entity Integration</span>
                </div>
                <div className="step-line"></div>
                <div className={`step ${['DONE', 'FAILED'].includes(job.status) ? 'active' : ''}`}>
                  <div className="step-dot"></div>
                  <span>Analytics Recompute</span>
                </div>
              </div>

              {job.status === 'DONE' && job.summary && (
                <>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="sum-val">{job.summary.createdCourses}</span>
                      <span className="sum-lbl">New Courses</span>
                    </div>
                    <div className="summary-item">
                      <span className="sum-val">{job.summary.createdRooms}</span>
                      <span className="sum-lbl">New Rooms</span>
                    </div>
                    <div className="summary-item">
                      <span className="sum-val">{job.summary.slotsCreated}</span>
                      <span className="sum-lbl">Slots Scheduled</span>
                    </div>
                    <div className="summary-item">
                      <span className="sum-val">{job.summary.failedRows}</span>
                      <span className="sum-lbl">Rows Failed</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, padding: '12px 16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#166534', fontWeight: 600, fontSize: 14 }}>✅ Timetable successfully imported! Select it from the dropdown to view.</span>
                    <button className="btn-primary" onClick={() => navigate('/timetable')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      View Timetable <ArrowRight size={14}/>
                    </button>
                  </div>
                </>
              )}

              {job.status === 'FAILED' && (
                <div className="import-error" style={{ marginTop: '16px' }}>
                  <AlertCircle size={16} />
                  Pipeline failed: {job.summary?.error || 'Internal worker error. Check server logs.'}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
