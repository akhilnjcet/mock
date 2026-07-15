import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function FieldError({ msg }) {
  if (!msg) return null;
  return <span style={{ fontSize: '0.78rem', color: 'var(--color-danger)', marginTop: '0.25rem', display: 'block' }}>{msg}</span>;
}

export default function RegisterPage({ onSwitchToLogin }) {
  const { login } = useAuth();
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', username: '', password: '', confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  // Check username availability with debounce
  useEffect(() => {
    if (!form.username || form.username.length < 3) { setUsernameStatus(null); return; }
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(form.username)}`);
        const data = await res.json();
        setUsernameStatus(data.available ? 'available' : 'taken');
      } catch { setUsernameStatus(null); }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.username]);

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email.';
    if (!form.phone.trim()) e.phone = 'Phone is required.';
    else if (!/^\d{10}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit phone number.';
    if (!form.username.trim()) e.username = 'Username is required.';
    else if (form.username.length < 3) e.username = 'Username must be at least 3 characters.';
    else if (usernameStatus === 'taken') e.username = 'Username is already taken.';
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setApiError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
      } else {
        setApiError(data.message || 'Registration failed.');
      }
    } catch {
      setApiError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const usernameIcon = {
    checking: <span style={{ color: 'var(--text-muted)' }}>⏳</span>,
    available: <span style={{ color: 'var(--color-success)' }}>✓ Available</span>,
    taken: <span style={{ color: 'var(--color-danger)' }}>✗ Taken</span>
  }[usernameStatus] || null;

  const Field = ({ id, label, type = 'text', field, placeholder, autoComplete, extra }) => (
    <div>
      <label className="input-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={type}
          className={`input-field ${errors[field] ? 'error' : ''}`}
          placeholder={placeholder}
          value={form[field]}
          onChange={set(field)}
          autoComplete={autoComplete}
          style={{ width: '100%' }}
        />
        {extra}
      </div>
      <FieldError msg={errors[field]} />
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', background: 'var(--bg-app)'
    }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '3.5rem', height: '3.5rem', borderRadius: '50%', margin: '0 auto 0.75rem',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
          }}>🎓</div>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.35rem' }}>Create Account</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>Join MCQ Mock Hub today</p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {apiError && (
            <div style={{
              padding: '0.75rem 1rem', marginBottom: '1.25rem', borderRadius: 'var(--radius-sm)',
              background: 'var(--color-danger-light)', border: '1px solid rgba(239,68,68,0.3)',
              color: 'var(--color-danger)', fontSize: '0.9rem'
            }}>⚠️ {apiError}</div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field id="reg-fullname" label="Full Name" field="fullName" placeholder="John Doe" autoComplete="name" />
              <Field id="reg-phone" label="Phone Number" field="phone" placeholder="9876543210" autoComplete="tel" />
            </div>

            <Field id="reg-email" label="Email Address" type="email" field="email" placeholder="you@example.com" autoComplete="email" />

            <div>
              <label className="input-label">Username</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-username"
                  type="text"
                  className={`input-field ${errors.username ? 'error' : ''}`}
                  placeholder="your_username"
                  value={form.username}
                  onChange={set('username')}
                  autoComplete="username"
                  style={{ width: '100%', paddingRight: '7rem' }}
                />
                {usernameIcon && (
                  <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', fontWeight: 600 }}>
                    {usernameIcon}
                  </span>
                )}
              </div>
              <FieldError msg={errors.username} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="input-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`input-field ${errors.password ? 'error' : ''}`}
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={set('password')}
                    autoComplete="new-password"
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
                <FieldError msg={errors.password} />
              </div>
              <div>
                <label className="input-label">Confirm Password</label>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`input-field ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  autoComplete="new-password"
                  style={{ width: '100%' }}
                />
                <FieldError msg={errors.confirmPassword} />
              </div>
            </div>

            <button
              id="reg-submit-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading || usernameStatus === 'taken'}
              style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <svg style={{ animation: 'spin 1s linear infinite', width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.2 8H17" />
                  </svg>
                  Creating Account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <button onClick={onSwitchToLogin}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 600, padding: 0 }}>
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
