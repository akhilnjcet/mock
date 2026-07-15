const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MockTest',
    required: true
  },
  username: {
    type: String,
    default: 'Guest'
  },
  answers: {
    type: [Number], // array of selected option indices (0-3), corresponding to each question
    required: true,
    validate: [arr => arr.length === 20, 'Submission must contain answers for exactly 20 questions']
  },
  score: {
    type: Number,
    required: true
  },
  correctAnswersCount: {
    type: Number,
    required: true
  },
  wrongAnswersCount: {
    type: Number,
    required: true
  },
  passed: {
    type: Boolean,
    required: true
  },
  timeTaken: {
    type: Number, // in seconds
    default: 0
  },
  totalQuestions: {
    type: Number,
    default: 20
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Submission', SubmissionSchema);
