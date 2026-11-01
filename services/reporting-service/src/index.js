require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const {
  User,
  Question,
  Assessment,
  AssessmentAttempt,
  Submission,
  AntiCheatingEvent,
  AuditLog,
  connectDB,
  authenticateToken,
  requireRole,
  recordAudit,
  generateCsv
} = require('@cloudcode-arena/shared');

const app = express();
const PORT = process.env.REPORTING_SERVICE_PORT || 5004;

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'reporting-service',
    timestamp: new Date().toISOString()
  });
});

// ==============================================================================
// ANTI-CHEATING ENDPOINTS
// ==============================================================================

// Record anti-cheating monitoring event
app.post('/api/anticheat/events', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { assessmentId, attemptId, eventType, metadata = {} } = req.body;

    if (!assessmentId || !attemptId || !eventType) {
      return res.status(400).json({
        success: false,
        error: 'assessmentId, attemptId, and eventType are required.'
      });
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found.' });
    }

    const attempt = await AssessmentAttempt.findOne({
      _id: attemptId,
      assessmentId,
      studentId: req.user.id
    });

    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Attempt not found or unauthorized.' });
    }

    if (attempt.status !== 'in_progress') {
      return res.json({
        success: true,
        message: 'Attempt is already finished or terminated.',
        actionTaken: 'logged',
        violationsCount: attempt.violationsCount,
        isTerminated: attempt.status === 'terminated'
      });
    }

    const config = assessment.antiCheatingConfig || {};
    if (!config.enabled) {
      // Monitoring disabled for this assessment: log silently
      await AntiCheatingEvent.create({
        assessmentId,
        studentId: req.user.id,
        attemptId,
        eventType,
        metadata,
        actionTaken: 'logged'
      });
      return res.json({ success: true, actionTaken: 'logged', violationsCount: attempt.violationsCount });
    }

    // Check if the specific event type is monitored
    let isMonitoredEvent = false;
    if (eventType === 'tab_switch' && config.trackTabSwitches) isMonitoredEvent = true;
    if (eventType === 'focus_loss' && config.trackFocusLoss) isMonitoredEvent = true;
    if (eventType === 'fullscreen_exit' && config.trackFullscreenExit) isMonitoredEvent = true;
    if (eventType === 'paste_external' && config.trackClipboard) isMonitoredEvent = true;

    if (!isMonitoredEvent) {
      await AntiCheatingEvent.create({
        assessmentId,
        studentId: req.user.id,
        attemptId,
        eventType,
        metadata,
        actionTaken: 'logged'
      });
      return res.json({ success: true, actionTaken: 'logged', violationsCount: attempt.violationsCount });
    }

    // Increment violation count
    attempt.violationsCount = (attempt.violationsCount || 0) + 1;
    const maxViolations = config.maxViolations || 3;
    const actionThreshold = config.actionOnThreshold || 'flag';

    let actionTaken = 'warning';
    let isTerminated = false;

    if (attempt.violationsCount >= maxViolations) {
      if (actionThreshold === 'terminate') {
        attempt.status = 'terminated';
        attempt.disqualificationReason = `Exceeded allowed violation threshold (${maxViolations} violations).`;
        attempt.submittedAt = new Date();
        actionTaken = 'terminated';
        isTerminated = true;
      } else if (actionThreshold === 'flag') {
        attempt.status = 'flagged';
        actionTaken = 'flagged';
      } else {
        actionTaken = 'warning';
      }
    }

    await attempt.save();

    await AntiCheatingEvent.create({
      assessmentId,
      studentId: req.user.id,
      attemptId,
      eventType,
      metadata,
      actionTaken
    });

    res.json({
      success: true,
      actionTaken,
      violationsCount: attempt.violationsCount,
      maxViolations,
      isTerminated
    });
  } catch (error) {
    console.error('[Reporting Service] Anti-cheat event error:', error);
    res.status(500).json({ success: false, error: 'Failed to record monitoring event.' });
  }
});

