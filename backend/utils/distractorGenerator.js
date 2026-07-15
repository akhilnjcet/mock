function classifyQuestion(questionText) {
  const text = questionText || '';
  if (/വേഗത|മണിക്കൂറിൽ|കി\.\s*മീ\./i.test(text)) {
    return 'speed_limit';
  }
  if (/നിറം|നിറത്തിൽ|നിറം\?/i.test(text)) {
    return 'color';
  }
  if (/കാലാവധി|ദിവസം|വർഷം|മാസം|പിരിയഡ്/i.test(text)) {
    return 'duration';
  }
  if (/ഉദ്യോഗസ്ഥൻ|അധികാരപ്പെടുത്തിയത്|അധികാരം|ആർക്കെല്ലാം|അതോറിറ്റി/i.test(text)) {
    return 'officer';
  }
  if (/നമ്പർ\s*പ്ലേറ്റ്|നമ്പർപ്ലേറ്റ്|അക്ഷരം|പ്രതലം/i.test(text)) {
    return 'number_plate';
  }
  if (/ബ്രേക്ക്|ബാറ്ററി|ആസിഡ്|ഡിഫറൻഷ്യൽ|റേഡിയേറ്റർ|ഓഡോമീറ്റർ|പുക|സിലിണ്ടർ/i.test(text)) {
    return 'technical';
  }
  if (/അപകടം|പരിക്ക്|രക്തസ്രാവം|ശുശ്രൂഷ|ഒടിഞ്ഞു|മുറിവ്/i.test(text)) {
    return 'first_aid_accident';
  }
  return 'general_rules';
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates 3 high-quality distractors for a question
 * @param {string} questionText - Question prompt
 * @param {string} correctAnswerText - Correct answer text
 * @param {Array} allQAs - Pool of { questionText, correctAnswerText, (optional) options }
 */
function generateImprovedOptions(questionText, correctAnswerText, allQAs) {
  const category = classifyQuestion(questionText);
  
  // Extract all correct answers from the same category
  let categoryDistractors = allQAs
    .filter(item => {
      const isSameCategory = classifyQuestion(item.questionText || item.q) === category;
      const ans = item.correctAnswerText || item.a || (item.options && item.options[item.correctAnswerIndex]);
      return isSameCategory && ans && ans !== correctAnswerText && (item.questionText || item.q) !== questionText;
    })
    .map(item => item.correctAnswerText || item.a || (item.options && item.options[item.correctAnswerIndex]));

  // Remove duplicates and trim
  categoryDistractors = [...new Set(categoryDistractors)].map(d => d.trim()).filter(Boolean);

  // If we don't have at least 3, grab from general pool
  if (categoryDistractors.length < 3) {
    let generalDistractors = allQAs
      .filter(item => {
        const ans = item.correctAnswerText || item.a || (item.options && item.options[item.correctAnswerIndex]);
        return ans && ans !== correctAnswerText && (item.questionText || item.q) !== questionText;
      })
      .map(item => item.correctAnswerText || item.a || (item.options && item.options[item.correctAnswerIndex]));
    
    generalDistractors = [...new Set(generalDistractors)].map(d => d.trim()).filter(Boolean);
    
    // Add missing ones from general list
    for (const d of generalDistractors) {
      if (categoryDistractors.length >= 3) break;
      if (!categoryDistractors.includes(d)) {
        categoryDistractors.push(d);
      }
    }
  }

  // Fallback defaults if still less than 3
  while (categoryDistractors.length < 3) {
    categoryDistractors.push(`മറ്റ് ഉത്തരം ${categoryDistractors.length + 1}`);
  }

  // Shuffle and select 3 distractors
  const finalDistractors = shuffleArray(categoryDistractors).slice(0, 3);

  // Combine with correct answer and shuffle options
  const finalOptions = shuffleArray([correctAnswerText, ...finalDistractors]);
  const correctAnswerIndex = finalOptions.indexOf(correctAnswerText);

  return {
    options: finalOptions,
    correctAnswerIndex: correctAnswerIndex,
    category: category
  };
}

module.exports = {
  classifyQuestion,
  generateImprovedOptions
};
