require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
const {
  Question,
  TestCase,
  Assessment,
  AssessmentAttempt,
  Submission,
  connectDB,
  authenticateToken,
  requireRole,
  recordAudit
} = require('@cloudcode-arena/shared');

const app = express();
const PORT = process.env.SUBMISSION_SERVICE_PORT || 5003;
const CODE_RUNNER_URL = process.env.CODE_RUNNER_URL || 'http://127.0.0.1:5005';

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('combined'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'submission-service',
    codeRunnerUrl: CODE_RUNNER_URL,
    timestamp: new Date().toISOString()
  });
});

/**
 * Normalizes output by trimming whitespace and normalizing newlines for reliable comparison
 */
function normalizeOutput(output) {
  if (output === null || output === undefined) return '';
  return String(output)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

// ------------------------------------------------------------------------------
// Run Code against custom or sample input (No formal grading recorded)
// ------------------------------------------------------------------------------
app.post('/api/execute/run', authenticateToken, async (req, res) => {
  try {
    const { code, input, timeoutMs, language } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Source code is required.'
      });
    }

    // Forward to isolated code-runner
    const runnerResponse = await axios.post(
      `${CODE_RUNNER_URL}/execute`,
      {
        code,
        input: input !== undefined ? String(input) : '',
        timeoutMs: timeoutMs || 5000,
        language: language || 'python'
      },
      { timeout: 15000 }
    );

    const result = runnerResponse.data;

    res.json({
      success: true,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      status: result.status,
      errorType: result.errorType || null,
      executionTimeMs: result.executionTimeMs || 0
    });
  } catch (error) {
    console.error('[Submission Service] Run code error:', error.message);
    const errMessage = error.response?.data?.error || error.message;
    res.status(500).json({
      success: false,
      status: 'Internal Error',
      error: `Code execution failed: ${errMessage}`
    });
  }
});