// Faculty/Admin: Get flagged attempts for an assessment
app.get('/api/anticheat/attempts/:assessmentId/flagged', authenticateToken, requireRole('faculty', 'admin'), async (req, res) => {
  try {
    const attempts = await AssessmentAttempt.find({
      assessmentId: req.params.assessmentId,
      $or: [{ status: 'flagged' }, { status: 'terminated' }, { violationsCount: { $gt: 0 } }]
    }).populate('studentId', 'name email');

    const formatted = [];
    for (const att of attempts) {
      const events = await AntiCheatingEvent.find({ attemptId: att._id }).sort({ timestamp: 1 });
      formatted.push({
        attemptId: att._id,
        student: att.studentId,
        attemptNumber: att.attemptNumber,
        status: att.status,
        score: att.score,
        totalMarks: att.totalMarks,
        violationsCount: att.violationsCount,
        isDisqualified: att.isDisqualified,
        disqualificationReason: att.disqualificationReason,
        events: events.map(e => ({
          eventType: e.eventType,
          actionTaken: e.actionTaken,
          metadata: e.metadata,
          timestamp: e.timestamp
        }))
      });
    }

    res.json({ success: true, flaggedAttempts: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve flagged attempts.' });
  }
});

// Faculty/Admin: Review / Resolve / Disqualify flagged attempt
app.put('/api/anticheat/attempts/:attemptId/action', authenticateToken, requireRole('faculty', 'admin'), async (req, res) => {
  try {
    const { action, reason } = req.body; // action: 'resolve' | 'disqualify'
    const attempt = await AssessmentAttempt.findById(req.params.attemptId);

    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Attempt not found.' });
    }

    if (action === 'disqualify' || action === 'terminate') {
      attempt.isDisqualified = true;
      attempt.status = 'terminated';
      attempt.score = 0;
      attempt.disqualificationReason = reason || (action === 'terminate' ? 'Terminated immediately by faculty reviewer.' : 'Disqualified by faculty due to anti-cheating policy violation.');
      attempt.submittedAt = attempt.submittedAt || new Date();
    } else if (action === 'resolve') {
      attempt.status = attempt.submittedAt ? 'completed' : 'in_progress';
      attempt.isDisqualified = false;
      attempt.disqualificationReason = undefined;
    } else {
      return res.status(400).json({ success: false, error: 'Invalid action. Use "resolve", "terminate", or "disqualify".' });
    }

    await attempt.save();

    await recordAudit(
      req.user.id,
      'ATTEMPT_REVIEW_ACTION',
      'antiCheating',
      { attemptId: attempt._id, action, reason },
      req.ip
    );

    res.json({
      success: true,
      message: `Attempt successfully updated with action: ${action}.`,
      attempt
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update attempt status.' });
  }
});

// ==============================================================================
// STUDENT PROGRESS & ANALYTICS
// ==============================================================================

app.get('/api/reports/student/progress', authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.id;

    // Distinct problems attempted and solved
    const allUserSubmissions = await Submission.find({ userId: studentId })
      .populate('questionId', 'title difficulty topicTags')
      .sort({ createdAt: -1 });

    const totalSubmissions = allUserSubmissions.length;
    const attemptedQuestionsMap = new Map();
    const solvedQuestionsMap = new Map();

    const difficultyBreakdown = {
      Easy: { attempted: 0, solved: 0 },
      Medium: { attempted: 0, solved: 0 },
      Hard: { attempted: 0, solved: 0 }
    };

    const topicProgressMap = {};

    allUserSubmissions.forEach(sub => {
      if (!sub.questionId) return;
      const qId = sub.questionId._id.toString();
      const diff = sub.questionId.difficulty || 'Easy';
      const topics = sub.questionId.topicTags || [];

      if (!attemptedQuestionsMap.has(qId)) {
        attemptedQuestionsMap.set(qId, true);
        if (difficultyBreakdown[diff]) {
          difficultyBreakdown[diff].attempted += 1;
        }
      }

      if (sub.status === 'Accepted' && !solvedQuestionsMap.has(qId)) {
        solvedQuestionsMap.set(qId, true);
        if (difficultyBreakdown[diff]) {
          difficultyBreakdown[diff].solved += 1;
        }
        topics.forEach(tag => {
          topicProgressMap[tag] = (topicProgressMap[tag] || 0) + 1;
        });
      }
    });

    const problemsAttempted = attemptedQuestionsMap.size;
    const problemsSolved = solvedQuestionsMap.size;
    const acceptanceRate =
      totalSubmissions > 0
        ? Math.round((allUserSubmissions.filter(s => s.status === 'Accepted').length / totalSubmissions) * 100)
        : 0;

    // Format topic progress
    const topicProgress = Object.keys(topicProgressMap).map(topic => ({
      topic,
      solvedCount: topicProgressMap[topic]
    }));

    // Recent submissions
    const recentSubmissions = allUserSubmissions.slice(0, 5).map(s => ({
      id: s._id,
      questionTitle: s.questionId?.title || 'Unknown Problem',
      status: s.status,
      score: s.score,
      maxScore: s.maxScore,
      createdAt: s.createdAt
    }));

    // Active & upcoming assessments for student
    const now = new Date();
    const assessments = await Assessment.find({ status: 'published' }).sort({ startTime: 1 });
    const upcomingAssessments = [];
    const activeAssessments = [];

    assessments.forEach(a => {
      if (now >= a.startTime && now <= a.endTime) {
        activeAssessments.push({
          id: a._id,
          title: a.title,
          endTime: a.endTime,
          durationMinutes: a.durationMinutes,
          totalMarks: a.totalMarks
        });
      } else if (now < a.startTime) {
        upcomingAssessments.push({
          id: a._id,
          title: a.title,
          startTime: a.startTime,
          durationMinutes: a.durationMinutes,
          totalMarks: a.totalMarks
        });
      }
    });

    res.json({
      success: true,
      stats: {
        problemsAttempted,
        problemsSolved,
        totalSubmissions,
        acceptanceRate,
        difficultyBreakdown,
        topicProgress,
        recentSubmissions,
        activeAssessments,
        upcomingAssessments
      }
    });
  } catch (error) {
    console.error('[Reporting Service] Student progress error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve progress statistics.' });
  }
});

