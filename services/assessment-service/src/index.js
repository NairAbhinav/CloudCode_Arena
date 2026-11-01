require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const {
  Question,
  TestCase,
  Assessment,
  AssessmentAttempt,
  Submission,
  AssessmentResult,
  AntiCheatingEvent,
  User,
  connectDB,
  authenticateToken,
  requireRole,
  recordAudit
} = require('@cloudcode-arena/shared');

const app = express();
const PORT = process.env.ASSESSMENT_SERVICE_PORT || 5002;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'assessment-service',
    timestamp: new Date().toISOString()
  });
});

// ==============================================================================
// QUESTION ENDPOINTS
// ==============================================================================

// List & search questions
app.get('/api/questions', authenticateToken, async (req, res) => {
  try {
    const { search, difficulty, topic, visibility, page = 1, limit = 20 } = req.query;
    const query = {};

    // Role-based visibility
    if (req.user.role === 'student') {
      query.isPublished = true;
    } else if (req.user.role === 'faculty') {
      if (visibility === 'mine') {
        query.creator = req.user.id;
      } else if (visibility === 'shared') {
        query.visibility = 'shared';
      } else {
        query.$or = [{ visibility: 'shared' }, { creator: req.user.id }];
      }
    }
    // Admins see all questions

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (topic) {
      query.topicTags = topic;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Question.countDocuments(query);
    const questions = await Question.find(query)
      .populate('creator', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    // For students, check which questions they have solved
    let solvedQuestionIds = new Set();
    if (req.user.role === 'student') {
      const acceptedSubs = await Submission.find({
        userId: req.user.id,
        status: 'Accepted'
      }).select('questionId');
      acceptedSubs.forEach(s => solvedQuestionIds.add(s.questionId.toString()));
    }

    const resultList = questions.map(q => ({
      id: q._id,
      title: q.title,
      description: q.description,
      difficulty: q.difficulty,
      topicTags: q.topicTags,
      supportedLanguages: q.supportedLanguages,
      visibility: q.visibility,
      isPublished: q.isPublished,
      creator: q.creator,
      isSolved: solvedQuestionIds.has(q._id.toString()),
      createdAt: q.createdAt
    }));

    res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      questions: resultList
    });
  } catch (error) {
    console.error('[Assessment Service] List questions error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve questions.' });
  }
});

// Get single question details
app.get('/api/questions/:id', authenticateToken, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate('creator', 'name email role');
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found.' });
    }

    // Access check: unpublished questions cannot be viewed by students
    if (req.user.role === 'student' && !question.isPublished) {
      return res.status(403).json({ success: false, error: 'Question is not published.' });
    }

    // Faculty can only view their own questions or shared questions
    if (
      req.user.role === 'faculty' &&
      question.visibility !== 'shared' &&
      question.creator._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, error: 'Access denied to this question.' });
    }

    // Fetch public test cases to ensure they are available for students and as sampleTestCases
    let sampleTestCases = question.sampleTestCases || [];
    if (!sampleTestCases || sampleTestCases.length === 0) {
      const publicCases = await TestCase.find({ questionId: question._id, isHidden: false });
      sampleTestCases = publicCases.map(tc => ({
        input: tc.input || '',
        output: tc.expectedOutput,
        explanation: ''
      }));
    }

    const responseData = {
      id: question._id,
      title: question.title,
      description: question.description,
      inputFormat: question.inputFormat,
      outputFormat: question.outputFormat,
      constraints: question.constraints,
      sampleTestCases,
      difficulty: question.difficulty,
      topicTags: question.topicTags,
      supportedLanguages: question.supportedLanguages,
      starterCode: question.starterCode,
      visibility: question.visibility,
      isPublished: question.isPublished,
      creator: question.creator,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt
    };

    // If faculty creator or admin, also load all test cases for viewing/editing
    if (req.user.role === 'admin' || (req.user.role === 'faculty' && question.creator._id.toString() === req.user.id)) {
      const testCases = await TestCase.find({ questionId: question._id });
      responseData.testCases = testCases.map(tc => ({
        id: tc._id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden
      }));
    } else if (req.user.role === 'student') {
      // For students, safely expose public test cases (isHidden: false) as testCases
      const publicCases = await TestCase.find({ questionId: question._id, isHidden: false });
      responseData.testCases = publicCases.map(tc => ({
        id: tc._id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: false
      }));
    }

    res.json({ success: true, question: responseData });
  } catch (error) {
    console.error('[Assessment Service] Get question error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve question details.' });
  }
});

