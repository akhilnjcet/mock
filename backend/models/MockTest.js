const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: [arr => arr.length === 4, 'A question must have exactly 4 options']
  },
  correctAnswerIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  category: {
    type: String,
    default: 'general_rules',
    trim: true
  },
  difficulty: {
    type: String,
    default: 'Medium',
    enum: ['Easy', 'Medium', 'Hard']
  },
  explanation: {
    type: String,
    default: '',
    trim: true
  }
});

const MockTestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  questions: {
    type: [QuestionSchema],
    required: true,
    validate: [arr => arr.length === 20, 'A mock test must have exactly 20 questions']
  },
  isDynamic: {
    type: Boolean,
    default: false
  },
  username: {
    type: String,
    default: '',
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MockTest', MockTestSchema);
