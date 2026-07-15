import React, { useState } from 'react';

export default function TestPreviewEditor({ initialQuestions, defaultTitle, onSave, onCancel }) {
  const [title, setTitle] = useState(defaultTitle || 'New MCQ Mock Test');
  const [description, setDescription] = useState('MCQ Mock Test extracted from PDF.');
  
  // Initialize with the extracted questions
  const [questions, setQuestions] = useState(
    initialQuestions.map((q, idx) => ({
      id: idx,
      questionText: q.questionText || '',
      options: q.options && q.options.length === 4 ? [...q.options] : ['', '', '', ''],
      correctAnswerIndex: q.correctAnswerIndex !== undefined ? q.correctAnswerIndex : 0
    }))
  );

  const handleQuestionTextChange = (index, value) => {
    const updated = [...questions];
    updated[index].questionText = value;
    setQuestions(updated);
  };

  const handleOptionTextChange = (qIndex, optIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const handleCorrectOptionChange = (qIndex, optIndex) => {
    const updated = [...questions];
    updated[qIndex].correctAnswerIndex = optIndex;
    setQuestions(updated);
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        questionText: '',
        options: ['', '', '', ''],
        correctAnswerIndex: 0
      }
    ]);
  };

  const handleDeleteQuestion = (index) => {
    const updated = questions.filter((_, idx) => idx !== index);
    setQuestions(updated);
  };

  const handleSaveClick = () => {
    if (!title.trim()) {
      alert('Please enter a mock test title.');
      return;
    }

    if (questions.length !== 20) {
      alert(`A mock test must contain exactly 20 questions. Current count: ${questions.length}`);
      return;
    }

    // Check for empty fields
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        alert(`Question ${i + 1} text is empty. All fields must be filled.`);
        return;
      }
      for (let j = 0; j < 4; j++) {
        if (!q.options[j].trim()) {
          alert(`Option ${String.fromCharCode(65 + j)} for Question ${i + 1} is empty.`);
          return;
        }
      }
    }

    onSave({
      title,
      description,
      questions: questions.map(q => ({
        questionText: q.questionText,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex
      }))
    });
  };

  const isCountValid = questions.length === 20;

  return (
    <div className="card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="editor-header">
        <div className="editor-meta-inputs">
          <div className="input-group">
            <label className="input-label">Test Title</label>
            <input 
              type="text" 
              className="input-field" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g. Kerala Badges Test"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Test Description</label>
            <input 
              type="text" 
              className="input-field" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Short description of this test"
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignSelf: 'flex-end' }}>
          <button onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button 
            onClick={handleSaveClick} 
            className="btn btn-primary"
            disabled={!isCountValid}
          >
            Save Mock Test
          </button>
        </div>
      </div>

      <div style={{ margin: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: isCountValid ? 'var(--color-success)' : 'var(--color-danger)' }}>
          Total Questions: {questions.length} / 20 
          {!isCountValid && ` (Exactly 20 required)`}
        </div>
        
        <button onClick={handleAddQuestion} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          + Add Question
        </button>
      </div>

      <div className="editor-question-list">
        {questions.map((q, qIdx) => (
          <div key={q.id || qIdx} className="editor-q-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="editor-q-num">Question {qIdx + 1}</div>
              <button 
                onClick={() => handleDeleteQuestion(qIdx)} 
                className="btn btn-danger"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}
              >
                Remove
              </button>
            </div>

            <textarea 
              className="input-field" 
              rows={2}
              value={q.questionText}
              onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
              placeholder={`Type Question ${qIdx + 1} here...`}
              style={{ width: '100%', resize: 'vertical' }}
            />

            <div className="editor-options-grid">
              {q.options.map((opt, optIdx) => {
                const isCorrect = q.correctAnswerIndex === optIdx;
                return (
                  <div key={optIdx} className={`editor-option-row ${isCorrect ? 'correct' : ''}`}>
                    <input 
                      type="radio" 
                      name={`correct-opt-${qIdx}`} 
                      className="option-radio"
                      checked={isCorrect}
                      onChange={() => handleCorrectOptionChange(qIdx, optIdx)}
                      title="Mark as correct answer"
                    />
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {String.fromCharCode(65 + optIdx)}.
                    </span>
                    <input 
                      type="text" 
                      className="option-input"
                      value={opt}
                      onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
        <button onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button 
          onClick={handleSaveClick} 
          className="btn btn-primary"
          disabled={!isCountValid}
        >
          Save Mock Test
        </button>
      </div>
    </div>
  );
}
