const fs = require('fs');
const pdf = require('pdf-parse');
const MockTest = require('../models/MockTest');
const Submission = require('../models/Submission');
const distractorGenerator = require('../utils/distractorGenerator');

// Helper function to shuffle an array
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Heuristics-based parser for MCQ/Q&A PDF
function parsePDFText(text) {
  const questions = [];
  
  // Normalize line endings and whitespace
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Try parsing standard MCQs (Question followed by options A, B, C, D and an Answer)
  // We split by question numbers: e.g. "1.", "2.", "Q1.", "Question 1:" at the start of a line
  const questionBlocks = cleanText.split(/\n\s*(?=\d+\s*[\.\)\-]\s+)/);
  
  let tempQuestions = [];
  
  for (let block of questionBlocks) {
    block = block.trim();
    if (!block) continue;
    
    // Parse question number and text
    const match = block.match(/^(\d+)\s*[\.\)\-]\s+([\s\S]+)$/);
    if (!match) continue;
    
    const qNum = parseInt(match[1], 10);
    const body = match[2].trim();
    
    // Look for options in the body: lines starting with A/B/C/D or a/b/c/d or 1/2/3/4 followed by a separator
    // We check for A., B., C., D. etc.
    const optionLines = [];
    let cleanBody = body;
    
    // Patterns for options: A. or A) or (A) or A -
    const optRegex = /(?:^|\n)\s*[\(\[~]?([A-Da-d1-4])[\.\)\s\-\]]\s*([^\n]+)/g;
    let optMatch;
    const foundOptions = [];
    
    // Find options
    while ((optMatch = optRegex.exec(body)) !== null) {
      foundOptions.push({
        label: optMatch[1].toUpperCase(),
        text: optMatch[2].trim(),
        index: optMatch.index
      });
    }
    
    // Check if we found options
    if (foundOptions.length >= 4) {
      // Sort options by index in text
      foundOptions.sort((a, b) => a.index - b.index);
      
      // Question text is everything before the first option
      cleanBody = body.substring(0, foundOptions[0].index).trim();
      
      // Extract the 4 options
      const options = foundOptions.slice(0, 4).map(o => o.text);
      
      // Look for answer in the remaining block
      // We look for patterns like: "Answer: A" or "Correct Answer: B" or "Ans: A" or asterisk indicator
      let correctAnswerIndex = 0;
      const ansRegex = /(?:Correct\s+)?Ans(?:wer)?\s*[:\-\s]\s*([A-D1-4a-d])/i;
      const ansMatch = body.match(ansRegex);
      
      if (ansMatch) {
        const ansChar = ansMatch[1].toUpperCase();
        if (ansChar === 'A' || ansChar === '1') correctAnswerIndex = 0;
        else if (ansChar === 'B' || ansChar === '2') correctAnswerIndex = 1;
        else if (ansChar === 'C' || ansChar === '3') correctAnswerIndex = 2;
        else if (ansChar === 'D' || ansChar === '4') correctAnswerIndex = 3;
      } else {
        // Fallback: check if any option text ends with "*" or "(Correct)"
        for (let i = 0; i < 4; i++) {
          if (options[i].endsWith('*') || options[i].includes('(Correct)') || options[i].includes('(correct)')) {
            correctAnswerIndex = i;
            options[i] = options[i].replace(/\*|\(Correct\)|\(correct\)/g, '').trim();
            break;
          }
        }
      }
      
      tempQuestions.push({
        questionNumber: qNum,
        questionText: cleanBody,
        options: options,
        correctAnswerIndex: correctAnswerIndex
      });
    } else {
      // If we don't have 4 options, check if it's a Q-and-A pair (Question followed by Answer)
      // Look for an answer marker inside the body
      const ansMarkerMatch = body.match(/([\s\S]+?)(?:\n\s*Answer\s*[:\-]\s*|\n\s*Correct\s*Answer\s*[:\-]\s*|\n\s*Ans\s*[:\-]\s*)([^\n]+)/i);
      
      if (ansMarkerMatch) {
        tempQuestions.push({
          questionNumber: qNum,
          questionText: ansMarkerMatch[1].trim(),
          correctAnswerText: ansMarkerMatch[2].trim(),
          isQA: true
        });
      } else {
        // Fallback: just split by last line or treat the entire block as Q-and-A if it has two parts
        const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length >= 2) {
          const ansText = lines[lines.length - 1];
          const qText = lines.slice(0, lines.length - 1).join(' ');
          tempQuestions.push({
            questionNumber: qNum,
            questionText: qText,
            correctAnswerText: ansText,
            isQA: true
          });
        } else {
          // Single line question, no clear answer
          tempQuestions.push({
            questionNumber: qNum,
            questionText: body,
            correctAnswerText: 'Answer not parsed',
            isQA: true
          });
        }
      }
    }
  }
  
  // Sort questions by question number
  tempQuestions.sort((a, b) => a.questionNumber - b.questionNumber);
  
  // Convert any Q&A format questions to MCQ by generating distractors
  const allQAAnswers = tempQuestions
    .filter(q => q.isQA)
    .map(q => q.correctAnswerText);
    
  tempQuestions.forEach((q, idx) => {
    if (q.isQA) {
      // Find 3 distractors from other questions' answers
      let distractors = allQAAnswers.filter(ans => ans !== q.correctAnswerText);
      distractors = [...new Set(distractors)]; // remove duplicates
      
      // If we don't have enough distractors, generate dummy ones
      while (distractors.length < 3) {
        distractors.push(`Option ${distractors.length + 1}`);
      }
      
      // Shuffle distractors and pick 3
      distractors = shuffleArray(distractors).slice(0, 3);
      
      // Combine with correct answer and shuffle
      const rawOptions = [q.correctAnswerText, ...distractors];
      const shuffledOptions = shuffleArray(rawOptions);
      
      q.options = shuffledOptions;
      q.correctAnswerIndex = shuffledOptions.indexOf(q.correctAnswerText);
      delete q.isQA;
      delete q.correctAnswerText;
    }
    
    questions.push({
      questionText: q.questionText,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex
    });
  });
  
  return questions;
}

exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }
    
    // Read PDF file buffer
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdf(dataBuffer);
    
    // Delete temp file asynchronously
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });
    
    // Parse text
    const rawQuestions = parsePDFText(pdfData.text);
    
    // Return parsed questions
    res.json({
      message: 'PDF uploaded and parsed successfully',
      extractedCount: rawQuestions.length,
      questions: rawQuestions
    });
  } catch (error) {
    console.error('Error uploading/parsing PDF:', error);
    res.status(500).json({ message: 'Failed to process PDF', error: error.message });
  }
};

exports.saveTest = async (req, res) => {
  try {
    const { title, description, questions } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Test title is required' });
    }
    
    if (!questions || questions.length !== 20) {
      return res.status(400).json({ message: 'Mock test must contain exactly 20 questions' });
    }
    
    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText || !q.options || q.options.length !== 4 || q.correctAnswerIndex === undefined) {
        return res.status(400).json({ 
          message: `Question ${i + 1} is invalid. Make sure it has text, 4 options, and a correct answer index.` 
        });
      }
    }
    
    const newTest = new MockTest({
      title,
      description,
      questions
    });
    
    await newTest.save();
    res.status(201).json({ message: 'Mock test saved successfully', test: newTest });
  } catch (error) {
    console.error('Error saving mock test:', error);
    res.status(500).json({ message: 'Failed to save mock test', error: error.message });
  }
};

exports.getTests = async (req, res) => {
  try {
    let tests = await MockTest.find({ isDynamic: { $ne: true } }, 'title description createdAt').sort({ createdAt: -1 });
    
    // Auto-seed if database is empty
    if (tests.length === 0) {
      console.log('Database empty! Triggering automatic self-seeding...');
      try {
        const path = require('path');
        const child_process = require('child_process');
        child_process.execSync(`node "${path.join(__dirname, '../seed_badge_test.js')}"`, { stdio: 'inherit' });
        tests = await MockTest.find({ isDynamic: { $ne: true } }, 'title description createdAt').sort({ createdAt: -1 });
      } catch (seedErr) {
        console.error('Failed to run self-seeding script:', seedErr.message);
      }
    }
    
    res.json(tests);
  } catch (error) {
    console.error('Error fetching mock tests:', error);
    res.status(500).json({ message: 'Failed to fetch mock tests', error: error.message });
  }
};

exports.getTestById = async (req, res) => {
  try {
    const test = await MockTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Mock test not found' });
    }
    
    // Hide correct answers from the questions list sent to client for test taking
    const sanitizedQuestions = test.questions.map(q => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options
    }));
    
    res.json({
      _id: test._id,
      title: test.title,
      description: test.description,
      questions: sanitizedQuestions
    });
  } catch (error) {
    console.error('Error fetching mock test details:', error);
    res.status(500).json({ message: 'Failed to fetch mock test details', error: error.message });
  }
};

