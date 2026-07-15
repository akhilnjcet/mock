import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(str) {
  if (!str) return 'Never';
  return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatTime(secs) {
  if (!secs) return '0m';
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = '700px' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)', maxWidth: width, width: '100%',
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.3rem', padding: '0.25rem' }}>✕</button>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ── User Detail Modal ─────────────────────────────────────────────────────────
function UserDetailModal({ userId, onClose, authHeader }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, { headers: authHeader() });
        if (res.ok) setData(await res.json());
      } finally { setLoading(false); }
    })();
  }, [userId]);

  if (loading) return (
    <Modal title="User Details" onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <svg style={{ animation: 'spin 1s linear infinite', width: '2rem', height: '2rem', color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.2 8H17" />
        </svg>
      </div>
    </Modal>
  );

  if (!data) return <Modal title="User Details" onClose={onClose}><div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Failed to load user.</div></Modal>;

  const { user, stats } = data;
  const infoRow = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.88rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value || '—'}</span>
    </div>
  );

  return (
    <Modal title={`👤 ${user.fullName}`} onClose={onClose} width="780px">
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Personal Info */}
        <div>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personal Information</h4>
          {infoRow('Full Name', user.fullName)}
          {infoRow('Username', `@${user.username}`)}
          {infoRow('Email', user.email)}
          {infoRow('Phone', user.phone)}
          {infoRow('Registered', formatDate(user.createdAt))}
          {infoRow('Last Login', formatDateTime(user.lastLogin))}
        </div>

        {/* Account Info */}
        <div>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account</h4>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 700, background: user.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'rgba(14,165,233,0.15)', color: user.role === 'admin' ? 'var(--color-primary)' : 'var(--color-secondary)', border: '1px solid rgba(99,102,241,0.2)' }}>
              {user.role.toUpperCase()}
            </span>
            <span style={{ padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 700, background: user.status === 'active' ? 'var(--color-success-light)' : 'var(--color-danger-light)', color: user.status === 'active' ? 'var(--color-success)' : 'var(--color-danger)', border: `1px solid ${user.status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              {user.status === 'active' ? '● Active' : '● Blocked'}
            </span>
          </div>
        </div>

        {/* Test Stats */}
        <div>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test Statistics</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {[
              { label: 'Total Tests', value: stats.totalTests, color: 'var(--color-primary)' },
              { label: 'Passed', value: stats.passed, color: 'var(--color-success)' },
              { label: 'Failed', value: stats.failed, color: 'var(--color-danger)' },
              { label: 'Best Score', value: `${stats.highestScore}/20`, color: '#f59e0b' },
              { label: 'Avg Score', value: `${stats.averageScore}/20`, color: 'var(--color-secondary)' },
              { label: 'Total Time', value: formatTime(stats.totalTimeTaken), color: '#8b5cf6' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color }}>{value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Submissions */}
        {stats.recentSubmissions.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Attempts</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['Test', 'Score', 'Result', 'Time', 'Date'].map(h => (
                      <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.78rem', borderBottom: '1px solid var(--border-color)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSubmissions.map(s => (
                    <tr key={s._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.6rem 0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.testTitle}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: s.passed ? 'var(--color-success)' : 'var(--color-danger)' }}>{s.score}/20</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: s.passed ? 'var(--color-success-light)' : 'var(--color-danger-light)', color: s.passed ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {s.passed ? '✓' : '✗'}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>{formatTime(s.timeTaken)}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{formatDate(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Reset Password Modal ──────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose, authHeader, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user._id}/reset-password`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (res.ok) { onSuccess(data.message); onClose(); }
      else setError(data.message || 'Failed to reset password.');
    } finally { setLoading(false); }
  };

  return (
    <Modal title={`Reset Password — ${user.username}`} onClose={onClose} width="420px">
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Set a new password for <strong>@{user.username}</strong>.</p>
        <input type="password" className="input-field" placeholder="New password (min 6 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%' }} />
        {error && <span style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>⚠️ {error}</span>}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={handle} disabled={loading} style={{ flex: 1 }}>{loading ? 'Resetting...' : 'Reset Password'}</button>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Edit User Modal ───────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, authHeader, onSuccess }) {
  const [form, setForm] = useState({ fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, status: user.status });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, { method: 'PUT', headers: authHeader(), body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) { onSuccess('User updated successfully.'); onClose(); }
      else setError(data.message || 'Failed to update user.');
    } finally { setLoading(false); }
  };

  return (
    <Modal title={`Edit User — ${user.username}`} onClose={onClose} width="500px">
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[['Full Name', 'fullName', 'text'], ['Email', 'email', 'email'], ['Phone', 'phone', 'text']].map(([label, field, type]) => (
          <div key={field}>
            <label className="input-label">{label}</label>
            <input type={type} className="input-field" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={{ width: '100%' }} />
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="input-label">Role</label>
            <select className="input-field" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%' }}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="input-label">Status</label>
            <select className="input-field" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ width: '100%' }}>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
        {error && <span style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>⚠️ {error}</span>}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={handle} disabled={loading} style={{ flex: 1 }}>{loading ? 'Saving...' : 'Save Changes'}</button>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main UserManagementTable ──────────────────────────────────────────────────
export default function UserManagementTable() {
  const { authHeader } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(null); // { type, user }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, filter, page, limit: 15 });
      const res = await fetch(`/api/admin/users?${params}`, { headers: authHeader() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
        setPages(data.pages);
      }
    } finally { setLoading(false); }
  }, [search, filter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleBlock = async (user) => {
    if (!confirm(`${user.status === 'blocked' ? 'Unblock' : 'Block'} user @${user.username}?`)) return;
    const res = await fetch(`/api/admin/users/${user._id}/block`, { method: 'PATCH', headers: authHeader() });
    const data = await res.json();
    if (res.ok) { showToast(data.message); fetchUsers(); }
  };

  const handleDelete = async (user) => {
    if (!confirm(`DELETE user @${user.username} and all their submissions? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${user._id}`, { method: 'DELETE', headers: authHeader() });
    const data = await res.json();
    if (res.ok) { showToast(data.message); fetchUsers(); }
    else showToast(`Error: ${data.message}`);
  };

  const StatusBadge = ({ user }) => (
    <span style={{
      padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
      background: user.status === 'active' ? 'var(--color-success-light)' : 'var(--color-danger-light)',
      color: user.status === 'active' ? 'var(--color-success)' : 'var(--color-danger)',
      border: `1px solid ${user.status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
    }}>
      {user.status === 'active' ? '● Active' : '● Blocked'}
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', padding: '0.85rem 1.25rem', background: 'var(--color-success)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem', zIndex: 2000, boxShadow: 'var(--shadow-lg)', animation: 'scaleUp 0.2s ease' }}>
          ✓ {toast}
        </div>
      )}

      {/* Filters row */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text" className="input-field" placeholder="🔍 Search name, username, email, phone..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: '220px' }}
        />
        <select className="input-field" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }} style={{ minWidth: '140px' }}>
          <option value="all">All Users</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          {total} user{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <svg style={{ animation: 'spin 1s linear infinite', width: '2rem', height: '2rem', color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.2 8H17" />
            </svg>
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No users found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Name', 'Username', 'Email', 'Phone', 'Registered', 'Status', 'Tests', 'Avg', 'Last Login', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}
                    style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0 }}>
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.fullName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>@{u.username}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{u.phone}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{formatDate(u.createdAt)}</td>
                    <td style={{ padding: '0.75rem 1rem' }}><StatusBadge user={u} /></td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--color-primary)' }}>{u.totalTests}</td>
                    <td style={{ padding: '0.75rem 1rem', color: u.avgScore >= 12 ? 'var(--color-success)' : u.avgScore > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>{u.avgScore > 0 ? `${u.avgScore}/20` : '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{formatDateTime(u.lastLogin)}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'nowrap' }}>
                        {[
                          { label: '👁', title: 'View Details', action: () => setModal({ type: 'view', user: u }) },
                          { label: '✏️', title: 'Edit User', action: () => setModal({ type: 'edit', user: u }) },
                          { label: '🔑', title: 'Reset Password', action: () => setModal({ type: 'reset', user: u }) },
                          { label: u.status === 'blocked' ? '✅' : '🚫', title: u.status === 'blocked' ? 'Unblock' : 'Block', action: () => handleBlock(u) },
                          { label: '🗑️', title: 'Delete', action: () => handleDelete(u), danger: true },
                        ].map(({ label, title, action, danger }) => (
                          <button key={title} onClick={action} title={title} style={{ padding: '0.3rem 0.5rem', background: danger ? 'var(--color-danger-light)' : 'rgba(255,255,255,0.05)', border: `1px solid ${danger ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.15s' }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: `1px solid ${p === page ? 'var(--color-primary)' : 'var(--border-color)'}`, background: p === page ? 'rgba(99,102,241,0.15)' : 'transparent', color: p === page ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: p === page ? 700 : 400 }}>{p}</button>
          ))}
        </div>
      )}

      {/* Modals */}
      {modal?.type === 'view' && <UserDetailModal userId={modal.user._id} onClose={() => setModal(null)} authHeader={authHeader} />}
      {modal?.type === 'edit' && <EditUserModal user={modal.user} onClose={() => { setModal(null); fetchUsers(); }} authHeader={authHeader} onSuccess={showToast} />}
      {modal?.type === 'reset' && <ResetPasswordModal user={modal.user} onClose={() => setModal(null)} authHeader={authHeader} onSuccess={showToast} />}
    </div>
  );
}
