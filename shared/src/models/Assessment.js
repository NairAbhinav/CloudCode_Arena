const mongoose = require('mongoose');

const assessmentQuestionSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    marks: {
      type: Number,
      required: true,
      min: [1, 'Marks per question must be at least 1']
    }
  },
  { _id: false }
);

const antiCheatingConfigSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true
    },
    trackTabSwitches: {
      type: Boolean,
      default: true
    },
    trackFocusLoss: {
      type: Boolean,
      default: true
    },
    trackFullscreenExit: {
      type: Boolean,
      default: false
    },
    trackClipboard: {
      type: Boolean,
      default: true
    },
    maxViolations: {
      type: Number,
      default: 3,
      min: 1
    },
    actionOnThreshold: {
      type: String,
      enum: ['warn', 'flag', 'terminate'],
      default: 'flag'
    }
  },
  { _id: false }
);

const assessmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Assessment title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      default: ''
    },
    instructions: {
      type: String,
      default: 'Please read all problems carefully. Anti-cheating monitoring is active during this assessment. Do not switch tabs or leave full screen.'
    },
    questions: {
      type: [assessmentQuestionSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Assessment must include at least one question'
      }
    },
    totalMarks: {
      type: Number,
      required: true,
      default: 100
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      index: true
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
      index: true
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [5, 'Duration must be at least 5 minutes']
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: 1
    },
    resultReleasePolicy: {
      type: String,
      enum: ['immediate', 'after_deadline', 'manual'],
      default: 'after_deadline'
    },
    isResultsReleased: {
      type: Boolean,
      default: false,
      index: true
    },
    antiCheatingConfig: {
      type: antiCheatingConfigSchema,
      default: () => ({})
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

assessmentSchema.index({ startTime: 1, endTime: 1, status: 1 });

module.exports = mongoose.model('Assessment', assessmentSchema);
