const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function verifyDelete() {
  console.log('=== VERIFY FACULTY ASSESSMENT DELETION ===\n');

  // 1. Log in faculty
  console.log('1. Logging in as faculty...');
  const facultyLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: 'faculty@cloudcode.arena',
    password: 'FacultyPass123!'
  });
  const facultyToken = facultyLogin.data.token;
  const facultyHeader = { headers: { Authorization: `Bearer ${facultyToken}` } };
  console.log('✅ Faculty logged in.');

  // 2. Log in student
  console.log('2. Logging in as student...');
  const studentLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: 'student@cloudcode.arena',
    password: 'StudentPass123!'
  });
  const studentToken = studentLogin.data.token;
  const studentHeader = { headers: { Authorization: `Bearer ${studentToken}` } };
  console.log('✅ Student logged in.');

  // 3. Get existing questions to attach
  const qRes = await axios.get(`${API_URL}/api/questions`, facultyHeader);
  const qId = qRes.data.questions[0].id || qRes.data.questions[0]._id;

  // 4. Create a temporary assessment to delete
  console.log('3. Creating a test assessment to delete...');
  const now = new Date();
  const createRes = await axios.post(`${API_URL}/api/assessments`, {
    title: 'Temporary Pop Quiz to be Deleted',
    description: 'This assessment will be deleted to verify faculty deletion capability.',
    instructions: 'Test instructions',
    questions: [{ questionId: qId, marks: 50 }],
    startTime: new Date(now.getTime() - 5 * 60000).toISOString(),
    endTime: new Date(now.getTime() + 60 * 60000).toISOString(),
    durationMinutes: 30,
    maxAttempts: 2,
    resultReleasePolicy: 'immediate',
    antiCheatingConfig: {
      enabled: true,
      maxViolations: 3,
      actionOnThreshold: 'terminate'
    }
  }, facultyHeader);

  const testAssessmentId = createRes.data.assessment._id || createRes.data.assessment.id;
  console.log(`✅ Test assessment created: ID = ${testAssessmentId}`);

  // Publish it
  await axios.post(`${API_URL}/api/assessments/${testAssessmentId}/publish`, {}, facultyHeader);

  // Student starts an attempt on it
  const startRes = await axios.post(`${API_URL}/api/assessments/${testAssessmentId}/start`, {}, studentHeader);
  const attemptId = startRes.data.attempt._id || startRes.data.attempt.id;
  console.log(`✅ Student created attempt on it: ID = ${attemptId}`);

  // 5. Test that student CANNOT delete the assessment (403 forbidden)
  console.log('4. Verifying student is forbidden from deleting assessment...');
  try {
    await axios.delete(`${API_URL}/api/assessments/${testAssessmentId}`, studentHeader);
    throw new Error('Student should NOT be able to delete assessment!');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('✅ Student correctly rejected with 403 Forbidden.');
    } else {
      throw err;
    }
  }

  // 6. Faculty deletes the assessment
  console.log('5. Faculty deleting the assessment...');
  const delRes = await axios.delete(`${API_URL}/api/assessments/${testAssessmentId}`, facultyHeader);
  console.log(`✅ Delete response: ${delRes.data.message}`);

  // 7. Verify assessment is no longer accessible (404)
  console.log('6. Verifying assessment is no longer accessible...');
  try {
    await axios.get(`${API_URL}/api/assessments/${testAssessmentId}`, facultyHeader);
    throw new Error('Assessment should have been 404 after deletion!');
  } catch (err) {
    if (err.response?.status === 404) {
      console.log('✅ Assessment successfully verified as 404 Not Found.');
    } else {
      throw err;
    }
  }

  console.log('\n🎉 FACULTY ASSESSMENT DELETION VERIFIED SUCCESSFULLY! 🎉\n');
}

verifyDelete().catch((err) => {
  console.error('Delete verification failed:', err.response?.data || err.message);
  process.exit(1);
});
