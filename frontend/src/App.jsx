import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TestList from './components/TestList';
import AdminDashboard from './components/AdminDashboard';
import TestPlayer from './components/TestPlayer';
import TestResult from './components/TestResult';
import StudentProgress from './components/StudentProgress';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import { useAuth } from './context/AuthContext';

const EXAM_KEY = 'activeExam';

export default function App() {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState('list'); // 'list', 'admin', 'player', 'result', 'progress'
  const [authView, setAuthView] = useState('login'); // 'login', 'register'
  const [activeTest, setActiveTest] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [loadingTest, setLoadingTest] = useState(false);

  // Redirect non-admins if they try to access admin panel
  useEffect(() => {
    if (currentView === 'admin' && !isAdmin) {
      setCurrentView('list');
    }
  }, [currentView, isAdmin]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleSelectTest = async (testId) => {
    setLoadingTest(true);
    try {
      const res = await fetch(`/api/tests/${testId}`);
      if (res.ok) {
        const testData = await res.json();
        setActiveTest(testData);
        setCurrentView('player');
      } else {
        alert('Failed to load test details.');
      }
    } catch {
      alert('Network error while loading test details.');
    } finally {
      setLoadingTest(false);
    }
  };

  // Resume exam from localStorage – reload the same test from the server
  const handleResumeExam = async () => {
    try {
      const saved = JSON.parse(localStorage.getItem(EXAM_KEY) || 'null');
      if (!saved || !saved.testId) {
        alert('No active exam found to resume.');
        return;
      }
      setLoadingTest(true);
      const res = await fetch(`/api/tests/${saved.testId}`);
      if (res.ok) {
        const testData = await res.json();
        setActiveTest(testData);
        setCurrentView('player');
      } else {
        // Test might be deleted — clear stale state
        localStorage.removeItem(EXAM_KEY);
        alert('Could not resume – the exam may no longer exist.');
      }
    } catch {
      alert('Network error while resuming exam.');
    } finally {
      setLoadingTest(false);
    }
  };

  const handleSubmitTest = (resultData) => {
    setTestResult(resultData);
    // Go directly to the review screen
    setCurrentView('result');
    setActiveTest(null);
  };

  const handleBackToHome = () => {
    setActiveTest(null);
    setTestResult(null);
    setCurrentView('list');
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', background: 'var(--bg-app)' }}>
        <svg style={{ animation: 'spin 1.5s linear infinite', width: '3rem', height: '3rem', color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.2 8H17" />
        </svg>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Verifying Session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem 1rem' }}>
        {authView === 'login' ? (
          <LoginPage onSwitchToRegister={() => setAuthView('register')} />
        ) : (
          <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main>
        {loadingTest ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10rem 0', gap: '1rem' }}>
            <svg style={{ animation: 'spin 1.5s linear infinite', width: '3rem', height: '3rem', color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.2 8H17" />
            </svg>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading Test...</span>
          </div>
        ) : (
          <>
            {/* Result banner shown above list when just completed */}
            {currentView === 'list' && testResult && (
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                background: testResult.passed ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                border: `1px solid ${testResult.passed ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{testResult.passed ? '🏆' : '📈'}</span>
                  <div>
                    <strong style={{ color: testResult.passed ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {testResult.passed ? 'Congratulations! You Passed!' : 'Keep Practicing!'}
                    </strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      You scored <strong>{testResult.score}/20</strong> — {testResult.correctAnswersCount} correct, {testResult.wrongAnswersCount} wrong
                    </div>
                  </div>
                </div>
                <button onClick={() => setTestResult(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }}>✕</button>
              </div>
            )}

            {currentView === 'list' && (
              <TestList
                onSelectTest={handleSelectTest}
                onResumeExam={handleResumeExam}
              />
            )}

            {currentView === 'admin' && (
              <AdminDashboard onSelectTest={handleSelectTest} />
            )}

            {currentView === 'progress' && (
              <StudentProgress onBack={handleBackToHome} />
            )}

            {currentView === 'result' && testResult && (
              <TestResult result={testResult} onBackToHome={handleBackToHome} />
            )}

            {currentView === 'player' && activeTest && (
              <TestPlayer
                test={activeTest}
                onSubmitTest={handleSubmitTest}
                onCancel={handleBackToHome}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
