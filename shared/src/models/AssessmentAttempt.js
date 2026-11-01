const mongoose = require('mongoose');

const assessmentAttemptSchema = new mongoose.Schema(
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
    attemptNumber: {
      type: Number,
      required: true,
      default: 1
    },
    startTime: {
      type: Date,
      default: Date.now,
      required: true
    },
    submittedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'terminated', 'flagged'],
      default: 'in_progress',
      index: true
    },
    score: {
      type: Number,
      default: 0
    },
    totalMarks: {
      type: Number,
      default: 100
    },
    violationsCount: {
      type: Number,
      default: 0
    },
    isDisqualified: {
      type: Boolean,
      default: false
    },
    disqualificationReason: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

assessmentAttemptSchema.index({ assessmentId: 1, studentId: 1, attemptNumber: 1 }, { unique: true });

module.exports = mongoose.model('AssessmentAttempt', assessmentAttemptSchema);