// Create question (Faculty or Admin)
app.post('/api/questions', authenticateToken, requireRole('faculty', 'admin'), async (req, res) => {
  try {
    const {
      title,
      description,
      inputFormat,
      outputFormat,
      constraints,
      sampleTestCases = [],
      difficulty = 'Easy',
      topicTags = [],
      starterCode,
      visibility = 'faculty',
      testCases = []
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required.'
      });
    }

    // Derive public test cases for sampleTestCases if not explicitly provided
    let finalSampleCases = Array.isArray(sampleTestCases) && sampleTestCases.length > 0 ? sampleTestCases : [];
    if (finalSampleCases.length === 0 && Array.isArray(testCases)) {
      finalSampleCases = testCases
        .filter(tc => !tc.isHidden)
        .map(tc => ({
          input: tc.input || '',
          output: String(tc.expectedOutput || '').trim(),
          explanation: tc.explanation || ''
        }));
    }

    const question = await Question.create({
      title: title.trim(),
      description,
      inputFormat: inputFormat || '',
      outputFormat: outputFormat || '',
      constraints: constraints || '',
      sampleTestCases: finalSampleCases,
      difficulty,
      topicTags: Array.isArray(topicTags) ? topicTags : [],
      starterCode: starterCode || undefined,
      creator: req.user.id,
      visibility: req.user.role === 'admin' ? visibility : 'faculty',
      isPublished: false
    });

    // Create test cases if provided
    if (Array.isArray(testCases) && testCases.length > 0) {
      const formattedTestCases = testCases.map(tc => ({
        questionId: question._id,
        input: tc.input || '',
        expectedOutput: String(tc.expectedOutput || '').trim(),
        isHidden: tc.isHidden !== undefined ? Boolean(tc.isHidden) : true
      }));
      await TestCase.insertMany(formattedTestCases);
    }

    await recordAudit(req.user.id, 'QUESTION_CREATED', 'questions', { questionId: question._id, title }, req.ip);

    res.status(201).json({
      success: true,
      message: 'Question created successfully.',
      question: {
        id: question._id,
        title: question.title,
        difficulty: question.difficulty,
        visibility: question.visibility,
        isPublished: question.isPublished
      }
    });
  } catch (error) {
    console.error('[Assessment Service] Create question error:', error);
    res.status(500).json({ success: false, error: 'Failed to create question.' });
  }
});

// Update question (Faculty Creator or Admin)
app.put('/api/questions/:id', authenticateToken, requireRole('faculty', 'admin'), async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found.' });
    }

    if (req.user.role !== 'admin' && question.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You do not have permission to edit this question.' });
    }

    const {
      title,
      description,
      inputFormat,
      outputFormat,
      constraints,
      sampleTestCases,
      difficulty,
      topicTags,
      starterCode,
      visibility,
      testCases
    } = req.body;

    if (title) question.title = title.trim();
    if (description) question.description = description;
    if (inputFormat !== undefined) question.inputFormat = inputFormat;
    if (outputFormat !== undefined) question.outputFormat = outputFormat;
    if (constraints !== undefined) question.constraints = constraints;
    if (sampleTestCases && sampleTestCases.length > 0) {
      question.sampleTestCases = sampleTestCases;
    }
    if (difficulty) question.difficulty = difficulty;
    if (topicTags) question.topicTags = topicTags;
    if (starterCode !== undefined) question.starterCode = starterCode;
    if (visibility && req.user.role === 'admin') question.visibility = visibility;

    // Update test cases if supplied
    if (Array.isArray(testCases)) {
      await TestCase.deleteMany({ questionId: question._id });
      const formattedTestCases = testCases.map(tc => ({
        questionId: question._id,
        input: tc.input || '',
        expectedOutput: String(tc.expectedOutput || '').trim(),
        isHidden: tc.isHidden !== undefined ? Boolean(tc.isHidden) : true
      }));
      await TestCase.insertMany(formattedTestCases);

      // Automatically sync public test cases to sampleTestCases if not explicitly passed
      if (!sampleTestCases || sampleTestCases.length === 0) {
        question.sampleTestCases = testCases
          .filter(tc => !tc.isHidden)
          .map(tc => ({
            input: tc.input || '',
            output: String(tc.expectedOutput || '').trim(),
            explanation: tc.explanation || ''
          }));
      }
    }

    await question.save();

    await recordAudit(req.user.id, 'QUESTION_UPDATED', 'questions', { questionId: question._id }, req.ip);

    res.json({
      success: true,
      message: 'Question updated successfully.',
      question
    });
  } catch (error) {
    console.error('[Assessment Service] Update question error:', error);
    res.status(500).json({ success: false, error: 'Failed to update question.' });
  }
});

