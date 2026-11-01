require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
  User,
  Question,
  TestCase,
  Assessment,
  connectDB,
  disconnectDB
} = require('@cloudcode-arena/shared');

async function seed() {
  console.log('[Seed] Connecting to MongoDB...');
  await connectDB();

  console.log('[Seed] Clearing existing collections for fresh seed...');
  await User.deleteMany({});
  await Question.deleteMany({});
  await TestCase.deleteMany({});
  await Assessment.deleteMany({});

  const salt = await bcrypt.genSalt(10);

  // 1. Create Default Users
  console.log('[Seed] Creating default role accounts...');
  const studentPassword = await bcrypt.hash('StudentPass123!', salt);
  const facultyPassword = await bcrypt.hash('FacultyPass123!', salt);
  const adminPassword = await bcrypt.hash('AdminPass123!', salt);

  const studentUser = await User.create({
    name: 'Alex Student',
    email: 'student@cloudcode.arena',
    passwordHash: studentPassword,
    role: 'student',
    status: 'active'
  });

  const facultyUser = await User.create({
    name: 'Dr. Sarah Faculty',
    email: 'faculty@cloudcode.arena',
    passwordHash: facultyPassword,
    role: 'faculty',
    status: 'active'
  });

  const adminUser = await User.create({
    name: 'Platform Administrator',
    email: 'admin@cloudcode.arena',
    passwordHash: adminPassword,
    role: 'admin',
    status: 'active'
  });

  console.log(`[Seed] Created Users:
  - Student: student@cloudcode.arena (StudentPass123!)
  - Faculty: faculty@cloudcode.arena (FacultyPass123!)
  - Admin:   admin@cloudcode.arena   (AdminPass123!)`);

  // 2. Create Coding Questions
  console.log('[Seed] Creating standard coding problems with public and hidden test cases...');

  // Problem 1: Sum of Two Numbers
  const q1 = await Question.create({
    title: 'Sum of Two Numbers',
    description: 'Write a program that reads two integers separated by a space from standard input and prints their sum to standard output.',
    inputFormat: 'A single line containing two space-separated integers, a and b.',
    outputFormat: 'Print a single integer representing the sum a + b.',
    constraints: '-10^9 <= a, b <= 10^9',
    difficulty: 'Easy',
    topicTags: ['Math', 'Basics'],
    sampleTestCases: [
      { input: '3 5', output: '8', explanation: '3 + 5 = 8' },
      { input: '-10 15', output: '5', explanation: '-10 + 15 = 5' }
    ],
    starterCode: `# Read two integers from input and print their sum\nimport sys\n\ndef main():\n    line = sys.stdin.read().strip()\n    if line:\n        a, b = map(int, line.split())\n        print(a + b)\n\nif __name__ == '__main__':\n    main()\n`,
    creator: adminUser._id,
    visibility: 'shared',
    isPublished: true
  });

  await TestCase.insertMany([
    // Public cases
    { questionId: q1._id, input: '3 5', expectedOutput: '8', isHidden: false },
    { questionId: q1._id, input: '-10 15', expectedOutput: '5', isHidden: false },
    // Hidden cases
    { questionId: q1._id, input: '0 0', expectedOutput: '0', isHidden: true },
    { questionId: q1._id, input: '999999999 1', expectedOutput: '1000000000', isHidden: true },
    { questionId: q1._id, input: '-500 -500', expectedOutput: '-1000', isHidden: true }
  ]);

  // Problem 2: Reverse a String
  const q2 = await Question.create({
    title: 'Reverse a String',
    description: 'Given a string from standard input, print the reversed string to standard output.',
    inputFormat: 'A single line containing a string s.',
    outputFormat: 'Print the reversed string.',
    constraints: '1 <= len(s) <= 10^5',
    difficulty: 'Easy',
    topicTags: ['Strings', 'Basics'],
    sampleTestCases: [
      { input: 'cloudcode', output: 'edocduolc', explanation: 'Reversing "cloudcode" yields "edocduolc".' },
      { input: 'Arena', output: 'anerA', explanation: 'Case is preserved.' }
    ],
    starterCode: `import sys\n\ndef main():\n    s = sys.stdin.read().strip()\n    print(s[::-1])\n\nif __name__ == '__main__':\n    main()\n`,
    creator: adminUser._id,
    visibility: 'shared',
    isPublished: true
  });

  await TestCase.insertMany([
    // Public
    { questionId: q2._id, input: 'cloudcode', expectedOutput: 'edocduolc', isHidden: false },
    { questionId: q2._id, input: 'Arena', expectedOutput: 'anerA', isHidden: false },
    // Hidden
    { questionId: q2._id, input: 'racecar', expectedOutput: 'racecar', isHidden: true },
    { questionId: q2._id, input: 'Python3', expectedOutput: '3nohtyP', isHidden: true },
    { questionId: q2._id, input: 'a', expectedOutput: 'a', isHidden: true }
  ]);

  // Problem 3: Check Prime Number
  const q3 = await Question.create({
    title: 'Check Prime Number',
    description: 'Determine whether a given positive integer n is a prime number. Print "PRIME" if it is prime, and "NOT PRIME" otherwise.',
    inputFormat: 'A single integer n.',
    outputFormat: 'Print "PRIME" or "NOT PRIME" (uppercase).',
    constraints: '1 <= n <= 10^9',
    difficulty: 'Medium',
    topicTags: ['Math', 'Algorithms'],
    sampleTestCases: [
      { input: '7', output: 'PRIME', explanation: '7 has no divisors other than 1 and 7.' },
      { input: '1', output: 'NOT PRIME', explanation: '1 is by definition not a prime number.' },
      { input: '4', output: 'NOT PRIME', explanation: '4 is divisible by 2.' }
    ],
    starterCode: `import sys\n\ndef is_prime(n):\n    if n <= 1:\n        return False\n    if n <= 3:\n        return True\n    if n % 2 == 0 or n % 3 == 0:\n        return False\n    i = 5\n    while i * i <= n:\n        if n % i == 0 or n % (i + 2) == 0:\n            return False\n        i += 6\n    return True\n\ndef main():\n    n = int(sys.stdin.read().strip())\n    print("PRIME" if is_prime(n) else "NOT PRIME")\n\nif __name__ == '__main__':\n    main()\n`,
    creator: facultyUser._id,
    visibility: 'faculty',
    isPublished: true
  });

  await TestCase.insertMany([
    // Public
    { questionId: q3._id, input: '7', expectedOutput: 'PRIME', isHidden: false },
    { questionId: q3._id, input: '1', expectedOutput: 'NOT PRIME', isHidden: false },
    { questionId: q3._id, input: '4', expectedOutput: 'NOT PRIME', isHidden: false },
    // Hidden
    { questionId: q3._id, input: '2', expectedOutput: 'PRIME', isHidden: true },
    { questionId: q3._id, input: '999999937', expectedOutput: 'PRIME', isHidden: true },
    { questionId: q3._id, input: '1000000000', expectedOutput: 'NOT PRIME', isHidden: true }
  ]);

  // Problem 4: Find Largest Number in List
  const q4 = await Question.create({
    title: 'Find Largest Number in List',
    description: 'Given a list of whitespace-separated integers, output the maximum value among them.',
    inputFormat: 'Space or newline-separated integers.',
    outputFormat: 'Print the largest integer.',
    constraints: '1 <= number of elements <= 10^5, -10^9 <= each value <= 10^9',
    difficulty: 'Easy',
    topicTags: ['Arrays', 'Algorithms'],
    sampleTestCases: [
      { input: '3 8 2 10 5', output: '10', explanation: '10 is the maximum number.' },
      { input: '-5 -2 -10', output: '-2', explanation: '-2 is the highest value.' }
    ],
    starterCode: `import sys\n\ndef main():\n    nums = list(map(int, sys.stdin.read().split()))\n    if nums:\n        print(max(nums))\n\nif __name__ == '__main__':\n    main()\n`,
    creator: adminUser._id,
    visibility: 'shared',
    isPublished: true
  });

  await TestCase.insertMany([
    // Public
    { questionId: q4._id, input: '3 8 2 10 5', expectedOutput: '10', isHidden: false },
    { questionId: q4._id, input: '-5 -2 -10', expectedOutput: '-2', isHidden: false },
    // Hidden
    { questionId: q4._id, input: '42', expectedOutput: '42', isHidden: true },
    { questionId: q4._id, input: '1000 2000 5000 100', expectedOutput: '5000', isHidden: true },
    { questionId: q4._id, input: '-1 -2 -3 -4 -5', expectedOutput: '-1', isHidden: true }
  ]);

  // Problem 5: Fibonacci Sequence Generator
  const q5 = await Question.create({
    title: 'Generate Fibonacci Sequence',
    description: 'Given an integer n, print the first n terms of the Fibonacci sequence, space-separated, starting with 0 and 1.',
    inputFormat: 'A single integer n.',
    outputFormat: 'A single line containing the first n Fibonacci numbers separated by a space.',
    constraints: '1 <= n <= 30',
    difficulty: 'Medium',
    topicTags: ['Algorithms', 'Recursion', 'Math'],
    sampleTestCases: [
      { input: '5', output: '0 1 1 2 3', explanation: 'First 5 terms are 0, 1, 1, 2, 3.' },
      { input: '1', output: '0', explanation: 'First term is 0.' }
    ],
    starterCode: `import sys\n\ndef main():\n    n = int(sys.stdin.read().strip())\n    fibs = []\n    a, b = 0, 1\n    for _ in range(n):\n        fibs.append(str(a))\n        a, b = b, a + b\n    print(' '.join(fibs))\n\nif __name__ == '__main__':\n    main()\n`,
    creator: facultyUser._id,
    visibility: 'faculty',
    isPublished: true
  });

  await TestCase.insertMany([
    // Public
    { questionId: q5._id, input: '5', expectedOutput: '0 1 1 2 3', isHidden: false },
    { questionId: q5._id, input: '1', expectedOutput: '0', isHidden: false },
    // Hidden
    { questionId: q5._id, input: '2', expectedOutput: '0 1', isHidden: true },
    { questionId: q5._id, input: '10', expectedOutput: '0 1 1 2 3 5 8 13 21 34', isHidden: true },
    { questionId: q5._id, input: '8', expectedOutput: '0 1 1 2 3 5 8 13', isHidden: true }
  ]);

  console.log('[Seed] 5 problems created with complete public & hidden test cases.');

  // 3. Create a Scheduled Assessment with Anti-Cheating configured
  console.log('[Seed] Creating demo assessment with anti-cheating monitoring enabled...');
  const now = new Date();
  const startTime = new Date(now.getTime() - 10 * 60000); // Started 10 mins ago
  const endTime = new Date(now.getTime() + 180 * 60000); // Ends in 3 hours

  const demoAssessment = await Assessment.create({
    title: 'Midterm Python Coding Assessment 2026',
    description: 'Official proctored coding assessment evaluating algorithmic problem-solving in Python 3.',
    instructions: '1. Anti-cheating monitoring is active.\n2. Do NOT switch tabs, minimize the window, or exit fullscreen.\n3. Monaco Editor keyboard shortcuts and copy/paste within the editor are allowed.\n4. Complete all problems before the duration expires.',
    questions: [
      { questionId: q1._id, marks: 30 },
      { questionId: q2._id, marks: 30 },
      { questionId: q3._id, marks: 40 }
    ],
    totalMarks: 100,
    startTime,
    endTime,
    durationMinutes: 60,
    maxAttempts: 3,
    resultReleasePolicy: 'immediate',
    isResultsReleased: true,
    antiCheatingConfig: {
      enabled: true,
      trackTabSwitches: true,
      trackFocusLoss: true,
      trackFullscreenExit: true,
      trackClipboard: true,
      maxViolations: 3,
      actionOnThreshold: 'terminate'
    },
    status: 'published',
    creator: facultyUser._id
  });

  console.log(`[Seed] Created Assessment: "${demoAssessment.title}" (ID: ${demoAssessment._id})`);
  console.log('[Seed] Database seeding completed successfully!');

  await disconnectDB();
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    });
}

module.exports = seed;