// ==============================================================================
// FACULTY ANALYTICS & CSV EXPORT
// ==============================================================================

app.get('/api/reports/faculty/analytics', authenticateToken, requireRole('faculty', 'admin'), async (req, res) => {
  try {
    const isFaculty = req.user.role === 'faculty';
    const assessmentQuery = isFaculty ? { creator: req.user.id } : {};

    const assessments = await Assessment.find(assessmentQuery);
    const assessmentIds = assessments.map(a => a._id);

    const now = new Date();
    let upcomingCount = 0;
    let activeCount = 0;
    let completedCount = 0;

    assessments.forEach(a => {
      if (now < a.startTime) upcomingCount++;
      else if (now >= a.startTime && now <= a.endTime) activeCount++;
      else completedCount++;
    });

    const attempts = await AssessmentAttempt.find({ assessmentId: { $in: assessmentIds } });
    const totalParticipants = attempts.length;
    const completedAttempts = attempts.filter(att => att.status === 'completed');
    const flaggedAttempts = attempts.filter(att => att.status === 'flagged' || att.status === 'terminated');

    const totalScores = completedAttempts.reduce((sum, att) => sum + (att.score || 0), 0);
    const totalMaxMarks = completedAttempts.reduce((sum, att) => sum + (att.totalMarks || 100), 0);
    const averagePercentage = totalMaxMarks > 0 ? Math.round((totalScores / totalMaxMarks) * 100) : 0;

    // Assessment-wise performance breakdown
    const assessmentStats = assessments.slice(0, 10).map(a => {
      const aAttempts = attempts.filter(att => att.assessmentId.toString() === a._id.toString());
      const aCompleted = aAttempts.filter(att => att.status === 'completed');
      const aAvg =
        aCompleted.length > 0
          ? Math.round(aCompleted.reduce((sum, att) => sum + att.score, 0) / aCompleted.length)
          : 0;

      return {
        id: a._id,
        title: a.title,
        participants: aAttempts.length,
        completed: aCompleted.length,
        averageScore: aAvg,
        totalMarks: a.totalMarks
      };
    });

    res.json({
      success: true,
      analytics: {
        totalAssessments: assessments.length,
        upcomingCount,
        activeCount,
        completedCount,
        totalParticipants,
        averagePercentage,
        flaggedAttemptsCount: flaggedAttempts.length,
        assessmentStats
      }
    });
  } catch (error) {
    console.error('[Reporting Service] Faculty analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve faculty analytics.' });
  }
});

