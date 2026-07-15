import React from 'react';

export default function TestResult({ result, onBackToHome }) {
  const { score, correctAnswersCount, wrongAnswersCount, passed, timeTaken, detailedReview } = result;
  const percentage = (score / 20) * 100;

  const formatTime = (secs) => {
    if (!secs && secs !== 0) return '00:00';
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* PASS/FAIL Header Card */}
      <div className={`card result-header-box ${passed ? 'pass' : 'fail'}`}>
        <div className="status-badge">
          {passed ? 'PASS' : 'FAIL'}
        </div>
        <div className="score-text">
          You scored {score} out of 20
        </div>
        <div className="score-subtext">
          {passed 
            ? `Congratulations! You cleared the test with an accuracy of ${percentage}%.` 
            : `You need at least 12 correct answers (60%) to pass. Keep practicing!`
          }
        </div>
      </div>

      {/* Stats Breakdown Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Questions</div>
          <div className="stat-value">20</div>
        </div>
        <div className="stat-card correct-stat">
          <div className="stat-label">Correct</div>
          <div className="stat-value">{correctAnswersCount}</div>
        </div>
        <div className="stat-card wrong-stat">
          <div className="stat-label">Incorrect</div>
          <div className="stat-value">{wrongAnswersCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Time Taken</div>
          <div className="stat-value" style={{ fontFamily: 'monospace' }}>{formatTime(timeTaken)}</div>
        </div>
      </div>

      {/* Detailed Question-by-Question Review */}
      <div className="card">
        <h3 className="review-title">Detailed Question Review</h3>
        
        <div className="review-list">
          {detailedReview.map((item, idx) => {
            return (
              <div key={idx} className={`review-item ${item.isCorrect ? 'correct' : 'wrong'}`}>
                <div className="review-header">
                  <span className="review-number">Question {idx + 1} of 20</span>
                  <span className="review-indicator">
                    {item.isCorrect ? (
                      <>
                        <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Correct
                      </>
                    ) : (
                      <>
                        <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Incorrect
                      </>
                    )}
                  </span>
                </div>

                <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  {item.questionText}
                </div>

                <div className="review-options-list">
                  {item.options.map((option, optIdx) => {
                    const isCorrectChoice = optIdx === item.correctAnswerIndex;
                    const isSelectedChoice = optIdx === item.selectedAnswerIndex;
                    
                    let choiceClass = '';
                    if (isCorrectChoice) {
                      choiceClass = 'correct-choice';
                    } else if (isSelectedChoice && !item.isCorrect) {
                      choiceClass = 'wrong-choice';
                    }
                    
                    return (
                      <div key={optIdx} className={`review-option ${choiceClass}`}>
                        <div 
                          className="option-badge" 
                          style={{ 
                            background: isCorrectChoice 
                              ? 'var(--color-success)' 
                              : isSelectedChoice 
                              ? 'var(--color-danger)' 
                              : 'rgba(0,0,0,0.2)',
                            color: (isCorrectChoice || isSelectedChoice) ? '#ffffff' : 'var(--text-secondary)',
                            borderColor: isCorrectChoice 
                              ? 'var(--color-success)' 
                              : isSelectedChoice 
                              ? 'var(--color-danger)' 
                              : 'var(--border-color)'
                          }}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </div>
                        <span style={{ flex: 1 }}>{option}</span>
                        {isCorrectChoice && (
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase' }}>
                            Correct Answer
                          </span>
                        )}
                        {isSelectedChoice && !item.isCorrect && (
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-danger)', textTransform: 'uppercase' }}>
                            Your Selection
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation text */}
                {item.explanation && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(99, 102, 241, 0.05)',
                    borderLeft: '4px solid var(--color-primary)',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)'
                  }}>
                    <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--color-primary)' }}>വിശദീകരണം (Explanation):</strong>
                    {item.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', textAlign: 'center' }}>
          <button onClick={onBackToHome} className="btn btn-primary" style={{ padding: '0.6rem 1.8rem' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