// ------------------------------------------------------------------------------
// Submit Solution for automated evaluation
// ------------------------------------------------------------------------------
app.post('/api/submissions/submit', authenticateToken, async (req, res) => {
  try {
    const { questionId, assessmentId, code, language } = req.body;

    if (!questionId || !code) {
      return res.status(400).json({
        success: false,
        error: 'questionId and code are required.'
      });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found.' });
    }

    let activeAttempt = null;
    let questionMaxMarks = 100;

    // If submitted inside an assessment, validate time & attempt
    if (assessmentId) {
      const assessment = await Assessment.findById(assessmentId);
      if (!assessment) {
        return res.status(404).json({ success: false, error: 'Assessment not found.' });
      }

      const now = new Date();
      if (now > assessment.endTime) {
        return res.status(400).json({
          success: false,
          error: 'Assessment deadline has expired. Submissions are closed.'
        });
      }

      // Check for active attempt
      activeAttempt = await AssessmentAttempt.findOne({
        assessmentId: assessment._id,
        studentId: req.user.id,
        status: 'in_progress'
      });

      if (!activeAttempt) {
        return res.status(403).json({
          success: false,
          error: 'No active attempt found. Start an attempt before submitting.'
        });
      }

      // Check if attempt duration expired
      const elapsedMinutes = (Date.now() - new Date(activeAttempt.startTime).getTime()) / 60000;
      if (elapsedMinutes > assessment.durationMinutes + 1) { // 1 min grace period for network latency
        return res.status(400).json({
          success: false,
          error: 'Attempt time duration has expired.'
        });
      }

      const qConfig = assessment.questions.find(q => q.questionId.toString() === questionId);
      if (qConfig) {
        questionMaxMarks = qConfig.marks;
      }
    }

    // Load test cases from DB (both public and hidden)
    const testCases = await TestCase.find({ questionId: question._id });
    if (testCases.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No test cases configured for this question.'
      });
    }

    // Evaluate each test case sequentially in isolated runner
    const testCaseResults = [];
    let allPassed = true;
    let overallStatus = 'Accepted';
    let totalExecTime = 0;

    for (const tc of testCases) {
      try {
        const runnerRes = await axios.post(
          `${CODE_RUNNER_URL}/execute`,
          {
            code,
            input: tc.input || '',
            timeoutMs: 5000,
            language: language || 'python'
          },
          { timeout: 12000 }
        );

        const execData = runnerRes.data;
        totalExecTime += execData.executionTimeMs || 0;

        if (execData.status === 'Time Limit Exceeded') {
          allPassed = false;
          overallStatus = 'Time Limit Exceeded';
          testCaseResults.push({
            testCaseId: tc._id,
            isHidden: tc.isHidden,
            passed: false,
            stdout: execData.stdout || '',
            stderr: execData.stderr || 'Time Limit Exceeded',
            executionTimeMs: execData.executionTimeMs || 5000
          });
          break; // Stop on first timeout
        } else if (execData.status === 'Runtime Error') {
          allPassed = false;
          overallStatus = 'Runtime Error';
          testCaseResults.push({
            testCaseId: tc._id,
            isHidden: tc.isHidden,
            passed: false,
            stdout: execData.stdout || '',
            stderr: execData.stderr || 'Runtime Error',
            executionTimeMs: execData.executionTimeMs || 0
          });
          break; // Stop on syntax / runtime crash
        }

        // Compare output
        const normalizedActual = normalizeOutput(execData.stdout);
        const normalizedExpected = normalizeOutput(tc.expectedOutput);
        const isMatch = normalizedActual === normalizedExpected;

        if (!isMatch) {
          allPassed = false;
          if (overallStatus === 'Accepted') {
            overallStatus = 'Wrong Answer';
          }
        }

        testCaseResults.push({
          testCaseId: tc._id,
          isHidden: tc.isHidden,
          passed: isMatch,
          stdout: tc.isHidden ? '[Hidden Output]' : execData.stdout,
          stderr: execData.stderr || '',
          executionTimeMs: execData.executionTimeMs || 0
        });
      } catch (err) {
        allPassed = false;
        overallStatus = 'Internal Error';
        testCaseResults.push({
          testCaseId: tc._id,
          isHidden: tc.isHidden,
          passed: false,
          stdout: '',
          stderr: err.message,
          executionTimeMs: 0
        });
        break;
      }
    }

    // Calculate score
    const passedCount = testCaseResults.filter(r => r.passed).length;
    const score = Math.round((passedCount / testCases.length) * questionMaxMarks);

    // Save submission record
    const submission = await Submission.create({
      userId: req.user.id,
      questionId: question._id,
      assessmentId: assessmentId || null,
      attemptId: activeAttempt ? activeAttempt._id : null,
      code,
      language: language || 'python',
      status: overallStatus,
      executionTimeMs: totalExecTime,
      score,
      maxScore: questionMaxMarks,
      testCaseResults
    });

    // If in assessment, update attempt overall score
    if (activeAttempt) {
      // Find all latest submissions for this attempt per question
      const allSubmissionsForAttempt = await Submission.find({ attemptId: activeAttempt._id });
      // Calculate best score per question
      const bestScores = {};
      allSubmissionsForAttempt.forEach(s => {
        const qId = s.questionId.toString();
        if (!bestScores[qId] || s.score > bestScores[qId]) {
          bestScores[qId] = s.score;
        }
      });

      const totalAttemptScore = Object.values(bestScores).reduce((a, b) => a + b, 0);
      activeAttempt.score = totalAttemptScore;
      await activeAttempt.save();
    }

    await recordAudit(
      req.user.id,
      'SUBMISSION_CREATED',
      'submissions',
      { questionId: question._id, status: overallStatus, score },
      req.ip
    );

    // Filter hidden test cases before returning to student!
    const clientTestCaseResults = testCaseResults.map((tc, idx) => ({
      testCaseNumber: idx + 1,
      isHidden: tc.isHidden,
      passed: tc.passed,
      executionTimeMs: tc.executionTimeMs,
      stdout: tc.isHidden ? undefined : tc.stdout,
      stderr: tc.isHidden ? (tc.passed ? undefined : 'Output did not match expected hidden test case') : tc.stderr
    }));

    res.status(201).json({
      success: true,
      submission: {
        id: submission._id,
        status: submission.status,
        score: submission.score,
        maxScore: submission.maxScore,
        passedCount,
        totalCases: testCases.length,
        executionTimeMs: submission.executionTimeMs,
        testCaseResults: clientTestCaseResults,
        createdAt: submission.createdAt
      }
    });
  } catch (error) {
    console.error('[Submission Service] Submit solution error:', error);
    res.status(500).json({ success: false, error: 'Failed to evaluate submission.' });
  }
});

