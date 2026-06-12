import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight,
  Zap, AlertCircle, ChevronRight,
  Building2, Clock, TrendingDown, Activity,
  Quote,
} from 'lucide-react';
import './Login.css';

/* ══════════════════════════════════════════════════════════
   ANUGAT AI LOGO — uses the real PNG from /logo.png
══════════════════════════════════════════════════════════ */
function AnugatLogo({ size = 48 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="Anugat AI"
      width={size}
      height={size}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}

/* ══════════════════════════════════════════════════════════
   TYPEWRITER HOOK
══════════════════════════════════════════════════════════ */
const WORDS = ['Analytics', 'Insights', 'Intelligence', 'Visibility'];
const TYPE_MS  = 78;
const DEL_MS   = 42;
const PAUSE_MS = 1900;

function useTypewriter(words: string[]) {
  const [text, setText]       = useState('');
  const [idx, setIdx]         = useState(0);
  const [isTyping, setTyping] = useState(true);

  useEffect(() => {
    const target = words[idx];
    let t: ReturnType<typeof setTimeout>;

    if (isTyping) {
      if (text.length < target.length) {
        t = setTimeout(() => setText(target.slice(0, text.length + 1)), TYPE_MS);
      } else {
        t = setTimeout(() => setTyping(false), PAUSE_MS);
      }
    } else {
      if (text.length > 0) {
        t = setTimeout(() => setText(text.slice(0, -1)), DEL_MS);
      } else {
        setIdx(i => (i + 1) % words.length);
        setTyping(true);
      }
    }
    return () => clearTimeout(t);
  }, [text, isTyping, idx, words]);

  return text;
}

/* ══════════════════════════════════════════════════════════
   FEATURE CHIPS  (Lucide icons — no emoji)
══════════════════════════════════════════════════════════ */
const CHIPS = [
  { Icon: Building2,   label: 'Room Utilisation' },
  { Icon: Clock,       label: 'Empty Slot Analysis' },
  { Icon: TrendingDown,label: 'Under-running Courses' },
  { Icon: Activity,    label: 'Idle Infrastructure' },
];

/* ══════════════════════════════════════════════════════════
   STAT CARDS  (live metric previews)
══════════════════════════════════════════════════════════ */
const STATS = [
  { label: 'Room Utilisation', value: '74%',  delta: '+6% this week' },
  { label: 'P(Empty Room)',    value: '0.31', delta: 'Per slot avg'  },
  { label: 'Under-running',   value: '4',    delta: 'Courses flagged'},
  { label: 'Idle Room-Hrs',   value: '2.8h', delta: 'Avg per day'   },
];

/* ══════════════════════════════════════════════════════════
   TESTIMONIAL
══════════════════════════════════════════════════════════ */
const TESTIMONIAL = {
  quote: "Samayak cut our timetable planning from 3 days to under an hour. The room utilisation dashboard alone paid for itself in the first week.",
  name:  'Dr. Ranjita Mohanty',
  role:  'Head of Department, CSE · BIT Mesra',
  initials: 'RM',
};

/* ══════════════════════════════════════════════════════════
   INSTITUTION STATS
══════════════════════════════════════════════════════════ */
const INST_STATS = [
  { value: '13',   label: 'Branches' },
  { value: '200+', label: 'Courses'  },
  { value: '60+',  label: 'Faculty'  },
];

/* ══════════════════════════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════════════════════════ */
interface Form { email: string; password: string }

export default function LoginPage() {
  const word = useTypewriter(WORDS);

  const [form,      setForm]    = useState<Form>({ email: '', password: '' });
  const [showPwd,   setShowPwd] = useState(false);
  const [remember,  setRemember]= useState(false);
  const [loading,   setLoading] = useState(false);
  const [demoLoad,  setDemoLoad]= useState(false);
  const [error,     setError]   = useState('');

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please fill in both fields.'); return; }
    setLoading(true); setError('');
    await new Promise(r => setTimeout(r, 1400));
    setLoading(false);
    setError('Invalid credentials. Use Demo Login below to explore the panel.');
  };

  const navigate = useNavigate();

  const onDemo = async () => {
    setDemoLoad(true); setError('');
    await new Promise(r => setTimeout(r, 900));
    // Store demo user in localStorage (mirrors what real auth will do)
    localStorage.setItem('samayak_user', JSON.stringify({
      id:    'demo-admin',
      name:  'Demo Admin',
      email: 'admin@samayak.demo',
      role:  'ADMIN',
    }));
    localStorage.setItem('samayak_token', 'demo-token');
    setDemoLoad(false);
    navigate('/dashboard');
  };

  return (
    <div className="login-root">

      {/* ══════════════ LEFT — Brand gradient panel ══════════════ */}
      <div className="login-left">
        <div className="left-grid" />

        {/* Top: logo */}
        <div className="left-topbar">
          <AnugatLogo size={48} />
          <div className="left-brand">
            <span className="left-brand-name">Samayak</span>
            <span className="left-brand-sub">by Anugat AI</span>
          </div>
        </div>

        {/* Hero */}
        <div className="left-hero">
          <div className="left-eyebrow">
            <span className="left-eyebrow-dot" />
            Academic Operations Intelligence
          </div>

          <h2 className="left-title">Timetable</h2>
          <div className="typewriter-wrap">
            <span className="typewriter-static">Live</span>
            <span className="typewriter-word">{word}</span>
            <span className="typewriter-cursor" />
          </div>

          <p className="left-desc">
            Upload any department timetable PDF and Samayak instantly computes
            room utilisation, empty-slot probabilities, under-running courses,
            and idle infrastructure metrics — all in real time.
          </p>

          {/* Feature chips — Lucide icons */}
          <div className="left-chips">
            {CHIPS.map(({ Icon, label }) => (
              <span key={label} className="left-chip">
                <Icon size={13} strokeWidth={2.2} />
                {label}
              </span>
            ))}
          </div>

          {/* Stat cards */}
          <div className="left-stats">
            {STATS.map(s => (
              <div key={s.label} className="login-stat-card">
                <div className="login-stat-label">{s.label}</div>
                <div className="login-stat-value">{s.value}</div>
                <div className="login-stat-delta">{s.delta}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial — floating card */}
        <div className="testimonial-block testimonial-float">
          <Quote size={20} className="testimonial-quote-icon" strokeWidth={1.5} />
          <p className="testimonial-text">{TESTIMONIAL.quote}</p>
          <div className="testimonial-author">
            <div className="testimonial-avatar">{TESTIMONIAL.initials}</div>
            <div>
              <div className="testimonial-name">{TESTIMONIAL.name}</div>
              <div className="testimonial-role">{TESTIMONIAL.role}</div>
            </div>
          </div>
          {/* Institution stats row */}
          <div className="inst-stats-row">
            {INST_STATS.map(s => (
              <div key={s.label} className="inst-stat">
                <span className="inst-stat-value">{s.value}</span>
                <span className="inst-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════ RIGHT — Login form ══════════════ */}
      <div className="login-right">
        <div className="right-deco-1" />
        <div className="right-deco-2" />

        <div className="login-form-box">

          <div className="form-header">
            <h1 className="form-title">Welcome <span>back</span></h1>
            <p className="form-subtitle">Enter your credentials to access the admin panel.</p>
          </div>

          {error && (
            <div className="form-error">
              <AlertCircle size={14} strokeWidth={2.5} />
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={onSubmit} noValidate>

            <div className="form-field">
              <label className="form-label" htmlFor="email">Email address</label>
              <div className="form-input-wrap">
                <span className="form-input-icon"><Mail size={16} strokeWidth={2} /></span>
                <input
                  id="email" name="email" type="email"
                  className="form-input"
                  placeholder="you@university.edu"
                  value={form.email} onChange={onChange}
                  autoComplete="email"
                  disabled={loading || demoLoad}
                />
              </div>
            </div>

            <div className="form-field">
              <div className="form-label-row">
                <label className="form-label" htmlFor="password">Password</label>
                <a href="#" className="forgot-link">Forgot password?</a>
              </div>
              <div className="form-input-wrap">
                <span className="form-input-icon"><Lock size={16} strokeWidth={2} /></span>
                <input
                  id="password" name="password"
                  type={showPwd ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={form.password} onChange={onChange}
                  autoComplete="current-password"
                  disabled={loading || demoLoad}
                />
                <button type="button" className="form-input-toggle"
                  onClick={() => setShowPwd(v => !v)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  tabIndex={-1}>
                  {showPwd ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="remember-row">
              <input
                type="checkbox"
                className="remember-checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
              />
              <span className="remember-label">Remember me for 30 days</span>
            </label>

            <button id="btn-signin" type="submit" className="login-submit" disabled={loading || demoLoad}>
              {loading
                ? <><span className="spinner" />Signing in…</>
                : <>Sign In <ArrowRight size={16} strokeWidth={2.5} /></>}
            </button>
          </form>

          <div className="login-divider">
            <span className="login-divider-line" />
            <span className="login-divider-text">or try a demo</span>
            <span className="login-divider-line" />
          </div>

          <div className="demo-box">
            <div className="demo-box-header">
              <span className="demo-badge">
                <Zap size={10} fill="currentColor" strokeWidth={0} />
                Demo
              </span>
              <span className="demo-box-title">One click — no setup needed</span>
            </div>
            <div className="demo-creds">
              <div className="demo-cred-row">
                <span className="demo-cred-label">Email</span>
                <span className="demo-cred-value">admin@samayak.demo</span>
              </div>
              <div className="demo-cred-row">
                <span className="demo-cred-label">Password</span>
                <span className="demo-cred-value">demo1234</span>
              </div>
              <div className="demo-cred-row">
                <span className="demo-cred-label">Role</span>
                <span className="demo-cred-value">Super Admin · CSE, BIT Mesra</span>
              </div>
            </div>
            <button id="btn-demo-login" type="button" className="demo-login-btn"
              onClick={onDemo} disabled={loading || demoLoad}>
              {demoLoad
                ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />Logging in…</>
                : <>Continue as Demo Admin <ChevronRight size={16} strokeWidth={2.5} /></>}
            </button>
          </div>

          <p className="login-right-footer">
            Samayak by{' '}
            <a href="https://anugatai.com" target="_blank" rel="noopener noreferrer">Anugat AI</a>
            {' '}· Authorised access only
          </p>
        </div>
      </div>
    </div>
  );
}
