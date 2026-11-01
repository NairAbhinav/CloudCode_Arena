# CloudCode Arena 🏟️

> A modern, cloud-ready coding practice and timed assessment platform for students, faculty members, and administrators. Features isolated Python 3 execution, real-time proctoring telemetry, automated grading with hidden test cases, rich analytics, and production-ready GCP deployment configurations.

---

## 1. Features Overview

### 🎓 Student Experience
- **Interactive Dashboard**: Track attempted and solved challenges, pass rates, topic-wise progress, and difficulty breakdown.
- **Problem Practice Bank**: Filter by difficulty (Easy, Medium, Hard), topic tags (Math, Strings, Arrays, Algorithms), and search keywords. Solved status is highlighted automatically.
- **Monaco Code Editor**: Python 3 syntax highlighting, indentation, keyboard shortcuts, code reset, and custom input execution.
  - *Monaco Editor Integrity*: Full copy, cut, paste, and right-click functionality are preserved for standard coding workflows.
- **Automated Judging**: Instant feedback against sample and private hidden test cases. Evaluates statuses: `Accepted`, `Wrong Answer`, `Runtime Error`, and `Time Limit Exceeded`.
- **Scheduled Monitored Assessments**: Real-time server-enforced countdown timer, multi-problem switcher, and automatic exam finalization.
- **Submission History**: Complete timeline of past evaluations, execution duration, earned points, and submitted source code.
- **Global Leaderboard**: Competitive ranking calculated by problems solved, total score, and earliest submission tie-breaking.

### 👩‍🏫 Faculty Experience
- **Faculty Dashboard**: Class analytics, active assessment counters, total student evaluations, and flagged incident alerts.
- **Question Bank Authoring**: Create custom problems with descriptions, constraints, starter templates, and test cases (both public and hidden).
- **Assessment Management**: Set exam scheduling windows, duration, allowed attempt limits, and result release policies (`immediate`, `after_deadline`, `manual`).
- **Configurable Anti-Cheating System**:
  - Master toggle per assessment.
  - Granular rule selection: tab visibility switches, window blur/focus loss, fullscreen exit, and external clipboard monitoring.
  - Configurable violation thresholds and actions (`warn`, `flag`, `terminate`).
- **Assessment Monitoring & Grading**: Live participant roster with real-time attempt tracking, scores, and manual result release controls.
- **Flagged Incidents Adjudication**: Chronological event timeline of detected violations with actions to **Resolve & Clear** or **Disqualify** attempts.
- **Secure CSV Export**: Export assessment gradebooks with built-in defense against **CSV Formula Injection**.

### 🛡️ Administrator Module
- **User & Role Administration**: Search accounts, modify roles between Student, Faculty, and Admin, and activate or suspend accounts.
- **Shared Problem Moderation**: Oversee platform-wide shared question library.
- **Immutable Security Audit Trail**: Chronological audit logs tracking all user logins, role modifications, and assessment actions.
- **Infrastructure Health Hub**: Live diagnostic monitoring of all microservices, API Gateway routes, and MongoDB connectivity.

---

## 2. System Architecture

CloudCode Arena utilizes a modular architecture where the React frontend talks exclusively through an API Gateway to decoupled backend services, all backed by a single MongoDB database (`cloudcode_arena`):

```
                   Browser Client (React 18 + Vite)
                                  │
                                  ▼
                     API Gateway (Port 5000)
       ┌──────────────────────────┼─────────────────────────┐
       ▼                          ▼                         ▼
  Auth Service          Assessment Service         Submission Service
  (Port 5001)              (Port 5002)               (Port 5003)
       │                          │                         │
       │                          │                 ┌───────▼────────┐
       │                          │                 │  Code Runner   │
       │                          │                 │  (Port 5005)   │
       │                          │                 └────────────────┘
       ▼                          ▼                         ▼
Reporting Service   ──────────────────────────────────────────────────
  (Port 5004)                     │
                                  ▼
                   MongoDB Datastore (cloudcode_arena)
```

---

## 3. Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Monaco Editor (`@monaco-editor/react`), Lucide React, Axios, React Router v6.
- **API Gateway**: Express.js, Helmet, CORS, Express Rate Limit, Morgan, Http-Proxy-Middleware.
- **Backend Services**: Node.js, Express.js, JWT, bcryptjs, Mongoose.
- **Database**: MongoDB 7.0 (`cloudcode_arena`). Single persistent volume (`mongo-data`).
- **Code Execution**: Python 3 isolated runner with execution timeouts, memory caps, sanitized environments, and syntax checking.
- **Containerization**: Docker, Docker Compose, Multi-stage Dockerfiles.