exports.submitTest = async (req, res) => {
  try {
    const { answers, username, timeTaken } = req.body;
    const testId = req.params.id;
    
    if (!answers || answers.length !== 20) {
      return res.status(400).json({ message: 'You must answer all 20 questions' });
    }
    
    const test = await MockTest.findById(testId);
    if (!test) {
      return res.status(404).json({ message: 'Mock test not found' });
    }
    
    let correctCount = 0;
    const detailedReview = test.questions.map((q, idx) => {
      const selectedIndex = answers[idx];
      const correctIndex = q.correctAnswerIndex;
      const isCorrect = selectedIndex === correctIndex;
      
      if (isCorrect) correctCount++;
      
      return {
        questionText: q.questionText,
        options: q.options,
        selectedAnswerIndex: selectedIndex,
        correctAnswerIndex: correctIndex,
        isCorrect,
        explanation: q.explanation || ''
      };
    });
    
    const score = correctCount;
    const wrongCount = 20 - correctCount;
    const passed = score >= 12; // Pass score is 12 out of 20
    
    const submission = new Submission({
      testId,
      username: username || 'Guest',
      answers,
      score,
      correctAnswersCount: correctCount,
      wrongAnswersCount: wrongCount,
      passed,
      timeTaken: timeTaken || 0
    });
    
    await submission.save();
    
    res.json({
      message: 'Test submitted and graded successfully',
      submissionId: submission._id,
      score,
      correctAnswersCount: correctCount,
      wrongAnswersCount: wrongCount,
      passed,
      timeTaken: submission.timeTaken,
      detailedReview
    });
  } catch (error) {
    console.error('Error submitting mock test:', error);
    res.status(500).json({ message: 'Failed to grade test submission', error: error.message });
  }
};

exports.deleteTest = async (req, res) => {
  try {
    const test = await MockTest.findByIdAndDelete(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Mock test not found' });
    }
    // Also delete any submissions of this test
    await Submission.deleteMany({ testId: req.params.id });
    res.json({ message: 'Mock test and its submissions deleted successfully' });
  } catch (error) {
    console.error('Error deleting mock test:', error);
    res.status(500).json({ message: 'Failed to delete mock test', error: error.message });
  }
};

exports.generateDynamicTest = async (req, res) => {
  try {
    const { username } = req.body;
    const name = (username || 'Guest').trim();
    
    // 1. Gather all questions from non-dynamic mock tests
    let staticTests = await MockTest.find({ isDynamic: { $ne: true } });
    
    // Auto-seed if database is empty
    if (staticTests.length === 0) {
      console.log('Database empty during test generation! Triggering auto-seeding...');
      try {
        const path = require('path');
        const child_process = require('child_process');
        child_process.execSync(`node "${path.join(__dirname, '../seed_badge_test.js')}"`, { stdio: 'inherit' });
        staticTests = await MockTest.find({ isDynamic: { $ne: true } });
      } catch (seedErr) {
        console.error('Failed to run self-seeding script:', seedErr.message);
      }
    }

    let questionPool = [];
    staticTests.forEach(t => {
      t.questions.forEach(q => {
        questionPool.push({
          questionText: q.questionText,
          correctAnswerText: q.options[q.correctAnswerIndex],
          category: q.category || 'general_rules',
          difficulty: q.difficulty || 'Medium',
          explanation: q.explanation || ''
        });
      });
    });
    
    if (questionPool.length === 0) {
      return res.status(400).json({ message: 'No questions available in the question bank. Please seed the database first.' });
    }
    
    // 2. Fetch student's submission history
    const submissions = await Submission.find({ username: name }).populate('testId');
    
    // Map questionText -> last attempted date
    const lastAttemptedTime = new Map();
    submissions.forEach(sub => {
      if (sub.testId && sub.testId.questions) {
        sub.testId.questions.forEach(q => {
          lastAttemptedTime.set(q.questionText, sub.createdAt);
        });
      }
    });
    
    // 3. Sort pool by last attempted date ascending
    const sortedPool = [...questionPool].sort((a, b) => {
      const timeA = lastAttemptedTime.get(a.questionText) ? new Date(lastAttemptedTime.get(a.questionText)).getTime() : 0;
      const timeB = lastAttemptedTime.get(b.questionText) ? new Date(lastAttemptedTime.get(b.questionText)).getTime() : 0;
      return timeA - timeB;
    });
    
    // 4. Candidate pool of top 60 least-recently attempted questions
    const candidatePoolLimit = Math.min(60, sortedPool.length);
    const candidatePool = sortedPool.slice(0, candidatePoolLimit);
    
    // Shuffled candidate pool
    let shuffledCandidate = shuffleArray(candidatePool);
    let selectedRaw = shuffledCandidate.slice(0, Math.min(20, shuffledCandidate.length));
    
    // Pad to 20 if needed
    while (selectedRaw.length < 20) {
      const remaining = questionPool.filter(q => !selectedRaw.some(sr => sr.questionText === q.questionText));
      if (remaining.length === 0) break;
      selectedRaw.push(shuffleArray(remaining)[0]);
    }
    
    // 5. Shuffle options and generate smart distractors for the 20 chosen questions
    const formattedQuestions = selectedRaw.slice(0, 20).map(q => {
      const { options, correctAnswerIndex, category } = distractorGenerator.generateImprovedOptions(
        q.questionText,
        q.correctAnswerText,
        questionPool
      );
      
      return {
        questionText: q.questionText,
        options: options,
        correctAnswerIndex: correctAnswerIndex,
        category: category || q.category,
        difficulty: q.difficulty || 'Medium',
        explanation: q.explanation || ''
      };
    });
    
    // 6. Save attempt as a dynamic test
    const dynamicTest = new MockTest({
      title: `ബാഡ്ജ് പരീക്ഷാ പരിശീലനം (Dynamic Attempt)`,
      description: `വിവിധ ബാഡ്ജ് പരീക്ഷ ചോദ്യങ്ങളിൽ നിന്നും തെരഞ്ഞെടുത്ത ചോദ്യങ്ങൾ അടങ്ങിയ ടെസ്റ്റ് (User: ${name})`,
      questions: formattedQuestions,
      isDynamic: true,
      username: name
    });
    
    await dynamicTest.save();
    
    // Sanitize questions
    const sanitizedQuestions = dynamicTest.questions.map(q => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options
    }));
    
    res.json({
      _id: dynamicTest._id,
      title: dynamicTest.title,
      description: dynamicTest.description,
      questions: sanitizedQuestions
    });
  } catch (error) {
    console.error('Error generating dynamic test:', error);
    res.status(500).json({ message: 'Failed to generate dynamic test', error: error.message });
  }
};

