import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

// ─── localStorage helpers ────────────────────────────────────────────────────
const EXAM_KEY = 'activeExam';
const RESULT_KEY = 'lastExamResult';

function saveExamState(state) {
  localStorage.setItem(EXAM_KEY, JSON.stringify(state));
}
function clearExamState() {
  localStorage.removeItem(EXAM_KEY);
}
export function saveLastResult(result) {
  const prev = JSON.parse(localStorage.getItem(RESULT_KEY) || '{}');
  const bestScore = Math.max(result.score, prev.bestScore || 0);
  localStorage.setItem(RESULT_KEY, JSON.stringify({ ...result, bestScore }));
}
// ─────────────────────────────────────────────────────────────────────────────

export default function TestPlayer({ test, onSubmitTest, onCancel }) {
  const { user, authHeader } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [username] = useState(user?.username || localStorage.getItem('studentName') || 'Guest');
  const [answers, setAnswers] = useState(Array(20).fill(null));
  const [flagged, setFlagged] = useState(Array(20).fill(false));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Persist exam state to localStorage every time answers/flags change ──
  useEffect(() => {
    saveExamState({
      active: true,
      testId: test._id,
      testTitle: test.title,
      totalQuestions: 20,
      answeredCount: answers.filter(a => a !== null).length,
      flaggedCount: flagged.filter(Boolean).length,
      startTime: startTimeRef.current,
      secondsElapsed,
    });
  }, [answers, flagged, secondsElapsed, test._id, test.title]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      // Only clear if submitted (handled in handleSubmit)
    };
  }, []);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const currentQuestion = test.questions[currentIdx];
  const selectedAnswer = answers[currentIdx];
  const isFlagged = flagged[currentIdx];

  const handleOptionSelect = (optionIdx) => {
    const updated = [...answers];
    updated[currentIdx] = optionIdx;
    setAnswers(updated);
  };

  const handleToggleFlag = () => {
    const updated = [...flagged];
    updated[currentIdx] = !updated[currentIdx];
    setFlagged(updated);
  };

  const handleNext = () => {
    if (currentIdx < 19) setCurrentIdx(currentIdx + 1);
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const handleSubmit = async () => {
    const allAnswered = answers.every(a => a !== null && a !== undefined);
    if (!allAnswered) {
      alert('Please answer all 20 questions before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nameToSubmit = username.trim() || 'Guest Student';
      localStorage.setItem('studentName', nameToSubmit);

      const res = await fetch(`/api/tests/${test._id}/submit`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ username: nameToSubmit, answers, timeTaken: secondsElapsed }),
      });

      if (res.ok) {
        const data = await res.json();
        // Persist result + clear active exam
        clearExamState();
        saveLastResult({
          score: data.score,
          passed: data.passed,
          correctAnswersCount: data.correctAnswersCount,
          wrongAnswersCount: data.wrongAnswersCount,
          timeTaken: secondsElapsed,
          testTitle: test.title,
          date: new Date().toISOString(),
        });
        onSubmitTest(data);
      } else {
        alert('Failed to submit test results.');
      }
    } catch (err) {
      console.error('Error submitting test:', err);
      alert('Network error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuit = () => {
    clearExamState();
    onCancel();
  };

  const answeredCount = answers.filter(a => a !== null).length;
  const flaggedCount = flagged.filter(Boolean).length;
  const progressPercent = (answeredCount / 20) * 100;
  const isLastQuestion = currentIdx === 19;
  const allQuestionsAnswered = answers.every(a => a !== null && a !== undefined);

  return (
    <div className="player-container card" style={{ position: 'relative' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem',
        marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>{test.title}</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            {test.description || 'Mock Test'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Timer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(99,102,241,0.1)', border: '1px solid var(--color-primary)',
            borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem',
            color: 'var(--color-primary)', fontWeight: 700, fontSize: '1rem', fontFamily: 'monospace'
          }}>
            <svg style={{ width: '1.1rem', height: '1.1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatTime(secondsElapsed)}
          </div>
          {/* Mini stats */}
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '0.3rem 0.6rem', background: 'var(--color-success-light)', color: 'var(--color-success)', borderRadius: '6px', fontWeight: 600 }}>
              ✓ {answeredCount}
            </span>
            <span style={{ padding: '0.3rem 0.6rem', background: 'var(--color-danger-light)', color: 'var(--color-danger)', borderRadius: '6px', fontWeight: 600 }}>
              ○ {20 - answeredCount}
            </span>
            {flaggedCount > 0 && (
              <span style={{ padding: '0.3rem 0.6rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '6px', fontWeight: 600 }}>
                🚩 {flaggedCount}
              </span>
            )}
          </div>
          <button onClick={handleQuit} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            Quit Test
          </button>
        </div>
      </div>

      {/* ── Question Map ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          <span>Questions Map</span>
          <span>{answeredCount} of 20 Answered</span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {Array(20).fill(0).map((_, idx) => {
            const isCurrent = currentIdx === idx;
            const isAnswered = answers[idx] !== null;
            const isQFlagged = flagged[idx];
            return (
              <button
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                title={isQFlagged ? 'Flagged' : undefined}
                style={{
                  width: '2rem', height: '2rem', borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  border: isCurrent ? '2px solid var(--color-primary)' : isQFlagged ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                  backgroundColor: isCurrent
                    ? 'rgba(99,102,241,0.15)'
                    : isQFlagged
                      ? 'rgba(245,158,11,0.12)'
                      : isAnswered
                        ? 'rgba(16,185,129,0.15)'
                        : 'var(--bg-card)',
                  color: isCurrent
                    ? 'var(--color-primary)'
                    : isQFlagged
                      ? '#f59e0b'
                      : isAnswered
                        ? 'var(--color-success)'
                        : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%`, backgroundColor: 'var(--color-success)' }} />
        </div>
      </div>

      {/* ── Question Panel ──────────────────────────────────────────────────── */}
      <div style={{ animation: 'scaleUp 0.2s ease-out', minHeight: '220px' }} key={currentIdx}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span className="player-q-num" style={{ margin: 0 }}>Question {currentIdx + 1}</span>
          {/* Flag button */}
          <button
            onClick={handleToggleFlag}
            style={{
              background: isFlagged ? 'rgba(245,158,11,0.15)' : 'transparent',
              border: `1px solid ${isFlagged ? '#f59e0b' : 'var(--border-color)'}`,
              borderRadius: '8px', padding: '0.35rem 0.75rem',
              color: isFlagged ? '#f59e0b' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              transition: 'all 0.2s'
            }}
          >
            🚩 {isFlagged ? 'Flagged' : 'Flag for Review'}
          </button>
        </div>

        <div className="player-question-text" style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.5rem', lineHeight: '1.6' }}>
          {currentQuestion.questionText}
        </div>

        <div className="options-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const letter = String.fromCharCode(65 + idx);
            return (
              <div
                key={idx}
                className={`option-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                  border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  backgroundColor: isSelected ? 'rgba(99,102,241,0.05)' : 'var(--bg-card)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div className="option-badge" style={{
                  width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--border-color)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                }}>
                  {letter}
                </div>
                <div className="option-text" style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                  {option}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="player-footer" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
        <button onClick={handlePrev} className="btn btn-secondary" disabled={currentIdx === 0} style={{ padding: '0.6rem 1.2rem' }}>
          ← Previous
        </button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {!isLastQuestion && (
            <button onClick={handleNext} className="btn btn-primary" style={{ padding: '0.6rem 1.2rem' }}>
              Next →
            </button>
          )}
          {(isLastQuestion || allQuestionsAnswered) && (
            <button
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={!allQuestionsAnswered || isSubmitting}
              style={{ background: 'var(--color-success)', boxShadow: '0 4px 12px rgba(16,185,129,0.25)', padding: '0.6rem 1.5rem' }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Test'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