---

## 4. Project Structure

```
cloudcode-arena/
├── frontend/                  # React 18 + Vite Client
│   ├── src/
│   │   ├── api/               # Axios client with interceptors
│   │   ├── components/        # Monaco Editor, OutputPanel, Navbar, MetricCard
│   │   ├── context/           # AuthContext (JWT, session persistence)
│   │   └── pages/             # Student, Faculty, Admin, and Auth views
│   ├── Dockerfile
│   └── package.json
├── api-gateway/               # API Gateway & Reverse Proxy (Port 5000)
│   ├── src/index.js
│   ├── Dockerfile
│   └── package.json
├── services/
│   ├── auth-service/          # Authentication & User Management (Port 5001)
│   ├── assessment-service/    # Questions & Scheduled Assessments (Port 5002)
│   ├── submission-service/    # Judging & Code Evaluation (Port 5003)
│   └── reporting-service/     # Anti-Cheating & Analytics (Port 5004)
├── code-runner/               # Isolated Python 3 Sandbox Runner (Port 5005)
│   ├── src/executor.js
│   ├── Dockerfile
│   └── package.json
├── shared/                    # Shared Mongoose Schemas & Utilities
├── docker/                    # GCP Production & Per-Service Compose Configurations
│   ├── compose-mongodb.yaml            # Dedicated MongoDB Compose
│   ├── compose-auth-service.yaml       # Auth Service Compose
│   ├── compose-assessment-service.yaml # Assessment Service Compose
│   ├── compose-submission-service.yaml # Submission Service Compose
│   ├── compose-reporting-service.yaml  # Reporting Service Compose
│   ├── compose-code-runner.yaml        # Isolated Sandbox Runner Compose
│   ├── compose-api-gateway.yaml        # API Gateway Compose
│   ├── compose-frontend.yaml           # Frontend Web Client Compose
│   ├── compose-backend.yaml            # Grouped Backend Services Compose
│   ├── compose.frontend-gateway.yaml   # Grouped Ingress & Frontend Compose
│   └── compose.production.yaml         # Complete Multi-Container Production Compose
├── scripts/                   # Build, Seed, & Automated Test Scripts
│   ├── build-and-push-gcp.ps1 # Build & push images to GCP Artifact Registry (PowerShell)
│   └── build-and-push-gcp.sh  # Build & push images to GCP Artifact Registry (Bash)
├── tests/                     # Unit, Security, Integration, & E2E Suites
├── docs/                      # Technical Documentation & Detailed GCP Deployment Guide
├── compose.yaml               # Root Local Docker Compose (All 8 services for local testing)
├── .env.example               # Local Development Environment Configuration Template
├── .env.gcp.example           # GCP Production Deployment Configuration Template
└── README.md
```

---

## 5. Quick Start (Local Docker Compose)

### 1. Prerequisites
- Docker Desktop or Docker Engine v24+ with Docker Compose v2+
- Node.js v18+ and Python 3.10+ (if testing standalone outside Docker)

### 2. Configure Environment
```bash
# Copy template configuration
cp .env.example .env
```

### 3. Launch Platform Containers
```bash
# Build and start all 8 services in the background
docker compose up -d --build

# View container status
docker compose ps

# Follow logs across all microservices
docker compose logs -f
```

### 4. Seed Sample Problems & Demo Users
```bash
# Automatically detects Docker containers and seeds into the correct MongoDB instance
npm run seed
```

> **Important Note**: If you have a local MongoDB service running on port 27017 alongside Docker,
> `npm run seed` intelligently detects this and seeds into the Docker container's internal MongoDB
> (via `cca-auth-service`) instead of the local MongoDB instance. This ensures demo data is always
> inserted into the correct database that all Docker microservices use.

