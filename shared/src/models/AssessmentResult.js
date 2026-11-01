const mongoose = require('mongoose');

const assessmentResultSchema = new mongoose.Schema(
  {
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true,
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentAttempt',
      required: true
    },
    totalScore: {
      type: Number,
      required: true,
      default: 0
    },
    maxMarks: {
      type: Number,
      required: true,
      default: 100
    },
    percentage: {
      type: Number,
      required: true,
      default: 0
    },
    rank: {
      type: Number
    },
    feedback: {
      type: String,
      default: ''
    },
    released: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

assessmentResultSchema.index({ assessmentId: 1, studentId: 1 });
assessmentResultSchema.index({ assessmentId: 1, totalScore: -1 });

module.exports = mongoose.model('AssessmentResult', assessmentResultSchema);