// Delete question (Faculty Creator or Admin)
app.delete('/api/questions/:id', authenticateToken, requireRole('faculty', 'admin'), async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found.' });
    }

    if (req.user.role !== 'admin' && question.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Permission denied.' });
    }

    await TestCase.deleteMany({ questionId: question._id });
    await Question.findByIdAndDelete(question._id);

    await recordAudit(req.user.id, 'QUESTION_DELETED', 'questions', { questionId: question._id }, req.ip);

    res.json({ success: true, message: 'Question deleted successfully.' });
  } catch (error) {
    console.error('[Assessment Service] Delete question error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete question.' });
  }
});

// Publish / Unpublish question
app.post('/api/questions/:id/publish', authenticateToken, requireRole('faculty', 'admin'), async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found.' });
    }

    if (req.user.role !== 'admin' && question.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Permission denied.' });
    }

    if (!question.isPublished) {
      // Validation rule: Must have at least one public and one hidden test case before publishing
      const publicCases = await TestCase.countDocuments({ questionId: question._id, isHidden: false });
      const hiddenCases = await TestCase.countDocuments({ questionId: question._id, isHidden: true });

      if (publicCases === 0 || hiddenCases === 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot publish: question must have at least 1 public and 1 hidden test case (currently: ${publicCases} public, ${hiddenCases} hidden).`
        });
      }

      // Ensure question has sampleTestCases populated from public test cases
      if (!question.sampleTestCases || question.sampleTestCases.length === 0) {
        const publicDocs = await TestCase.find({ questionId: question._id, isHidden: false });
        question.sampleTestCases = publicDocs.map(tc => ({
          input: tc.input || '',
          output: tc.expectedOutput,
          explanation: ''
        }));
      }

      question.isPublished = true;
    } else {
      question.isPublished = false;
    }

    await question.save();

    res.json({
      success: true,
      message: `Question is now ${question.isPublished ? 'published' : 'unpublished'}.`,
      isPublished: question.isPublished
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update publication status.' });
  }
});

// ==============================================================================
// ASSESSMENT ENDPOINTS
// ==============================================================================

// List assessments
app.get('/api/assessments', authenticateToken, async (req, res) => {
  try {
    const { status, filter } = req.query;
    const query = {};

    if (req.user.role === 'student') {
      query.status = 'published';
    } else if (req.user.role === 'faculty') {
      if (filter === 'mine') {
        query.creator = req.user.id;
      }
    }

    if (status) {
      query.status = status;
    }

    const assessments = await Assessment.find(query)
      .populate('creator', 'name email')
      .populate('questions.questionId', 'title difficulty')
      .sort({ startTime: 1 });

    const now = new Date();
    const formatted = assessments.map(a => {
      let phase = 'upcoming';
      if (now >= a.startTime && now <= a.endTime) {
        phase = 'active';
      } else if (now > a.endTime) {
        phase = 'completed';
      }

      return {
        id: a._id,
        title: a.title,
        description: a.description,
        totalMarks: a.totalMarks,
        questionCount: a.questions.length,
        startTime: a.startTime,
        endTime: a.endTime,
        durationMinutes: a.durationMinutes,
        maxAttempts: a.maxAttempts,
        status: a.status,
        phase,
        isResultsReleased: a.isResultsReleased,
        antiCheatingEnabled: a.antiCheatingConfig?.enabled ?? true,
        creator: a.creator,
        createdAt: a.createdAt
      };
    });

    res.json({ success: true, assessments: formatted });
  } catch (error) {
    console.error('[Assessment Service] List assessments error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve assessments.' });
  }
});

// Get assessment details
app.get('/api/assessments/:id', authenticateToken, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('questions.questionId', 'title description inputFormat outputFormat constraints sampleTestCases difficulty topicTags starterCode');

    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found.' });
    }

    if (req.user.role === 'student' && assessment.status !== 'published') {
      return res.status(403).json({ success: false, error: 'Assessment is not published.' });
    }

    const now = new Date();
    let phase = 'upcoming';
    if (now >= assessment.startTime && now <= assessment.endTime) {
      phase = 'active';
    } else if (now > assessment.endTime) {
      phase = 'completed';
    }

    // Check student's current attempts if student
    let userAttempts = [];
    let activeAttempt = null;
    if (req.user.role === 'student') {
      userAttempts = await AssessmentAttempt.find({
        assessmentId: assessment._id,
        studentId: req.user.id
      }).sort({ attemptNumber: 1 });

      activeAttempt = userAttempts.find(att => att.status === 'in_progress');
    }

    res.json({
      success: true,
      assessment: {
        id: assessment._id,
        title: assessment.title,
        description: assessment.description,
        instructions: assessment.instructions,
        questions: await Promise.all(
          assessment.questions.map(async (q) => {
            let sampleTestCases = q.questionId.sampleTestCases || [];
            if (!sampleTestCases || sampleTestCases.length === 0) {
              const publicCases = await TestCase.find({ questionId: q.questionId._id, isHidden: false });
              sampleTestCases = publicCases.map(tc => ({
                input: tc.input || '',
                output: tc.expectedOutput,
                explanation: ''
              }));
            }
            return {
              questionId: q.questionId._id,
              title: q.questionId.title,
              description: q.questionId.description,
              inputFormat: q.questionId.inputFormat,
              outputFormat: q.questionId.outputFormat,
              constraints: q.questionId.constraints,
              sampleTestCases,
              difficulty: q.questionId.difficulty,
              topicTags: q.questionId.topicTags,
              starterCode: q.questionId.starterCode,
              marks: q.marks
            };
          })
        ),
        totalMarks: assessment.totalMarks,
        startTime: assessment.startTime,
        endTime: assessment.endTime,
        durationMinutes: assessment.durationMinutes,
        maxAttempts: assessment.maxAttempts,
        resultReleasePolicy: assessment.resultReleasePolicy,
        isResultsReleased: assessment.isResultsReleased,
        antiCheatingConfig: assessment.antiCheatingConfig,
        status: assessment.status,
        phase,
        attemptsCount: userAttempts.length,
        hasActiveAttempt: Boolean(activeAttempt),
        activeAttemptId: activeAttempt ? activeAttempt._id : null,
        myAttempts: userAttempts.map(att => ({
          attemptId: att._id,
          attemptNumber: att.attemptNumber,
          startTime: att.startTime,
          submittedAt: att.submittedAt,
          status: att.status,
          score: att.score,
          totalMarks: att.totalMarks,
          percentage: att.totalMarks > 0 ? Math.round((att.score / att.totalMarks) * 100) : 0,
          violationsCount: att.violationsCount || 0,
          isDisqualified: att.isDisqualified || false,
          disqualificationReason: att.disqualificationReason || null
        }))
      }
    });
  } catch (error) {
    console.error('[Assessment Service] Get assessment error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve assessment details.' });
  }
});

// Create assessment (Faculty or Admin)
app.post('/api/assessments', authenticateToken, requireRole('faculty', 'admin'), async (req, res) => {
  try {
    const {
      title,
      description,
      instructions,
      questions,
      startTime,
      endTime,
      durationMinutes,
      maxAttempts = 1,
      resultReleasePolicy = 'after_deadline',
      antiCheatingConfig
    } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Title and at least one question are required.'
      });
    }

    if (!startTime || !endTime || !durationMinutes) {
      return res.status(400).json({
        success: false,
        error: 'Start time, end time, and duration are required.'
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: 'End time must be after start time.'
      });
    }

    const totalMarks = questions.reduce((sum, q) => sum + (parseInt(q.marks, 10) || 0), 0);

    const assessment = await Assessment.create({
      title: title.trim(),
      description: description || '',
      instructions: instructions || 'Please read questions carefully and adhere to monitoring guidelines.',
      questions: questions.map(q => ({
        questionId: q.questionId,
        marks: parseInt(q.marks, 10) || 10
      })),
      totalMarks,
      startTime: start,
      endTime: end,
      durationMinutes: parseInt(durationMinutes, 10),
      maxAttempts: parseInt(maxAttempts, 10) || 1,
      resultReleasePolicy,
      antiCheatingConfig: antiCheatingConfig || {},
      status: 'draft',
      creator: req.user.id
    });

    await recordAudit(req.user.id, 'ASSESSMENT_CREATED', 'assessments', { assessmentId: assessment._id, title }, req.ip);

    res.status(201).json({
      success: true,
      message: 'Assessment created successfully as draft.',
      assessment
    });
  } catch (error) {
    console.error('[Assessment Service] Create assessment error:', error);
    res.status(500).json({ success: false, error: 'Failed to create assessment.' });
  }
});

// Update assessment (Faculty Creator or Admin)
app.put('/api/assessments/:id', authenticateToken, requireRole('faculty', 'admin'), async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found.' });
    }

    if (req.user.role !== 'admin' && assessment.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Permission denied.' });
    }

    const {
      title,
      description,
      instructions,
      questions,
      startTime,
      endTime,
      durationMinutes,
      maxAttempts,
      resultReleasePolicy,
      antiCheatingConfig
    } = req.body;

    if (title) assessment.title = title.trim();
    if (description !== undefined) assessment.description = description;
    if (instructions !== undefined) assessment.instructions = instructions;
    if (startTime) assessment.startTime = new Date(startTime);
    if (endTime) assessment.endTime = new Date(endTime);
    if (durationMinutes) assessment.durationMinutes = parseInt(durationMinutes, 10);
    if (maxAttempts) assessment.maxAttempts = parseInt(maxAttempts, 10);
    if (resultReleasePolicy) assessment.resultReleasePolicy = resultReleasePolicy;
    if (antiCheatingConfig) assessment.antiCheatingConfig = antiCheatingConfig;

    if (Array.isArray(questions) && questions.length > 0) {
      assessment.questions = questions.map(q => ({
        questionId: q.questionId,
        marks: parseInt(q.marks, 10) || 10
      }));
      assessment.totalMarks = assessment.questions.reduce((sum, q) => sum + q.marks, 0);
    }

    await assessment.save();

    res.json({
      success: true,
      message: 'Assessment updated successfully.',
      assessment
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update assessment.' });
  }
});

// Publish assessment
app.post('/api/assessments/:id/publish', authenticateToken, requireRole('faculty', 'admin'), async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found.' });
    }

    if (req.user.role !== 'admin' && assessment.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Permission denied.' });
    }

    assessment.status = assessment.status === 'published' ? 'draft' : 'published';
    await assessment.save();

    res.json({
      success: true,
      message: `Assessment is now ${assessment.status}.`,
      status: assessment.status
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update assessment publication.' });
  }
});

// Delete assessment (Faculty Creator or Admin)
app.delete('/api/assessments/:id', authenticateToken, requireRole('faculty', 'admin'), async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found.' });
    }

    if (req.user.role !== 'admin' && assessment.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Permission denied. You can only delete assessments created by you.' });
    }

    // Cascade delete all associated attempts, anti-cheating events, results, and submissions
    await AssessmentAttempt.deleteMany({ assessmentId: assessment._id });
    await AntiCheatingEvent.deleteMany({ assessmentId: assessment._id });
    await AssessmentResult.deleteMany({ assessmentId: assessment._id });
    await Submission.deleteMany({ assessmentId: assessment._id });
    await Assessment.findByIdAndDelete(assessment._id);

    await recordAudit(
      req.user.id,
      'ASSESSMENT_DELETED',
      'assessments',
      { assessmentId: assessment._id, title: assessment.title },
      req.ip
    );

    res.json({
      success: true,
      message: `Assessment "${assessment.title}" and all related attempts and data have been successfully deleted.`
    });
  } catch (error) {
    console.error('[Assessment Service] Delete assessment error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete assessment.' });
  }
});

// Start an Assessment Attempt (Student)
app.post('/api/assessments/:id/start', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found.' });
    }

    if (assessment.status !== 'published') {
      return res.status(403).json({ success: false, error: 'This assessment is not published.' });
    }

    const now = new Date();
    if (now < assessment.startTime) {
      return res.status(400).json({
        success: false,
        error: `Assessment has not started yet. Begins at ${assessment.startTime.toLocaleString()}.`
      });
    }

    if (now > assessment.endTime) {
      return res.status(400).json({
        success: false,
        error: `Assessment deadline has passed. Ended at ${assessment.endTime.toLocaleString()}.`
      });
    }

    // Check active attempts
    const activeAttempt = await AssessmentAttempt.findOne({
      assessmentId: assessment._id,
      studentId: req.user.id,
      status: 'in_progress'
    });

    if (activeAttempt) {
      return res.json({
        success: true,
        message: 'Resuming existing active attempt.',
        attempt: activeAttempt
      });
    }

    // Check attempt count
    const attemptCount = await AssessmentAttempt.countDocuments({
      assessmentId: assessment._id,
      studentId: req.user.id
    });

    if (attemptCount >= assessment.maxAttempts) {
      return res.status(400).json({
        success: false,
        error: `You have reached the maximum allowed attempts (${assessment.maxAttempts}) for this assessment.`
      });
    }

    // Create new attempt
    const newAttempt = await AssessmentAttempt.create({
      assessmentId: assessment._id,
      studentId: req.user.id,
      attemptNumber: attemptCount + 1,
      startTime: now,
      status: 'in_progress',
      totalMarks: assessment.totalMarks
    });

    await recordAudit(
      req.user.id,
      'ATTEMPT_STARTED',
      'assessments',
      { assessmentId: assessment._id, attemptId: newAttempt._id },
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Assessment attempt started successfully.',
      attempt: newAttempt
    });
  } catch (error) {
    console.error('[Assessment Service] Start attempt error:', error);
    res.status(500).json({ success: false, error: 'Failed to start assessment attempt.' });
  }
});

// Get active attempt for student
app.get('/api/assessments/:id/attempt', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const attempt = await AssessmentAttempt.findOne({
      assessmentId: req.params.id,
      studentId: req.user.id,
      status: 'in_progress'
    });

    if (!attempt) {
      return res.status(404).json({ success: false, error: 'No active attempt found.' });
    }

    const assessment = await Assessment.findById(req.params.id);
    const elapsedMinutes = (Date.now() - new Date(attempt.startTime).getTime()) / 60000;
    const remainingDurationMinutes = Math.max(0, assessment.durationMinutes - elapsedMinutes);

    const remainingWindowMinutes = Math.max(0, (new Date(assessment.endTime).getTime() - Date.now()) / 60000);
    const effectiveRemainingMinutes = Math.min(remainingDurationMinutes, remainingWindowMinutes);

    res.json({
      success: true,
      attempt,
      remainingMinutes: effectiveRemainingMinutes
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve active attempt.' });
  }
});

// Finalize / submit an attempt (Student)
app.post('/api/assessments/:id/submit-attempt', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const attempt = await AssessmentAttempt.findOne({
      assessmentId: req.params.id,
      studentId: req.user.id,
      status: 'in_progress'
    });

    if (!attempt) {
      return res.status(404).json({ success: false, error: 'No active attempt found to submit.' });
    }

    attempt.status = 'completed';
    attempt.submittedAt = new Date();
    await attempt.save();

    await recordAudit(
      req.user.id,
      'ATTEMPT_SUBMITTED',
      'assessments',
      { assessmentId: req.params.id, attemptId: attempt._id, score: attempt.score },
      req.ip
    );

    res.json({
      success: true,
      message: 'Assessment attempt completed and submitted.',
      attempt
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to submit attempt.' });
  }
});

// View Assessment Participants and Attempts (Faculty / Admin)
app.get('/api/assessments/:id/participants', authenticateToken, requireRole('faculty', 'admin'), async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found.' });
    }

    if (req.user.role !== 'admin' && assessment.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Permission denied.' });
    }

    const attempts = await AssessmentAttempt.find({ assessmentId: assessment._id })
      .populate('studentId', 'name email')
      .sort({ score: -1, submittedAt: 1 });

    const formatted = attempts.map(att => ({
      attemptId: att._id,
      student: att.studentId,
      attemptNumber: att.attemptNumber,
      startTime: att.startTime,
      submittedAt: att.submittedAt,
      status: att.status,
      score: att.score,
      totalMarks: att.totalMarks,
      percentage: att.totalMarks > 0 ? Math.round((att.score / att.totalMarks) * 100) : 0,
      violationsCount: att.violationsCount,
      isDisqualified: att.isDisqualified
    }));

    res.json({
      success: true,
      totalParticipants: formatted.length,
      participants: formatted
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve participants.' });
  }
});

// Release Results (Faculty / Admin)
app.put('/api/assessments/:id/release-results', authenticateToken, requireRole('faculty', 'admin'), async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found.' });
    }

    if (req.user.role !== 'admin' && assessment.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Permission denied.' });
    }

    assessment.isResultsReleased = true;
    await assessment.save();

    res.json({
      success: true,
      message: 'Assessment results have been successfully released to students.',
      isResultsReleased: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to release results.' });
  }
});

if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Assessment Service] Listening on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[Assessment Service] Fatal startup error:', err);
      process.exit(1);
    });
}

module.exports = app;
