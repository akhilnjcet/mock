import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

// ─── localStorage keys (must match TestPlayer) ────────────────────────────────
const EXAM_KEY = 'activeExam';
const RESULT_KEY = 'lastExamResult';

function readExamState() {
  try { return JSON.parse(localStorage.getItem(EXAM_KEY) || 'null'); } catch { return null; }
}
function readLastResult() {
  try { return JSON.parse(localStorage.getItem(RESULT_KEY) || 'null'); } catch { return null; }
}

function formatTime(secs) {
  if (!secs && secs !== 0) return '00:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Circular Progress Ring ──────────────────────────────────────────────────
function ProgressRing({ pct, size = 80, stroke = 7, color = 'var(--color-primary)' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-color)" strokeWidth={stroke} />
      <circle
         cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  );
}

// ─── ExamProgress Panel ───────────────────────────────────────────────────────
function ExamProgress({ onStartExam, onResumeExam, generating }) {
  const [examState, setExamState] = useState(readExamState);
  const [lastResult, setLastResult] = useState(readLastResult);
  const [liveSeconds, setLiveSeconds] = useState(0);

  // Poll localStorage every second for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      const state = readExamState();
      setExamState(state);
      setLastResult(readLastResult());
      if (state && state.active && state.startTime) {
        setLiveSeconds(Math.floor((Date.now() - state.startTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isActive = !!(examState && examState.active);
  const answered = isActive ? (examState.answeredCount || 0) : 0;
  const total = isActive ? (examState.totalQuestions || 20) : 20;
  const remaining = total - answered;
  const flagged = isActive ? (examState.flaggedCount || 0) : 0;
  const pct = isActive ? Math.round((answered / total) * 100) : 0;
  const elapsed = isActive ? liveSeconds : 0;

  const bestScore = lastResult ? (lastResult.bestScore || lastResult.score || 0) : 0;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${isActive ? 'var(--border-color-active)' : 'var(--border-color)'}`,
      borderRadius: 'var(--radius-lg)',
      backdropFilter: 'blur(12px)',
      overflow: 'hidden',
      boxShadow: isActive ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
      transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {/* Panel Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: isActive
          ? 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(14,165,233,0.06) 100%)'
          : 'transparent',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.1rem' }}>📊</span>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Exam Progress</h3>
        </div>
        {isActive && (
          <span style={{
            padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
            background: 'rgba(16,185,129,0.15)', color: 'var(--color-success)',
            border: '1px solid rgba(16,185,129,0.3)',
          }}>
            Active
          </span>
        )}
      </div>

      {/* Content Area */}
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {isActive ? (
          <>
            {/* Live Progress Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ProgressRing pct={pct} size={90} stroke={8} color="var(--color-primary)" />
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)', lineHeight: 1 }}>{pct}%</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem', textTransform: 'uppercase' }}>Done</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Exam</span>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {examState.testTitle}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  ⏱ Time: <strong style={{ color: 'var(--color-primary)' }}>{formatTime(elapsed)}</strong>
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-success)' }}>{answered}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Answered</div>
              </div>
              <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>{remaining}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Remaining</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f59e0b' }}>{flagged}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Flagged</div>
              </div>
            </div>

            {/* Resume button */}
            <button
              onClick={onResumeExam}
              className="btn btn-primary"
              style={{
                width: '100%', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              ▶ Resume Exam
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header info */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0.5rem',
              background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)', textAlign: 'center'
            }}>
              <div style={{
                width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(14,165,233,0.15))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem',
              }}>📋</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginTop: '0.5rem' }}>No Active Exam</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Start a new exam to track your progress
              </div>
            </div>

            {/* Start Exam */}
            <button
              onClick={onStartExam}
              className="btn btn-primary"
              disabled={generating}
              style={{
                width: '100%', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              {generating ? (
                <>
                  <svg style={{ animation: 'spin 1s linear infinite', width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.2 8H17" />
                  </svg>
                  Preparing...
                </>
              ) : (
                <> 🎯 Start New Exam </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TestList (Main Component) ────────────────────────────────────────────────
export default function TestList({ onSelectTest, onResumeExam }) {
  const { user, authHeader } = useAuth();
  const [studentName, setStudentName] = useState(user?.fullName || user?.username || '');
  const [generating, setGenerating] = useState(false);

  // Sync state if user changes
  useEffect(() => {
    if (user) {
      setStudentName(user.fullName || user.username || '');
    }
  }, [user]);

  const handleStartRandomTest = useCallback(async () => {
    const name = studentName.trim();
    if (!name) {
      alert('Please enter your name in the field below before starting a test.');
      return;
    }
    localStorage.setItem('studentName', name);
    setGenerating(true);
    try {
      const res = await fetch('/api/tests/generate', {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ username: name }),
      });
      if (res.ok) {
        const data = await res.json();
        onSelectTest(data._id);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to generate test.');
      }
    } catch {
      alert('Network error while generating test.');
    } finally {
      setGenerating(false);
    }
  }, [studentName, onSelectTest]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Hero Intro Card ─────────────────────────────────────────────────── */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(14,165,233,0.05) 100%)',
        border: '1px solid var(--border-color-active)',
      }}>
        <h1 style={{ marginBottom: '0.75rem' }}>Drive Your Learning Forward</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6', maxWidth: '700px' }}>
          Practice Kerala Motor Vehicles badge test questions. Each exam contains 20 MCQs.
          Score 12 or above to pass.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { icon: '✅', text: '20 Questions per Test' },
            { icon: '🎯', text: '12/20 Passing Score' },
            { icon: '🔀', text: 'Randomised Each Time' },
            { icon: '📊', text: 'Detailed Review & Progress' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-column layout: Start Test | Exam Progress ───────────────────── */}
      <div className="dashboard-columns-grid">

        {/* LEFT — Start Test card */}
        <div className="card start-test-card" style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.03) 0%, rgba(5,150,105,0.07) 100%)',
          border: '1px solid var(--color-success)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <span className="badge" style={{ backgroundColor: 'var(--color-success)', color: '#fff' }}>Live</span>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>വ്യക്തിഗത മോക്ക് പരീക്ഷ</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            മുഴുവൻ ചോദ്യശേഖരത്തിൽ നിന്നും ക്രമരഹിതമായി തിരഞ്ഞെടുത്ത 20 ചോദ്യങ്ങൾ അടങ്ങിയ പരീക്ഷ.
            നിങ്ങൾ മുൻപ് നേരിട്ട ചോദ്യങ്ങൾ ആവർത്തിക്കാനുള്ള സാധ്യത കുറവായിരിക്കും.
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Logged In As
            </label>
            <input
              type="text"
              className="input-field"
              value={studentName}
              readOnly
              disabled
              style={{ width: '100%', cursor: 'not-allowed', background: 'rgba(255,255,255,0.03)' }}
            />
          </div>

          <button
            onClick={handleStartRandomTest}
            className="btn btn-primary start-test-btn"
            disabled={generating}
            style={{
              width: '100%', background: 'var(--color-success)',
              padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              fontWeight: 700,
            }}
          >
            {generating ? (
              <>
                <svg style={{ animation: 'spin 1s linear infinite', width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.2 8H17" />
                </svg>
                പരീക്ഷ തയ്യാറാക്കുന്നു...
              </>
            ) : '🚀 പരീക്ഷ ആരംഭിക്കുക (Start Test)'}
          </button>
        </div>

        {/* RIGHT — Exam Progress panel */}
        <ExamProgress
          onStartExam={handleStartRandomTest}
          onResumeExam={onResumeExam}
          generating={generating}
        />
      </div>
    </div>
  );
}
