import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function formatTime(seconds) {
  if (!seconds) return '0m 0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Mini SVG bar chart for score trend
function ScoreTrendChart({ trend }) {
  if (!trend || trend.length === 0) return null;
  const maxScore = 20;
  const chartW = 100;
  const chartH = 60;
  const barW = Math.max(6, (chartW / trend.length) - 3);

  return (
    <svg
      viewBox={`0 0 ${chartW} ${chartH + 16}`}
      style={{ width: '100%', maxWidth: '480px', overflow: 'visible' }}
      aria-label="Score trend chart"
    >
      {trend.map((item, i) => {
        const barH = Math.max(2, (item.score / maxScore) * chartH);
        const x = i * (chartW / trend.length) + (chartW / trend.length - barW) / 2;
        const y = chartH - barH;
        const color = item.passed ? '#10b981' : '#ef4444';
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx="2" fill={color} opacity="0.85" />
            <text x={x + barW / 2} y={chartH + 12} textAnchor="middle" fontSize="5" fill="#9ca3af">
              {item.score}
            </text>
          </g>
        );
      })}
      {/* Dashed pass line at 12/20 */}
      <line
        x1="0" y1={chartH - (12 / maxScore) * chartH}
        x2={chartW} y2={chartH - (12 / maxScore) * chartH}
        stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.7"
      />
    </svg>
  );
}

