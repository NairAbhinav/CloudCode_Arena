# CloudCode Arena — Security Architecture & Guidelines

## 1. Threat Model & Security Posture

CloudCode Arena is designed to handle untrusted user code, enforce academic integrity, protect confidential test data, and defend against unauthorized administrative operations.

---

## 2. Code Runner Sandbox Security

### Untrusted Code Execution
Submitted student code is treated as **hostile and untrusted**:

- **Execution Timeout**: Enforced strictly at the process and container level (default 5000ms). Infinite loops (`while True: pass`) and CPU starvation attacks are terminated with status `Time Limit Exceeded`.
- **Environment Sanitization**: Host application environment variables (including database credentials, `JWT_SECRET`, and cloud API keys) are completely purged before spawning execution subprocesses or containers.
- **Network Restrictions**: In containerized mode, containers run with `--network none`, preventing external network connections, server-side request forgery (SSRF), and exfiltration.
- **Resource Limits**: Process limits (`pids-limit 30`), memory restrictions (`128MB`), and read-only filesystems defend against fork bombs and disk exhaustion.
- **Docker Socket Isolation**: The Docker socket (`/var/run/docker.sock`) is NEVER mounted into the frontend, API gateway, general backend services, or student execution containers.

---

## 3. Confidentiality of Hidden Test Cases

A core integrity requirement is that hidden test cases must **never leak to students**:

- The database stores test cases with an `isHidden` boolean flag.
- When students query problems via `GET /api/questions` or `GET /api/questions/:id`, the assessment service queries only `sampleTestCases` and scrubs all hidden test case inputs and outputs.
- When students submit code via `POST /api/submissions/submit`, the submission service evaluates hidden test cases internally. In the API response returned to the student, hidden test case inputs and outputs are replaced with sanitized placeholders (`[Hidden Output]`).

---

## 4. Role-Based Access Control (RBAC)

- All authorization rules are enforced strictly on the backend via Express middleware (`requireRole`). Client-supplied roles and identities in HTTP request bodies are disregarded.
- **Student**: Allowed access only to their own submissions, published questions, and scheduled assessments.
- **Faculty**: Authorized to author questions, create assessments, review participant scores, and investigate anti-cheating flags.
- **Admin**: Authorized to assign user roles, manage platform questions, and view audit logs.

---

## 5. CSV Formula Injection Defense (DDE Injection)

When exporting gradebooks to CSV via `GET /api/reports/faculty/assessments/:id/export-csv`, cell values are processed by `sanitizeCsvCell`:
- Any cell value starting with `=`, `+`, `-`, `@`, `\t`, or `\r` is automatically prepended with a single apostrophe `'`.
- Double quotes are escaped according to RFC 4180 standards.
- This prevents execution of malicious macro commands when faculty members open gradebooks in Microsoft Excel or Google Sheets.

---

## 6. Anti-Cheating System Limitations & Fair Use

- Browser-based monitoring (detecting tab switches, window blur, fullscreen exits, and clipboard events) cannot guarantee detection of every possible external cheating tool or secondary physical devices (such as smartphones).
- The anti-cheating system logs events as **telemetry for faculty review** rather than treating every tab switch as conclusive proof of cheating.
- Normal coding keyboard shortcuts (copy, paste, cut, undo, redo, and right-click) are preserved inside Monaco Editor.
