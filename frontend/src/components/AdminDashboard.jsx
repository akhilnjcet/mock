import React, { useState, useEffect } from 'react';
import TestPreviewEditor from './TestPreviewEditor';
import UserManagementTable from './UserManagementTable';

export default function AdminDashboard({ onSelectTest }) {
  const [activeTab, setActiveTab] = useState('tests'); // 'tests', 'analytics', 'questions', 'users'
  const [tests, setTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  
  // State for parsed questions preview
  const [parsedQuestions, setParsedQuestions] = useState(null);
  const [originalFilename, setOriginalFilename] = useState('');

  // Drag and drop state
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Student Submissions state
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionSearch, setSubmissionSearch] = useState('');

  // Question Explorer state
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionSearch, setQuestionSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoadingTests(true);
      const res = await fetch('/api/tests');
      if (res.ok) {
        const data = await res.json();
        setTests(data);
      } else {
        console.error('Failed to fetch tests');
      }
    } catch (err) {
      console.error('Error fetching tests:', err);
    } finally {
      setLoadingTests(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const res = await fetch('/api/tests/admin/submissions');
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      } else {
        console.error('Failed to fetch submissions');
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoadingQuestions(true);
      const res = await fetch('/api/tests/admin/questions');
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      } else {
        console.error('Failed to fetch questions');
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchSubmissions();
    } else if (activeTab === 'questions') {
      fetchQuestions();
    }
  }, [activeTab]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    setUploadError('');
    setUploadSuccess('');
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setUploadError('Only PDF files are supported.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('pdf', selectedFile);

    try {
      const res = await fetch('/api/tests/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setUploadSuccess(`PDF parsed successfully! Extracted ${data.extractedCount} questions.`);
        setParsedQuestions(data.questions);
        setOriginalFilename(selectedFile.name.replace(/\.[^/.]+$/, '')); // remove extension for title
        setSelectedFile(null);
      } else {
        setUploadError(data.message || 'Failed to parse PDF.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('A network error occurred while uploading. Ensure backend is running.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteTest = async (testId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this mock test? This will also remove all student scores for it.')) {
      return;
    }

    try {
      const res = await fetch(`/api/tests/${testId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setTests(tests.filter(t => t._id !== testId));
      } else {
        alert('Failed to delete mock test.');
      }
    } catch (err) {
      console.error('Error deleting test:', err);
      alert('Network error occurred while deleting.');
    }
  };

  const handleSaveParsedTest = async (testData) => {
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      const data = await res.json();

      if (res.ok) {
        setParsedQuestions(null);
        setUploadSuccess('Mock test saved successfully!');
        fetchTests();
      } else {
        alert(data.message || 'Failed to save mock test.');
      }
    } catch (err) {
      console.error('Save test error:', err);
      alert('Network error while saving the mock test.');
    }
  };

  const handleCancelEditor = () => {
    setParsedQuestions(null);
    setUploadSuccess('');
  };

  // CSV Exporter for Student Submissions
  const exportToCSV = () => {
    if (submissions.length === 0) return;
    
    const headers = ['Username', 'Test Title', 'Score', 'Passed', 'Time Taken (MM:SS)', 'Attempt Date'];
    const rows = submissions.map(sub => {
      const mins = Math.floor(sub.timeTaken / 60);
      const secs = sub.timeTaken % 60;
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      
      return [
        sub.username,
        sub.testId ? sub.testId.title : 'Dynamic Random Test',
        `${sub.score}/20`,
        sub.passed ? 'Yes' : 'No',
        timeStr,
        new Date(sub.createdAt).toLocaleString()
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // UTF-8 BOM
      + [headers.join(','), ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Student_Badge_Test_Results_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Statistics Computations
  const totalAttempts = submissions.length;
  const passedAttempts = submissions.filter(sub => sub.passed).length;
  const passPercentage = totalAttempts > 0 ? ((passedAttempts / totalAttempts) * 100).toFixed(1) : '0';
  const averageScore = totalAttempts > 0 ? (submissions.reduce((acc, curr) => acc + curr.score, 0) / totalAttempts).toFixed(1) : '0';

  // Filters for Analytics
  const filteredSubmissions = submissions.filter(sub => 
    sub.username.toLowerCase().includes(submissionSearch.toLowerCase()) ||
    (sub.testId && sub.testId.title.toLowerCase().includes(submissionSearch.toLowerCase()))
  );

  // Filters for Questions
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.questionText.toLowerCase().includes(questionSearch.toLowerCase()) || 
                          q.options.some(opt => opt.toLowerCase().includes(questionSearch.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || q.category === categoryFilter;
    const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const getCategoryLabel = (cat) => {
    const labels = {
      speed_limit: 'Speed Limits (വേഗത)',
      color: 'Vehicle Colors (നിറം)',
      duration: 'Periods & Durations (കാലാവധി)',
      officer: 'Officers & Authorities (ഉദ്യോഗസ്ഥൻ)',
      number_plate: 'Number Plates (നമ്പർ പ്ലേറ്റ്)',
      technical: 'Technical Mechanics (സാങ്കേതികം)',
      first_aid_accident: 'First Aid & Accidents (പ്രഥമശുശ്രൂഷ)',
      general_rules: 'Road Rules (റോഡ് നിയമങ്ങൾ)'
    };
    return labels[cat] || cat;
  };

  if (parsedQuestions) {
    return (
      <TestPreviewEditor 
        initialQuestions={parsedQuestions}
        defaultTitle={originalFilename}
        onSave={handleSaveParsedTest}
        onCancel={handleCancelEditor}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1.5rem', marginBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('tests')}
          style={{
            padding: '1rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'tests' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'tests' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Mock Tests & Uploads
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '1rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'analytics' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'analytics' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Student Results & Analytics
        </button>
        <button 
          onClick={() => setActiveTab('questions')}
          style={{
            padding: '1rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'questions' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'questions' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Question Bank Explorer
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          style={{
            padding: '1rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'users' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'users' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Manage Users
        </button>
      </div>

      {/* Tab CONTENT 1: TESTS & UPLOADS */}
      {activeTab === 'tests' && (
        <div className="grid-dashboard">
          {/* Upload PDF Section */}
          <div className="card upload-panel">
            <div>
              <h2>Upload Mock Test</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Upload a PDF containing exactly 20 questions. The system will extract questions and correct answers.
              </p>
            </div>

            {uploadError && (
              <div className="alert-banner error">
                <svg style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="alert-banner success">
                <svg style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{uploadSuccess}</span>
              </div>
            )}

            <div 
              className={`upload-area ${dragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('pdf-file-input').click()}
            >
              <input 
                type="file" 
                id="pdf-file-input" 
                accept=".pdf" 
                onChange={handleFileChange} 
                style={{ display: 'none' }}
              />
              
              <svg className="upload-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>

              {selectedFile ? (
                <div className="upload-text" style={{ fontWeight: 600 }}>
                  {selectedFile.name}
                </div>
              ) : (
                <>
                  <div className="upload-text">Drag & drop your PDF here or click to browse</div>
                  <div className="upload-subtext">Supports questions in MCQ or standard Question/Answer table format</div>
                </>
              )}
            </div>

            {selectedFile && (
              <button 
                onClick={handleUploadSubmit} 
                className="btn btn-primary"
                disabled={isUploading}
                style={{ width: '100%' }}
              >
                {isUploading ? 'Processing PDF...' : 'Parse PDF Questions'}
              </button>
            )}
          </div>

          {/* Tests List Section */}
          <div className="card test-list-panel">
            <h2>Active Mock Tests</h2>
            
            {loadingTests ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                Loading mock tests...
              </div>
            ) : tests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                No mock tests uploaded yet. Use the upload panel to get started.
              </div>
            ) : (
              <div className="test-grid">
                {tests.map(test => (
                  <div key={test._id} className="test-card" onClick={() => onSelectTest(test._id)} style={{ cursor: 'pointer' }}>
                    <div className="test-header">
                      <div className="test-title">{test.title}</div>
                      <button 
                        onClick={(e) => handleDeleteTest(test._id, e)} 
                        className="btn btn-danger"
                        style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                        title="Delete Test"
                      >
                        <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {test.description || 'No description provided.'}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="test-meta">
                        Added: {new Date(test.createdAt).toLocaleDateString()}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: '700' }}>
                        Take Test →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab CONTENT 2: ANALYTICS & STUDENT RESULTS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Stats Boxes */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="stat-card">
              <div className="stat-label">Total Attempts</div>
              <div className="stat-value">{totalAttempts}</div>
            </div>
            <div className="stat-card correct-stat">
              <div className="stat-label">Clear Percentage</div>
              <div className="stat-value">{passPercentage}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Average Score</div>
              <div className="stat-value">{averageScore}/20</div>
            </div>
          </div>

          {/* Submissions Table Panel */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>Student Logs</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Review all student mock test submissions.</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%', smWidth: 'auto', justifySelf: 'flex-end' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Search student or test..." 
                  value={submissionSearch} 
                  onChange={(e) => setSubmissionSearch(e.target.value)}
                  style={{ width: '250px', margin: 0 }}
                />
                <button 
                  onClick={exportToCSV}
                  disabled={submissions.length === 0}
                  className="btn btn-primary"
                  style={{ background: 'var(--color-success)', color: '#fff', padding: '0.5rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>

            {loadingSubmissions ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                Loading logs...
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                No submissions found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Student Name</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Test Title</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Score</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Result</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Time Taken</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((sub) => {
                      const mins = Math.floor(sub.timeTaken / 60);
                      const secs = sub.timeTaken % 60;
                      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                      
                      return (
                        <tr key={sub._id} style={{ borderBottom: '1px solid var(--border-color)', hover: { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
                          <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{sub.username}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{sub.testId ? sub.testId.title : 'Dynamic Random Test'}</td>
                          <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{sub.score}/20</td>
                          <td style={{ padding: '1rem' }}>
                            <span 
                              className="badge" 
                              style={{ 
                                backgroundColor: sub.passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                                color: sub.passed ? 'var(--color-success)' : 'var(--color-danger)',
                                fontWeight: 700
                              }}
                            >
                              {sub.passed ? 'PASS' : 'FAIL'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{timeStr}</td>
                          <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(sub.createdAt).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab CONTENT 3: QUESTION BANK EXPLORER */}
      {activeTab === 'questions' && (
        <div className="card">
          <div style={{ marginBottom: '1.5rem' }}>
            <h2>Question Bank Explorer</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Search, filter, and review explanations for the complete pool of questions.
            </p>
            
            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div style={{ flex: '1', minWidth: '250px' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Search question text or option content..." 
                  value={questionSearch} 
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  style={{ width: '100%', margin: 0 }}
                />
              </div>
              <div style={{ width: '200px' }}>
                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', margin: 0, height: '100%' }}
                >
                  <option value="all">All Subjects</option>
                  <option value="speed_limit">Speed Limits (വേഗത)</option>
                  <option value="color">Colors (നിറം)</option>
                  <option value="duration">Periods/Durations (കാലാവധി)</option>
                  <option value="officer">Officials/Authorities (ഉദ്യോഗസ്ഥൻ)</option>
                  <option value="number_plate">Number Plates (നമ്പർ പ്ലേറ്റ്)</option>
                  <option value="technical">Technical Mechanics (സാങ്കേതികം)</option>
                  <option value="first_aid_accident">First Aid & Accidents (പ്രഥമശുശ്രൂഷ)</option>
                  <option value="general_rules">Road Rules (റോഡ് നിയമങ്ങൾ)</option>
                </select>
              </div>
              <div style={{ width: '150px' }}>
                <select 
                  value={difficultyFilter} 
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', margin: 0, height: '100%' }}
                >
                  <option value="all">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>
          </div>

          {loadingQuestions ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Loading question bank...
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              No questions match the active search/filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', alignSelf: 'flex-end', marginBottom: '0.5rem' }}>
                Showing {filteredQuestions.length} of {questions.length} questions
              </div>
              {filteredQuestions.map((q, idx) => {
                const isExpanded = expandedQuestionId === q._id;
                
                return (
                  <div 
                    key={q._id} 
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1rem',
                      backgroundColor: 'var(--bg-card)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div 
                      onClick={() => setExpandedQuestionId(isExpanded ? null : q._id)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', gap: '1rem' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                          <span className="badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)' }}>
                            {getCategoryLabel(q.category)}
                          </span>
                          <span className="badge" style={{ 
                            backgroundColor: q.difficulty === 'Easy' ? 'rgba(16, 185, 129, 0.15)' : q.difficulty === 'Hard' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)', 
                            color: q.difficulty === 'Easy' ? 'var(--color-success)' : q.difficulty === 'Hard' ? 'var(--color-danger)' : '#f59e0b'
                          }}>
                            {q.difficulty}
                          </span>
                        </div>
                        <h4 style={{ margin: 0, lineHeight: '1.5', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                          {idx + 1}. {q.questionText}
                        </h4>
                      </div>
                      
                      <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}>
                        <svg style={{ width: '1.25rem', height: '1.25rem', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>Options Shuffled Order:</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = optIdx === q.correctAnswerIndex;
                            return (
                              <div 
                                key={optIdx} 
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem',
                                  border: isCorrect ? '1px solid var(--color-success)' : '1px solid transparent',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                                  fontSize: '0.95rem'
                                }}
                              >
                                <span style={{ fontWeight: 700, color: isCorrect ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                                  {String.fromCharCode(65 + optIdx)})
                                </span>
                                <span style={{ color: isCorrect ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isCorrect ? 600 : 400 }}>
                                  {opt}
                                </span>
                                {isCorrect && (
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', marginLeft: 'auto' }}>
                                    Correct Answer
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {q.explanation && (
                          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(99, 102, 241, 0.05)', borderLeft: '4px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            <strong style={{ display: 'block', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>Explanation (വിശദീകരണം):</strong>
                            {q.explanation}
                          </div>
                        )}
                        
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                          Template: {q.sourceTest}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {activeTab === 'users' && (
        <UserManagementTable />
      )}
    </div>
  );
}
