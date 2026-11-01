const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function verify() {
  console.log('[Verification] 1. Logging in as student...');
  const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
    email: 'student@cloudcode.arena',
    password: 'StudentPass123!'
  });

  if (!loginRes.data.success) {
    throw new Error('Login failed: ' + JSON.stringify(loginRes.data));
  }

  const token = loginRes.data.token;
  console.log('✅ Student login successful! User:', loginRes.data.user.email);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // 2. Test Languages via /api/execute/run
  const testCases = [
    {
      lang: 'python',
      code: 'import sys\nline = sys.stdin.read().strip()\nprint(f"PYTHON_OK: {line.upper()}")',
      input: 'hello world',
      expected: 'PYTHON_OK: HELLO WORLD'
    },
    {
      lang: 'c',
      code: `#include <stdio.h>
int main() {
    char buf[128];
    if (fgets(buf, sizeof(buf), stdin)) {
        printf("C_OK: %s", buf);
    }
    return 0;
}`,
      input: 'cloudcode\n',
      expected: 'C_OK: cloudcode'
    },
    {
      lang: 'cpp',
      code: `#include <iostream>
#include <string>
using namespace std;
int main() {
    string s;
    getline(cin, s);
    cout << "CPP_OK: " << s << endl;
    return 0;
}`,
      input: 'modern cpp test',
      expected: 'CPP_OK: modern cpp test'
    },
    {
      lang: 'java',
      code: `import java.util.Scanner;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            System.out.println("JAVA_OK: " + sc.nextLine());
        }
    }
}`,
      input: 'java enterprise test',
      expected: 'JAVA_OK: java enterprise test'
    }
  ];

  for (const tc of testCases) {
    console.log(`[Verification] Testing ${tc.lang.toUpperCase()} execution...`);
    const runRes = await axios.post(
      `${API_URL}/api/execute/run`,
      {
        code: tc.code,
        input: tc.input,
        language: tc.lang
      },
      authHeader
    );

    const data = runRes.data;
    if (data.status === 'Success' && data.stdout.trim() === tc.expected.trim()) {
      console.log(`✅ ${tc.lang.toUpperCase()}: Passed! Output: "${data.stdout.trim()}" (${data.executionTimeMs}ms)`);
    } else {
      console.error(`❌ ${tc.lang.toUpperCase()} failed:`, data);
      throw new Error(`${tc.lang} test failed`);
    }
  }

  // 3. Test Problem list
  console.log('[Verification] 3. Fetching question list...');
  const qListRes = await axios.get(`${API_URL}/api/questions`, authHeader);
  console.log(`✅ Fetched ${qListRes.data.questions.length} problems from database.`);

  console.log('\n🎉 ALL RUNTIME & VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

verify().catch((err) => {
  console.error('\nVerification failed:', err.response?.data || err.message);
  process.exit(1);
});
