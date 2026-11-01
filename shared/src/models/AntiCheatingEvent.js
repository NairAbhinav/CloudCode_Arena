const mongoose = require('mongoose');

const antiCheatingEventSchema = new mongoose.Schema(
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
      required: true,
      index: true
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'tab_switch',
        'focus_loss',
        'fullscreen_exit',
        'paste_external',
        'copy_event',
        'suspicious_activity'
      ],
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true
    },
    actionTaken: {
      type: String,
      enum: ['logged', 'warning', 'flagged', 'terminated'],
      default: 'logged',
      required: true
    }
  },
  {
    timestamps: true
  }
);

antiCheatingEventSchema.index({ assessmentId: 1, attemptId: 1, timestamp: -1 });

module.exports = mongoose.model('AntiCheatingEvent', antiCheatingEventSchema);