exports.adminGetSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({})
      .populate('testId', 'title')
      .sort({ createdAt: -1 });
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching admin submissions:', error);
    res.status(500).json({ message: 'Failed to fetch student results', error: error.message });
  }
};

exports.adminGetQuestions = async (req, res) => {
  try {
    const tests = await MockTest.find({ isDynamic: { $ne: true } });
    let questionPool = [];
    tests.forEach(t => {
      t.questions.forEach(q => {
        questionPool.push({
          _id: q._id,
          questionText: q.questionText,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          category: q.category || 'general_rules',
          difficulty: q.difficulty || 'Medium',
          explanation: q.explanation || '',
          sourceTest: t.title
        });
      });
    });
    res.json(questionPool);
  } catch (error) {
    console.error('Error fetching admin questions:', error);
    res.status(500).json({ message: 'Failed to fetch question bank', error: error.message });
  }
};

exports.studentGetProgress = async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const submissions = await Submission.find({ username })
      .populate('testId', 'title isDynamic')
      .sort({ createdAt: -1 });

    if (submissions.length === 0) {
      return res.json({
        username,
        totalTests: 0,
        passed: 0,
        failed: 0,
        passRate: 0,
        averageScore: 0,
        bestScore: 0,
        totalTimeTaken: 0,
        recentSubmissions: [],
        scoreTrend: []
      });
    }

    const totalTests = submissions.length;
    const passedCount = submissions.filter(s => s.passed).length;
    const failedCount = totalTests - passedCount;
    const passRate = ((passedCount / totalTests) * 100).toFixed(1);
    const averageScore = (submissions.reduce((acc, s) => acc + s.score, 0) / totalTests).toFixed(1);
    const bestScore = Math.max(...submissions.map(s => s.score));
    const totalTimeTaken = submissions.reduce((acc, s) => acc + (s.timeTaken || 0), 0);

    // Score trend: last 10 results in chronological order
    const scoreTrend = [...submissions]
      .reverse()
      .slice(-10)
      .map(s => ({
        date: s.createdAt,
        score: s.score,
        passed: s.passed,
        testTitle: s.testId ? s.testId.title : 'Deleted Test'
      }));

    const recentSubmissions = submissions.slice(0, 20).map(s => ({
      _id: s._id,
      testTitle: s.testId ? s.testId.title : 'Deleted Test',
      isDynamic: s.testId ? s.testId.isDynamic : false,
      score: s.score,
      correctAnswersCount: s.correctAnswersCount,
      wrongAnswersCount: s.wrongAnswersCount,
      passed: s.passed,
      timeTaken: s.timeTaken || 0,
      createdAt: s.createdAt
    }));

    res.json({
      username,
      totalTests,
      passed: passedCount,
      failed: failedCount,
      passRate: parseFloat(passRate),
      averageScore: parseFloat(averageScore),
      bestScore,
      totalTimeTaken,
      recentSubmissions,
      scoreTrend
    });
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({ message: 'Failed to fetch progress', error: error.message });
  }
};