// ------------------------------------------------------------------------------
// Student's personal submission history
// ------------------------------------------------------------------------------
app.get('/api/submissions/my', authenticateToken, async (req, res) => {
  try {
    const { questionId, assessmentId, page = 1, limit = 20 } = req.query;
    const query = { userId: req.user.id };

    if (questionId) query.questionId = questionId;
    if (assessmentId) query.assessmentId = assessmentId;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Submission.countDocuments(query);
    const submissions = await Submission.find(query)
      .populate('questionId', 'title difficulty')
      .populate('assessmentId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const formatted = submissions.map(s => ({
      id: s._id,
      question: s.questionId,
      assessment: s.assessmentId,
      status: s.status,
      score: s.score,
      maxScore: s.maxScore,
      executionTimeMs: s.executionTimeMs,
      language: s.language,
      createdAt: s.createdAt
    }));

    res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      submissions: formatted
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve submission history.' });
  }
});

// ------------------------------------------------------------------------------
// Single submission details (Security rule: student only sees own; hidden tests sanitized)
// ------------------------------------------------------------------------------
app.get('/api/submissions/:id', authenticateToken, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('questionId', 'title difficulty inputFormat outputFormat')
      .populate('userId', 'name email role');

    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission not found.' });
    }

    // Role check: students can only see their own submissions
    if (req.user.role === 'student' && submission.userId._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied to this submission.' });
    }

    // Sanitize hidden test cases for student
    const isStudent = req.user.role === 'student';
    const sanitizedTestCases = submission.testCaseResults.map((tc, idx) => ({
      testCaseNumber: idx + 1,
      isHidden: tc.isHidden,
      passed: tc.passed,
      executionTimeMs: tc.executionTimeMs,
      stdout: isStudent && tc.isHidden ? '[Hidden]' : tc.stdout,
      stderr: isStudent && tc.isHidden ? (tc.passed ? '' : 'Failed hidden test case') : tc.stderr
    }));

    res.json({
      success: true,
      submission: {
        id: submission._id,
        user: submission.userId,
        question: submission.questionId,
        code: submission.code,
        language: submission.language,
        status: submission.status,
        score: submission.score,
        maxScore: submission.maxScore,
        executionTimeMs: submission.executionTimeMs,
        testCaseResults: sanitizedTestCases,
        createdAt: submission.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve submission details.' });
  }
});

// ------------------------------------------------------------------------------
// Faculty: Review submissions for assessment
// ------------------------------------------------------------------------------
app.get('/api/submissions/assessment/:assessmentId', authenticateToken, requireRole('faculty', 'admin'), async (req, res) => {
  try {
    const { questionId, studentId } = req.query;
    const query = { assessmentId: req.params.assessmentId };

    if (questionId) query.questionId = questionId;
    if (studentId) query.userId = studentId;

    const submissions = await Submission.find(query)
      .populate('userId', 'name email')
      .populate('questionId', 'title')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      submissions: submissions.map(s => ({
        id: s._id,
        student: s.userId,
        question: s.questionId,
        status: s.status,
        score: s.score,
        maxScore: s.maxScore,
        executionTimeMs: s.executionTimeMs,
        createdAt: s.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve assessment submissions.' });
  }
});

if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Submission Service] Listening on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[Submission Service] Fatal startup error:', err);
      process.exit(1);
    });
}

module.exports = app;
