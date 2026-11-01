# CloudCode Arena — Architecture & Design

## 1. High-Level Architecture Overview

**CloudCode Arena** is a decoupled, cloud-ready coding practice and timed assessment platform. The architecture emphasizes modular microservices, single datastore persistence (`cloudcode_arena` on MongoDB), isolated code execution sandboxing, and real-time anti-cheating monitoring telemetry.

```
┌─────────────────────────────────────────────────────────────┐
│                      STUDENT / FACULTY BROWSER              │
│                     (React 18 + Vite + Monaco)              │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST (Port 5000)
┌──────────────────────────────▼──────────────────────────────┐
│                        API GATEWAY                          │
│   (Express Reverse Proxy, CORS, Helmet, Rate Limiter)       │
└──────┬──────────────┬──────────────┬──────────────┬─────────┘
       │              │              │              │
┌──────▼─────┐ ┌──────▼─────┐ ┌──────▼─────┐ ┌──────▼─────┐
│    Auth    │ │ Assessment │ │ Submission │ │  Reporting │
│   Service  │ │   Service  │ │   Service  │ │ & AntiCheat│
│  (Port 5001│ │ (Port 5002)│ │ (Port 5003)│ │ (Port 5004)│
└──────┬─────┘ └──────┬─────┘ └──────┬──┬──┘ └──────┬─────┘
       │              │              │  │           │
       │              │   ┌──────────┘  │           │
       │              │   │             │           │
       │              │   │   ┌─────────▼───────────▼─┐
       │              │   │   │  ISOLATED CODE RUNNER │
       │              │   │   │  (Python 3 Sandbox)   │
       │              │   │   │  (Port 5005)          │
       │              │   │   └───────────────────────┘
       │              │   │
┌──────▼──────────────▼───▼───────────────────────────▼───────┐
│                    MONGODB DATASTORE                        │
│                (Database: cloudcode_arena)                  │
└─────────────────────────────────────────────────────────────┘
```

## 2. Logical Components and Boundaries

### 2.1 React Frontend
- Built with React 18, Vite, and Tailwind CSS.
- Integrates the Microsoft Monaco Editor with Python 3 syntax highlighting and full keyboard navigation.
- Copy, cut, and paste operations inside Monaco Editor remain completely functional, preserving normal developer experience even during proctored exams.
- Communicates exclusively with the API Gateway at `/api/...`. Never establishes direct connections to MongoDB or internal microservice ports.

### 2.2 API Gateway (Port 5000)
- Single entrypoint for all frontend API traffic.
- Centralizes CORS handling, HTTP security headers (Helmet), request logging (Morgan), and IP rate limiting.
- Proxies requests internally to downstream services:
  - `/api/auth` ➔ `auth-service:5001`
  - `/api/questions` & `/api/assessments` ➔ `assessment-service:5002`
  - `/api/execute` & `/api/submissions` ➔ `submission-service:5003`
  - `/api/anticheat`, `/api/reports`, `/api/admin` ➔ `reporting-service:5004`

### 2.3 Authentication and User Service (Port 5001)
- Manages user lifecycle, registration, login, JWT token issuance, and password hashing using `bcryptjs`.
- Role-based access control (RBAC) supporting three distinct personas: `student`, `faculty`, and `admin`.
- Development admin bootstrap utility protected by a secure key.
- Administrative user search, role reassignments, and account activation/deactivation.

### 2.4 Question and Assessment Service (Port 5002)
- Question authoring, search, difficulty filtering (Easy, Medium, Hard), and topic tag classification.
- Manages question visibility (`shared` vs `faculty-owned`) and publication verification (enforcing at least 1 public and 1 hidden test case).
- Strips hidden test cases from student API responses to prevent answer leakage.
- Assessment lifecycle management: scheduling windows, duration enforcement, attempt limits, and result release policies (`immediate`, `after_deadline`, `manual`).

### 2.5 Submission and Evaluation Service (Port 5003)
- Orchestrates code evaluation for both exploratory "Run Code" actions and formal "Submit Solution" requests.
- Fetches all test cases from MongoDB and dispatches execution requests to the isolated code-runner.
- Normalizes output line-by-line (handling Windows `\r\n` vs Unix `\n` newlines and trailing whitespace).
- Computes weighted score based on passed test cases, records persistent submission records, and updates student assessment attempt marks.

### 2.6 Reporting and Anti-Cheating Service (Port 5004)
- Telemetry endpoint for real-time monitoring events (tab visibility changes, window blur, fullscreen exits, external clipboard interaction).
- Evaluates per-assessment anti-cheating configuration rules, violation thresholds, and automatic actions (warnings, attempt flagging, or termination).
- Generates student progress metrics, faculty class analytics, and global leaderboards.
- Exports assessment gradebook to CSV with built-in defense against CSV Formula Injection.

### 2.7 Isolated Code Runner (Port 5005)
- Dedicated execution component for untrusted Python 3 source code.
- Enforces strict resource constraints:
  - Execution timeout (default 5000ms).
  - Sanitized runtime environment (host credentials, tokens, and database secrets are purged from child process environments).
  - Memory caps and output size limits (max 64KB).
- Validates syntax using Python AST before execution, ensuring accurate `SyntaxError` reporting rather than incorrectly reporting compilation errors.

### 2.8 MongoDB Datastore (Port 27017)
- Single centralized database named `cloudcode_arena`.
- Persistent volume storage `mongo-data` survives container restarts.
- 9 indexed collections: `users`, `questions`, `testcases`, `assessments`, `assessmentattempts`, `submissions`, `assessmentresults`, `anticheatingevents`, `auditlogs`.
