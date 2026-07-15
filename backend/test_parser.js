// Verification script for MCQ/Q&A PDF parser logic
const { parsePDFText } = require('./controllers/testController'); // we don't export it directly, wait!
// Let's copy the parser logic here to run a quick validation check.

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parsePDFTextTest(text) {
  const questions = [];
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const questionBlocks = cleanText.split(/\n\s*(?=\d+\s*[\.\)\-]\s+)/);
  let tempQuestions = [];
  
  for (let block of questionBlocks) {
    block = block.trim();
    if (!block) continue;
    
    const match = block.match(/^(\d+)\s*[\.\)\-]\s+([\s\S]+)$/);
    if (!match) continue;
    
    const qNum = parseInt(match[1], 10);
    const body = match[2].trim();
    
    const foundOptions = [];
    const optRegex = /(?:^|\n)\s*[\(\[~]?([A-Da-d1-4])[\.\)\s\-\]]\s*([^\n]+)/g;
    let optMatch;
    
    while ((optMatch = optRegex.exec(body)) !== null) {
      foundOptions.push({
        label: optMatch[1].toUpperCase(),
        text: optMatch[2].trim(),
        index: optMatch.index
      });
    }
    
    if (foundOptions.length >= 4) {
      foundOptions.sort((a, b) => a.index - b.index);
      const cleanBody = body.substring(0, foundOptions[0].index).trim();
      const options = foundOptions.slice(0, 4).map(o => o.text);
      
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
        for (let i = 0; i < 4; i++) {
          if (options[i].endsWith('*') || options[i].includes('(Correct)')) {
            correctAnswerIndex = i;
            options[i] = options[i].replace(/\*|\(Correct\)/g, '').trim();
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
      const ansMarkerMatch = body.match(/([\s\S]+?)(?:\n\s*Answer\s*[:\-]\s*|\n\s*Correct\s*Answer\s*[:\-]\s*|\n\s*Ans\s*[:\-]\s*)([^\n]+)/i);
      if (ansMarkerMatch) {
        tempQuestions.push({
          questionNumber: qNum,
          questionText: ansMarkerMatch[1].trim(),
          correctAnswerText: ansMarkerMatch[2].trim(),
          isQA: true
        });
      } else {
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
        }
      }
    }
  }
  
  tempQuestions.sort((a, b) => a.questionNumber - b.questionNumber);
  const allQAAnswers = tempQuestions.filter(q => q.isQA).map(q => q.correctAnswerText);
    
  tempQuestions.forEach((q) => {
    if (q.isQA) {
      let distractors = allQAAnswers.filter(ans => ans !== q.correctAnswerText);
      distractors = [...new Set(distractors)];
      while (distractors.length < 3) {
        distractors.push(`Option ${distractors.length + 1}`);
      }
      distractors = shuffleArray(distractors).slice(0, 3);
      const rawOptions = [q.correctAnswerText, ...distractors];
      const shuffledOptions = shuffleArray(rawOptions);
      
      q.options = shuffledOptions;
      q.correctAnswerIndex = shuffledOptions.indexOf(q.correctAnswerText);
      delete q.isQA;
      delete q.correctAnswerText;
    }
    
    questions.push({
      questionText: q.questionNumber ? `${q.questionNumber}. ${q.questionText}` : q.questionText,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex
    });
  });
  
  return questions;
}

// 1. Test Standard MCQ format
const mcqSampleText = `
1. What is the default port of Node.js Express server usually set to in development?
A) 3000
B) 5000
C) 8080
D) 27017
Answer: B

2. Which database is commonly paired with Express in a MERN stack?
A) MySQL
B) PostgreSQL
C) MongoDB
D) Redis
Answer: C
`;

console.log("=== Testing MCQ Parser ===");
const mcqResult = parsePDFTextTest(mcqSampleText);
console.log(`Parsed ${mcqResult.length} questions.`);
console.log(JSON.stringify(mcqResult, null, 2));

// 2. Test Q&A table list format (with dynamic distractor generation)
const qaSampleText = `
1. ഒരു പബ്ലിക് സർവീസ് വാഹനത്തിന്റെ ഡ്രൈവർ
പുകവലിച്ചു കൊണ്ടോ, ലഹരി പദാർത്ഥങ്ങൾ ചവച്ചുകൊണ്ടോ വാഹനം ഓടിക്കരുത്.

2. ഒരു പബ്ലിക് സർവീസ് വാഹനത്തിന്റെ ഡ്രൈവർ കടമ
യാത്രക്കാരെ വിളിച്ച് കയറ്റരുത്.

3. പബ്ലിക് സർവീസ് വാഹനം നിർത്തുമ്പോൾ ശ്രദ്ധിക്കേണ്ടത്
നിശ്ചിത സ്ഥലങ്ങളിൽ മാത്രം നിർത്തുക.
`;

console.log("\n=== Testing Q&A List Parser (with dynamic options) ===");
const qaResult = parsePDFTextTest(qaSampleText);
console.log(`Parsed ${qaResult.length} questions.`);
console.log(JSON.stringify(qaResult, null, 2));
