const mongoose = require('mongoose');

const sampleTestCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: '' },
    output: { type: String, required: true },
    explanation: { type: String, default: '' }
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Question title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    inputFormat: {
      type: String,
      default: ''
    },
    outputFormat: {
      type: String,
      default: ''
    },
    constraints: {
      type: String,
      default: ''
    },
    sampleTestCases: {
      type: [sampleTestCaseSchema],
      default: []
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Easy',
      index: true
    },
    topicTags: {
      type: [String],
      default: [],
      index: true
    },
    supportedLanguages: {
      type: [String],
      default: ['python', 'c', 'cpp', 'java', 'javascript']
    },
    starterCode: {
      type: String,
      default: '# Write your solution in Python 3\n\ndef solution():\n    pass\n\nif __name__ == "__main__":\n    solution()\n'
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    visibility: {
      type: String,
      enum: ['shared', 'faculty'],
      default: 'faculty',
      index: true
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

questionSchema.index({ title: 'text', description: 'text', topicTags: 'text' });
questionSchema.index({ difficulty: 1, isPublished: 1 });

module.exports = mongoose.model('Question', questionSchema);
