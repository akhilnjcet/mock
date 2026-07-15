import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ currentView, onViewChange, theme, toggleTheme }) {
  const { user, logout, isAdmin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  const navBtn = (view, label, exactViews = []) => {
    const active = currentView === view || exactViews.includes(currentView);
    return (
      <button
        onClick={() => onViewChange(view)}
        className={`nav-link ${active ? 'active' : ''}`}
      >
        {label}
      </button>
    );
  };

  return (
    <header className="navbar">
      <div className="nav-brand" onClick={() => onViewChange('list')} style={{ cursor: 'pointer' }}>
        <svg className="brand-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span>MCQ Mock Hub</span>
      </div>

      <div className="nav-links">
        {navBtn('list', 'Mock Tests', ['player', 'result'])}
        {navBtn('progress', 'My Progress')}
        {isAdmin && navBtn('admin', 'Admin Portal')}

        {/* Theme toggle */}
        <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme" title="Switch theme">
          {theme === 'dark' ? (
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.828 5.657a8 8 0 11-16 0 8 8 0 0116 0z" />
            </svg>
          ) : (
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* User avatar + dropdown */}
        {user && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              id="user-avatar-btn"
              onClick={() => setDropdownOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '999px', padding: '0.3rem 0.75rem 0.3rem 0.35rem',
                cursor: 'pointer', color: 'var(--text-primary)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <div style={{
                width: '1.8rem', height: '1.8rem', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0
              }}>
                {user.fullName?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.fullName?.split(' ')[0]}
              </span>
              <svg style={{ width: '0.85rem', height: '0.85rem', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : '' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 0.5rem)',
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)', minWidth: '200px', zIndex: 100,
                boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(12px)',
                overflow: 'hidden', animation: 'scaleUp 0.15s ease'
              }}>
                {/* User info header */}
                <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.fullName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>@{user.username}</div>
                  <div style={{ marginTop: '0.3rem' }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px',
                      background: isAdmin ? 'rgba(99,102,241,0.15)' : 'rgba(14,165,233,0.15)',
                      color: isAdmin ? 'var(--color-primary)' : 'var(--color-secondary)'
                    }}>
                      {isAdmin ? '👑 Admin' : '👤 User'}
                    </span>
                  </div>
                </div>

                {/* Menu items */}
                {[
                  { label: '📊 My Progress', action: () => { onViewChange('progress'); setDropdownOpen(false); } },
                  { label: '🔑 Change Password', action: () => { onViewChange('changePassword'); setDropdownOpen(false); } },
                ].map(({ label, action }) => (
                  <button key={label} onClick={action} style={{
                    width: '100%', display: 'block', padding: '0.7rem 1rem',
                    background: 'none', border: 'none', textAlign: 'left',
                    color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.88rem',
                    transition: 'background 0.15s', borderBottom: '1px solid var(--border-color)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    {label}
                  </button>
                ))}

                <button onClick={handleLogout} style={{
                  width: '100%', display: 'block', padding: '0.7rem 1rem',
                  background: 'none', border: 'none', textAlign: 'left',
                  color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.88rem',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-danger-light)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
