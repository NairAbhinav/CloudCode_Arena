const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true
    },
    input: {
      type: String,
      default: ''
    },
    expectedOutput: {
      type: String,
      required: [true, 'Expected output is required']
    },
    isHidden: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

testCaseSchema.index({ questionId: 1, isHidden: 1 });

module.exports = mongoose.model('TestCase', testCaseSchema);
