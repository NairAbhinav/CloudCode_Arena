# CloudCode Arena — REST API Documentation

All API routes are accessible through the API Gateway at `http://localhost:5000` (or `https://api.yourdomain.com` in production).

Authenticated routes require the standard Bearer token header:
`Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication Service (`/api/auth`)

### `POST /api/auth/register`
Register a new student or faculty account.
- **Access**: Public
- **Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@university.edu",
    "password": "Password123!",
    "role": "student"
  }
  ```
- **Response**: `201 Created` with JWT token and user profile.

### `POST /api/auth/login`
Authenticate existing user.
- **Access**: Public
- **Body**:
  ```json
  {
    "email": "jane@university.edu",
    "password": "Password123!"
  }
  ```
- **Response**: `200 OK` with token and user profile.

### `GET /api/auth/me`
Retrieve currently authenticated user profile.
- **Access**: Authenticated

### `POST /api/auth/bootstrap-admin`
Development-only bootstrap for platform administrator.
- **Headers**: `x-bootstrap-key: <BOOTSTRAP_ADMIN_KEY>`

### `GET /api/auth/users`
List and search users with pagination.
- **Access**: Administrator (`admin`)

### `PUT /api/auth/users/:id/role`
Modify user role (`student`, `faculty`, `admin`).
- **Access**: Administrator (`admin`)

### `PUT /api/auth/users/:id/status`
Activate or deactivate user account.
- **Access**: Administrator (`admin`)

---

## 2. Questions API (`/api/questions`)

### `GET /api/questions`
List coding questions with filters.
- **Query Parameters**: `search`, `difficulty` (`Easy`|`Medium`|`Hard`), `topic`, `visibility` (`mine`|`shared`), `page`, `limit`.
- **Note**: Hidden test cases are strictly excluded from student responses.

### `GET /api/questions/:id`
Retrieve problem details, input/output formats, constraints, and sample cases.
- **Access**: Authenticated

### `POST /api/questions`
Create a new problem with public and hidden test cases.
- **Access**: Faculty, Administrator

### `PUT /api/questions/:id`
Update an existing problem.
- **Access**: Faculty owner or Administrator

### `DELETE /api/questions/:id`
Delete problem and associated test cases.
- **Access**: Faculty owner or Administrator

### `POST /api/questions/:id/publish`
Toggle question publication status (requires at least 1 public and 1 hidden case).

---

## 3. Assessments API (`/api/assessments`)

### `GET /api/assessments`
List published assessments (for students) or created assessments (for faculty).

### `GET /api/assessments/:id`
Retrieve assessment metadata, instructions, timing, and anti-cheating configuration notice.

### `POST /api/assessments`
Create a scheduled assessment with questions, marks, and proctoring rules.
- **Access**: Faculty, Administrator

### `POST /api/assessments/:id/start`
Start an assessment attempt for student. Enforces start/end window and attempt limits.
- **Access**: Student

### `GET /api/assessments/:id/attempt`
Retrieve remaining duration and state of current in-progress attempt.
- **Access**: Student

### `POST /api/assessments/:id/submit-attempt`
Finalize and complete assessment attempt.
- **Access**: Student

### `GET /api/assessments/:id/participants`
List all participant attempts, scores, and status.
- **Access**: Faculty owner or Administrator

### `PUT /api/assessments/:id/release-results`
Release assessment results to participating students.
- **Access**: Faculty owner or Administrator

---

## 4. Code Execution & Submissions API

### `POST /api/execute/run`
Run Python 3 code against custom input or sample test case without formal recording.
- **Body**: `{ "code": "print(42)", "input": "", "timeoutMs": 5000 }`

### `POST /api/submissions/submit`
Submit solution for judging against all public and hidden test cases.
- **Body**: `{ "questionId": "...", "assessmentId": "...", "code": "..." }`
- **Output**: Evaluation results with hidden test cases masked for privacy.

### `GET /api/submissions/my`
List student's submission history.

### `GET /api/submissions/:id`
View details and source code of a specific submission.

---

## 5. Anti-Cheating API (`/api/anticheat`)

### `POST /api/anticheat/events`
Record student browser telemetry event (tab switch, focus loss, fullscreen exit, clipboard).
- **Body**:
  ```json
  {
    "assessmentId": "...",
    "attemptId": "...",
    "eventType": "tab_switch",
    "metadata": { "hiddenAt": "2026-10-17T14:30:00Z" }
  }
  ```
- **Returns**: `actionTaken` (`logged`|`warning`|`flagged`|`terminated`), `violationsCount`, `isTerminated`.

### `GET /api/anticheat/attempts/:assessmentId/flagged`
Retrieve flagged/terminated attempts with full chronological violation history.
- **Access**: Faculty, Administrator

### `PUT /api/anticheat/attempts/:attemptId/action`
Faculty action: `resolve` (clear flag) or `disqualify` (score set to 0).
- **Access**: Faculty, Administrator

---

## 6. Reports & Analytics API (`/api/reports`)

### `GET /api/reports/student/progress`
Returns student attempted/solved count, topic progress, difficulty breakdown, and recent submissions.

### `GET /api/reports/faculty/analytics`
Returns assessment averages, completion rates, and question statistics.

### `GET /api/reports/faculty/assessments/:id/export-csv`
Downloads gradebook CSV protected against formula injection.

### `GET /api/reports/leaderboard`
Returns student rankings sorted by solved problems, total score, and earliest submission.
