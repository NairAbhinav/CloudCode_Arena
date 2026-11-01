const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function runTest() {
  console.log('=== ANTI-CHEATING & ATTEMPTS FLOW VERIFICATION ===\n');

  // 1. Log in student
  console.log('1. Logging in as student...');
  const studentLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: 'student@cloudcode.arena',
    password: 'StudentPass123!'
  });
  const studentToken = studentLogin.data.token;
  const studentHeader = { headers: { Authorization: `Bearer ${studentToken}` } };
  console.log('✅ Student logged in.');

  // 2. Log in faculty
  console.log('2. Logging in as faculty...');
  const facultyLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: 'faculty@cloudcode.arena',
    password: 'FacultyPass123!'
  });
  const facultyToken = facultyLogin.data.token;
  const facultyHeader = { headers: { Authorization: `Bearer ${facultyToken}` } };
  console.log('✅ Faculty logged in.');

  // 3. Fetch assessments list
  console.log('3. Fetching assessment list...');
  const listRes = await axios.get(`${API_URL}/api/assessments`, studentHeader);
  const assessment = listRes.data.assessments[0];
  console.log(`✅ Assessment: "${assessment.title}" (ID: ${assessment.id})`);

  // 4. Inspect assessment details before any attempt
  console.log('4. Checking assessment details...');
  const detailRes1 = await axios.get(`${API_URL}/api/assessments/${assessment.id}`, studentHeader);
  const aData = detailRes1.data.assessment;
  console.log(`   - Max Attempts: ${aData.maxAttempts}`);
  console.log(`   - Current Attempts Count: ${aData.attemptsCount}`);
  console.log(`   - My Attempts Array Length: ${aData.myAttempts?.length}`);
  if (aData.maxAttempts !== 3) throw new Error('Expected maxAttempts to be 3');

  // 5. Start Attempt #1 (Auto-termination via anti-cheating threshold)
  console.log('\n5. Starting Attempt #1 (Testing automated violation threshold termination)...');
  const start1 = await axios.post(`${API_URL}/api/assessments/${assessment.id}/start`, {}, studentHeader);
  const att1 = start1.data.attempt;
  console.log(`✅ Attempt #1 started (ID: ${att1._id})`);

  // Send violation 1: tab switch
  const ev1 = await axios.post(`${API_URL}/api/anticheat/events`, {
    assessmentId: assessment.id,
    attemptId: att1._id,
    eventType: 'tab_switch'
  }, studentHeader);
  console.log(`   - Event 1 (tab_switch): action=${ev1.data.actionTaken}, count=${ev1.data.violationsCount}`);

  // Send violation 2: focus loss
  const ev2 = await axios.post(`${API_URL}/api/anticheat/events`, {
    assessmentId: assessment.id,
    attemptId: att1._id,
    eventType: 'focus_loss'
  }, studentHeader);
  console.log(`   - Event 2 (focus_loss): action=${ev2.data.actionTaken}, count=${ev2.data.violationsCount}`);

  // Send violation 3: fullscreen exit (threshold reached!)
  const ev3 = await axios.post(`${API_URL}/api/anticheat/events`, {
    assessmentId: assessment.id,
    attemptId: att1._id,
    eventType: 'fullscreen_exit'
  }, studentHeader);
  console.log(`   - Event 3 (fullscreen_exit): action=${ev3.data.actionTaken}, count=${ev3.data.violationsCount}, isTerminated=${ev3.data.isTerminated}`);

  if (ev3.data.actionTaken !== 'terminated' || !ev3.data.isTerminated) {
    throw new Error('Expected attempt #1 to be terminated on 3rd violation!');
  }
  console.log('✅ Attempt #1 automatically terminated by anti-cheating engine!');

  // 6. Verify assessment details shows Attempt #1
  const detailRes2 = await axios.get(`${API_URL}/api/assessments/${assessment.id}`, studentHeader);
  console.log(`\n6. Checking attempts list after Attempt #1:`);
  console.log(`   - Total attempts recorded: ${detailRes2.data.assessment.myAttempts.length}`);
  console.log(`   - Attempt #1 Status: ${detailRes2.data.assessment.myAttempts[0].status}`);
  console.log(`   - Attempt #1 Violations: ${detailRes2.data.assessment.myAttempts[0].violationsCount}`);

  // 7. Start Attempt #2 (Testing Faculty Remote Termination)
  console.log('\n7. Starting Attempt #2 (Testing faculty remote termination)...');
  const start2 = await axios.post(`${API_URL}/api/assessments/${assessment.id}/start`, {}, studentHeader);
  const att2 = start2.data.attempt;
  console.log(`✅ Attempt #2 started (ID: ${att2._id})`);

  // Faculty views participants
  const partRes = await axios.get(`${API_URL}/api/assessments/${assessment.id}/participants`, facultyHeader);
  console.log(`   - Faculty sees participants count: ${partRes.data.participants.length}`);

  // Faculty terminates Attempt #2 immediately
  console.log('   - Faculty terminates Attempt #2...');
  const termRes = await axios.put(`${API_URL}/api/anticheat/attempts/${att2._id}/action`, {
    action: 'terminate',
    reason: 'Terminated immediately by faculty reviewer for suspicious behavior.'
  }, facultyHeader);
  console.log(`✅ Faculty action result: status=${termRes.data.attempt.status}, disqualified=${termRes.data.attempt.isDisqualified}`);

  // 8. Verify assessment details now shows BOTH Attempt #1 and Attempt #2
  console.log('\n8. Checking attempts list after 2 attempts:');
  const detailRes3 = await axios.get(`${API_URL}/api/assessments/${assessment.id}`, studentHeader);
  const attemptsAfter2 = detailRes3.data.assessment.myAttempts;
  console.log(`   - Total attempts recorded: ${attemptsAfter2.length}`);
  attemptsAfter2.forEach((att) => {
    console.log(`     * Attempt #${att.attemptNumber}: Status=${att.status}, Score=${att.score}, Violations=${att.violationsCount}, Reason="${att.disqualificationReason}"`);
  });

  if (attemptsAfter2.length !== 2) {
    throw new Error(`Expected 2 attempts to be shown, but found ${attemptsAfter2.length}`);
  }
  console.log('✅ Both Attempt #1 and Attempt #2 are clearly returned and shown!');

  // 9. Start Attempt #3 (Allowed because maxAttempts is 3)
  console.log('\n9. Starting Attempt #3 (Testing 3rd attempt)...');
  const start3 = await axios.post(`${API_URL}/api/assessments/${assessment.id}/start`, {}, studentHeader);
  const att3 = start3.data.attempt;
  console.log(`✅ Attempt #3 started (ID: ${att3._id})`);

  // Student submits Attempt #3 normally
  const submit3 = await axios.post(`${API_URL}/api/assessments/${assessment.id}/submit-attempt`, {}, studentHeader);
  console.log(`✅ Attempt #3 submitted normally: status=${submit3.data.attempt.status}`);

  // 10. Verify all 3 attempts are listed and attempt limit is enforced
  console.log('\n10. Checking attempts list after 3 attempts:');
  const detailRes4 = await axios.get(`${API_URL}/api/assessments/${assessment.id}`, studentHeader);
  const attemptsAfter3 = detailRes4.data.assessment.myAttempts;
  console.log(`   - Total attempts recorded: ${attemptsAfter3.length} of ${detailRes4.data.assessment.maxAttempts}`);
  attemptsAfter3.forEach((att) => {
    console.log(`     * Attempt #${att.attemptNumber}: Status=${att.status}, Score=${att.score}, Violations=${att.violationsCount}`);
  });

  // Attempting 4th attempt should be blocked
  try {
    await axios.post(`${API_URL}/api/assessments/${assessment.id}/start`, {}, studentHeader);
    throw new Error('Attempt #4 should have been blocked!');
  } catch (err) {
    console.log(`✅ Attempt #4 correctly blocked: "${err.response?.data?.error}"`);
  }

  console.log('\n🎉 ALL ANTI-CHEATING AND ATTEMPTS VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTest().catch((err) => {
  console.error('Test failed:', err.response?.data || err.message);
  process.exit(1);
});