// CSV Export (Formula injection defense protected)
app.get('/api/reports/faculty/assessments/:id/export-csv', authenticateToken, requireRole('faculty', 'admin'), async (req, res) => {
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

    const headers = [
      'Student Identifier',
      'Student Name',
      'Student Email',
      'Assessment Title',
      'Score',
      'Total Marks',
      'Percentage',
      'Status',
      'Violations Count',
      'Disqualified',
      'Submission Time'
    ];

    const rows = attempts.map(att => ({
      'Student Identifier': att.studentId?._id?.toString() || '',
      'Student Name': att.studentId?.name || 'Unknown',
      'Student Email': att.studentId?.email || 'Unknown',
      'Assessment Title': assessment.title,
      'Score': att.score,
      'Total Marks': att.totalMarks,
      'Percentage': att.totalMarks > 0 ? `${Math.round((att.score / att.totalMarks) * 100)}%` : '0%',
      'Status': att.status,
      'Violations Count': att.violationsCount || 0,
      'Disqualified': att.isDisqualified ? 'YES' : 'NO',
      'Submission Time': att.submittedAt ? new Date(att.submittedAt).toISOString() : 'In Progress'
    }));

    const csvContent = generateCsv(headers, rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="assessment_${assessment._id}_results.csv"`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('[Reporting Service] CSV export error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate CSV export.' });
  }
});

// ==============================================================================
// LEADERBOARD
// ==============================================================================

app.get('/api/reports/leaderboard', authenticateToken, async (req, res) => {
  try {
    // Find all accepted submissions
    const acceptedSubmissions = await Submission.find({ status: 'Accepted' })
      .populate('userId', 'name email role')
      .sort({ createdAt: 1 });

    const userStats = new Map();

    acceptedSubmissions.forEach(sub => {
      if (!sub.userId || sub.userId.role !== 'student') return;
      const uId = sub.userId._id.toString();

      if (!userStats.has(uId)) {
        userStats.set(uId, {
          userId: uId,
          name: sub.userId.name,
          email: sub.userId.email,
          solvedSet: new Set(),
          totalScore: 0,
          latestSolvedAt: sub.createdAt
        });
      }

      const stats = userStats.get(uId);
      const qId = sub.questionId.toString();
      if (!stats.solvedSet.has(qId)) {
        stats.solvedSet.add(qId);
        stats.totalScore += sub.score || 10;
        stats.latestSolvedAt = sub.createdAt;
      }
    });

    const leaderboard = Array.from(userStats.values()).map(item => ({
      userId: item.userId,
      name: item.name,
      problemsSolved: item.solvedSet.size,
      totalScore: item.totalScore,
      latestSolvedAt: item.latestSolvedAt
    }));

    // Sort by:
    // 1. problemsSolved descending
    // 2. totalScore descending
    // 3. latestSolvedAt ascending (tie breaker: earliest solver gets better rank)
    leaderboard.sort((a, b) => {
      if (b.problemsSolved !== a.problemsSolved) {
        return b.problemsSolved - a.problemsSolved;
      }
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return new Date(a.latestSolvedAt).getTime() - new Date(b.latestSolvedAt).getTime();
    });

    const ranked = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

    res.json({
      success: true,
      leaderboard: ranked.slice(0, 50)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve leaderboard.' });
  }
});

// ==============================================================================
// ADMINISTRATOR AUDIT LOGS & HEALTH
// ==============================================================================

app.get('/api/admin/audit-logs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { action, resource, search, page = 1, limit = 25 } = req.query;
    const query = {};

    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { resource: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      logs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve audit logs.' });
  }
});

app.get('/api/admin/health', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const totalQuestions = await Question.countDocuments();
    const publishedQuestions = await Question.countDocuments({ isPublished: true });
    const totalAssessments = await Assessment.countDocuments();
    const totalSubmissions = await Submission.countDocuments();

    res.json({
      success: true,
      health: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        platformStats: {
          totalUsers,
          activeUsers,
          totalQuestions,
          publishedQuestions,
          totalAssessments,
          totalSubmissions
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve health summary.' });
  }
});

if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Reporting Service] Listening on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[Reporting Service] Fatal startup error:', err);
      process.exit(1);
    });
}

module.exports = app;
