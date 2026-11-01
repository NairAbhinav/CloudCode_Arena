const mongoose = require('mongoose');

const testCaseResultSchema = new mongoose.Schema(
  {
    testCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestCase'
    },
    isHidden: {
      type: Boolean,
      default: false
    },
    passed: {
      type: Boolean,
      required: true
    },
    stdout: {
      type: String,
      default: ''
    },
    stderr: {
      type: String,
      default: ''
    },
    executionTimeMs: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      index: true
    },
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentAttempt',
      index: true
    },
    code: {
      type: String,
      required: [true, 'Code content is required']
    },
    language: {
      type: String,
      default: 'python',
      enum: ['python', 'python3', 'c', 'cpp', 'java', 'javascript']
    },
    status: {
      type: String,
      enum: [
        'Accepted',
        'Wrong Answer',
        'Runtime Error',
        'Time Limit Exceeded',
        'Memory Limit Exceeded',
        'Internal Error',
        'Pending'
      ],
      default: 'Pending',
      index: true
    },
    executionTimeMs: {
      type: Number,
      default: 0
    },
    score: {
      type: Number,
      default: 0
    },
    maxScore: {
      type: Number,
      default: 100
    },
    testCaseResults: {
      type: [testCaseResultSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

submissionSchema.index({ userId: 1, questionId: 1, createdAt: -1 });
submissionSchema.index({ assessmentId: 1, userId: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