### 5. Access the Platform
- **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
- **API Gateway Health Check**: [http://localhost:5000/health](http://localhost:5000/health)

---

## 6. Seed Accounts

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Student** | `student@cloudcode.arena` | `StudentPass123!` | Solve practice problems, submit solutions, take timed assessments, view leaderboard |
| **Faculty** | `faculty@cloudcode.arena` | `FacultyPass123!` | Author questions, schedule assessments, configure anti-cheating, review flags, export CSV |
| **Administrator** | `admin@cloudcode.arena` | `AdminPass123!` | Manage user accounts & roles, moderate questions, view audit logs, monitor infrastructure health |

---

## 7. Automated Testing Suite

CloudCode Arena includes verified automated test suites covering Unit, Security, Integration, and End-to-End workflows:

```bash
# Run all automated test suites
npm test

# Run individual test categories
node --test tests/unit/*.test.js
node --test tests/security/*.test.js
node --test tests/integration/*.test.js
node --test tests/end-to-end/*.test.js
```

### Verified Test Suites:
1. **Unit Tests (12/12 Passed)**:
   - Password hashing and bcrypt verification.
   - JWT signing, expiration, and role decoding.
   - Python AST syntax checking (accurate `SyntaxError` reporting).
   - Python code execution with stdin parameters.
   - Runtime error handling (`ZeroDivisionError`).
   - Timeout enforcement on infinite loops (`Time Limit Exceeded`).
   - CSV Formula Injection defense (neutralizing `=`, `+`, `-`, `@`, `\t`).
   - Line-by-line output comparison (normalizing Windows `\r\n` vs Unix `\n`).
   - Score proportional calculation.
2. **Security Tests (4/4 Passed)**:
   - RBAC: Blocks unauthorized student role from faculty/admin endpoints.
   - RBAC: Blocks faculty role from administrator management routes.
   - RBAC: Authorizes administrative privileges for admin role.
   - Privacy: Denies unauthenticated requests without tokens.
3. **Integration Tests (1/1 Passed)**:
   - API Gateway routing and service health verification.
4. **End-to-End Tests (3/3 Passed)**:
   - Complete Python problem evaluation flow.
   - Anti-cheating violation increment and auto-termination threshold logic.
   - Gradebook generation and CSV sanitization.

---

## 8. Google Cloud Platform (GCP) Deployment

CloudCode Arena is designed so the same exact codebase can be tested locally using `compose.yaml` and deployed to GCP using modular Docker Compose files:

### Individual Per-Service Compose Files (`docker/`)
For granular scaling or running 1 service per Compute Engine VM or Cloud Run:
- **MongoDB**: `docker/compose-mongodb.yaml`
- **Auth Service**: `docker/compose-auth-service.yaml`
- **Assessment Service**: `docker/compose-assessment-service.yaml`
- **Submission Service**: `docker/compose-submission-service.yaml`
- **Reporting Service**: `docker/compose-reporting-service.yaml`
- **Code Runner**: `docker/compose-code-runner.yaml`
- **API Gateway**: `docker/compose-api-gateway.yaml`
- **Frontend**: `docker/compose-frontend.yaml`

### Tier-Grouped & All-in-One Compose Files
- **Grouped Backend Services**: `docker/compose-backend.yaml`
- **Grouped Ingress & Frontend**: `docker/compose.frontend-gateway.yaml`
- **All-in-One Production Compose**: `docker/compose.production.yaml`

### Deployment Steps Summary:
1. **Configure Environment**: Copy `.env.gcp.example` to `.env` on your target VM instances.
2. **Build & Push Images**:
   - On Windows: `.\scripts\build-and-push-gcp.ps1`
   - On Linux/macOS: `./scripts/build-and-push-gcp.sh`
3. **Launch Containers**: Run `docker compose -f <service-compose-file>.yaml up -d` on each VM.
4. **Detailed Guide**: Follow the step-by-step instructions in [`docs/google-cloud-deployment.md`](docs/google-cloud-deployment.md) covering Artifact Registry setup, VPC firewall rules, Let's Encrypt SSL, and diagnostic verification.

---

## 9. Security & Fair Use Disclaimer

- **Hidden Test Case Privacy**: Hidden test case inputs and expected outputs are never returned to student browsers.
- **Fair Anti-Cheating Telemetry**: The browser monitoring system tracks visibility changes, window blurs, fullscreen exits, and clipboard activity to assist faculty evaluation. It does not claim 100% prevention of external devices.
- **Clipboard Integrity**: Normal copy, cut, paste, and right-click functionality inside the Monaco Code Editor remain fully operational.

---

## 10. License

CloudCode Arena is licensed under the MIT License.