export default function StudentProgress({ onBack }) {
  const { user, authHeader } = useAuth();
  const [nameInput, setNameInput] = useState(user?.username || localStorage.getItem('studentName') || '');
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    const defaultQuery = user?.username || localStorage.getItem('studentName');
    if (defaultQuery && defaultQuery.trim()) {
      handleFetch(defaultQuery.trim());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleFetch = async (name) => {
    const q = (name || nameInput).trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setFetched(false);
    try {
      const res = await fetch(`/api/tests/student/${encodeURIComponent(q)}/progress`, {
        headers: authHeader()
      });
      const data = await res.json();
      if (res.ok) {
        setProgress(data);
        setFetched(true);
        localStorage.setItem('studentName', q);
      } else {
        setError(data.message || 'Failed to fetch progress.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon, label, value, color, sub }) => (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)', padding: '1.25rem 1.5rem',
      display: 'flex', alignItems: 'center', gap: '1rem',
      backdropFilter: 'blur(8px)',
      transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
      cursor: 'default'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{
        width: '3rem', height: '3rem', borderRadius: '50%',
        background: `${color}22`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Header Card */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(14,165,233,0.08) 100%)',
        border: '1px solid var(--border-color-active)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', color: 'var(--text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
              fontSize: '0.9rem', transition: 'background var(--transition-fast)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            ← Back
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>📊 My Progress</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Track your test history, scores and improvement over time
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
              Student Account
            </label>
            <input
              id="progress-name-input"
              type="text"
              className="input-field"
              value={nameInput}
              readOnly
              disabled
              style={{ width: '100%', cursor: 'not-allowed', background: 'rgba(255,255,255,0.03)' }}
            />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--color-danger-light)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger)', fontSize: '0.9rem' }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Progress Results */}
      {fetched && progress && (
        <>
          {progress.totalTests === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📭</div>
              <h2 style={{ color: 'var(--text-secondary)' }}>No tests taken yet</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                <strong>{progress.username}</strong> hasn't attempted any tests. Start a mock test to track progress!
              </p>
              <button className="btn btn-primary" onClick={onBack} style={{ marginTop: '1.5rem' }}>
                Go to Tests →
              </button>
            </div>
          ) : (
            <>
              {/* Student identity banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem 1.5rem', background: 'var(--bg-card)',
                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                backdropFilter: 'blur(8px)', flexWrap: 'wrap'
              }}>
                <div style={{
                  width: '3rem', height: '3rem', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', fontWeight: 800, color: '#fff', flexShrink: 0
                }}>
                  {progress.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{progress.username}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {progress.totalTests} test{progress.totalTests !== 1 ? 's' : ''} attempted
                  </div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{
                    padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600,
                    background: progress.passRate >= 60 ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                    color: progress.passRate >= 60 ? 'var(--color-success)' : 'var(--color-danger)',
                    border: `1px solid ${progress.passRate >= 60 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                  }}>
                    {progress.passRate >= 60 ? '🏆 Good Progress' : '📈 Keep Practicing'}
                  </span>
                </div>
              </div>

              {/* Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '1rem' }}>
                <StatCard icon="📝" label="Tests Attempted" value={progress.totalTests} color="var(--color-primary)" />
                <StatCard icon="✅" label="Tests Passed" value={progress.passed} color="var(--color-success)" sub={`${progress.passRate}% pass rate`} />
                <StatCard icon="❌" label="Tests Failed" value={progress.failed} color="var(--color-danger)" />
                <StatCard icon="📊" label="Average Score" value={`${progress.averageScore}/20`} color="var(--color-secondary)" />
                <StatCard icon="🏆" label="Best Score" value={`${progress.bestScore}/20`} color="#f59e0b" />
                <StatCard icon="⏱️" label="Total Time Spent" value={formatTime(progress.totalTimeTaken)} color="#8b5cf6" />
              </div>

              {/* Score Trend Chart */}
              {progress.scoreTrend.length > 1 && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                        Score Trend — Last {progress.scoreTrend.length} Tests
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        <span style={{ color: '#10b981' }}>■</span> Pass &nbsp;
                        <span style={{ color: '#ef4444' }}>■</span> Fail &nbsp;
                        <span style={{ color: '#f59e0b' }}>- - -</span> Pass threshold (12/20)
                      </p>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {formatDate(progress.scoreTrend[0].date)} → {formatDate(progress.scoreTrend[progress.scoreTrend.length - 1].date)}
                    </div>
                  </div>
                  <ScoreTrendChart trend={progress.scoreTrend} />
                </div>
              )}

              {/* Pass Rate Bar */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700 }}>Pass Rate Breakdown</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      <span>Overall pass rate</span>
                      <span style={{ fontWeight: 700, color: progress.passRate >= 60 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {progress.passRate}%
                      </span>
                    </div>
                    <div style={{ height: '10px', background: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${progress.passRate}%`,
                        background: progress.passRate >= 60
                          ? 'linear-gradient(90deg, var(--color-success), #34d399)'
                          : 'linear-gradient(90deg, var(--color-danger), #fb7185)',
                        borderRadius: '5px', transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>{progress.passed} passed</span>
                      <span>{progress.failed} failed</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-success)' }}>{progress.passed}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Passed</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-danger)' }}>{progress.failed}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Failed</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test History Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>📋 Test History</h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Most recent {progress.recentSubmissions.length} attempts
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.025)' }}>
                        {['#', 'Test Name', 'Score', 'Result', 'Time Taken', 'Date'].map(h => (
                          <th key={h} style={{
                            padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600,
                            color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)',
                            fontSize: '0.8rem', whiteSpace: 'nowrap'
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {progress.recentSubmissions.map((sub, idx) => (
                        <tr key={sub._id}
                          style={{ borderBottom: '1px solid var(--border-color)', transition: 'background var(--transition-fast)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)', width: '40px' }}>{idx + 1}</td>
                          <td style={{ padding: '0.8rem 1rem', maxWidth: '260px' }}>
                            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {sub.testTitle}
                            </div>
                            {sub.isDynamic && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', background: 'var(--color-success-light)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                Random
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{
                                width: `${(sub.score / 20) * 60}px`, maxWidth: '60px', minWidth: '4px',
                                height: '6px', borderRadius: '3px',
                                background: sub.passed ? 'var(--color-success)' : 'var(--color-danger)'
                              }} />
                              <span style={{ fontWeight: 700, color: sub.passed ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                {sub.score}/20
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              ✓ {sub.correctAnswersCount} &nbsp; ✗ {sub.wrongAnswersCount}
                            </div>
                          </td>
                          <td style={{ padding: '0.8rem 1rem' }}>
                            <span style={{
                              padding: '0.3rem 0.75rem', borderRadius: '999px',
                              fontSize: '0.8rem', fontWeight: 600,
                              background: sub.passed ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                              color: sub.passed ? 'var(--color-success)' : 'var(--color-danger)',
                              border: `1px solid ${sub.passed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                            }}>
                              {sub.passed ? '✓ Pass' : '✗ Fail'}
                            </span>
                          </td>
                          <td style={{ padding: '0.8rem 1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {formatTime(sub.timeTaken)}
                          </td>
                          <td style={{ padding: '0.8rem 1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                            {formatDateTime(sub.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
