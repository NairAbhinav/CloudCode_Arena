# CloudCode Arena — Local Development Guide

## 1. Prerequisites

Before running CloudCode Arena locally, verify that your machine has:

- **Node.js**: v18.0.0 or later (v20+ or v24+ recommended)
- **npm**: v9.0.0 or later
- **Python**: 3.10+ (for Python 3 sandbox execution)
- **Docker & Docker Compose**: Docker Desktop or Docker Engine v24+

Verify installations:
```bash
node -v
npm -v
python --version
docker compose version
```

---

## 2. Environment Setup

1. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```

2. Review `.env` defaults. The standard local development values are configured to connect services at:
   - Frontend: `http://localhost:3000`
   - API Gateway: `http://localhost:5000`
   - MongoDB: `mongodb://mongodb:27017/cloudcode_arena` (in Docker) or `mongodb://127.0.0.1:27017/cloudcode_arena` (standalone)

---

## 3. Running with Docker Compose (Recommended)

To start the complete local platform (Frontend, Gateway, 4 Backend Services, Code Runner, and MongoDB):

```bash
# Start all containers in the background
docker compose up -d --build

# Follow logs across all microservices
docker compose logs -f

# Check status of running containers
docker compose ps
```

Once started:
- **Frontend Web App**: [http://localhost:3000](http://localhost:3000)
- **API Gateway**: [http://localhost:5000/health](http://localhost:5000/health)

---

## 4. Seeding Sample Data

Populate the database with 5 standard coding problems, public & hidden test cases, a scheduled proctored assessment, and default role accounts:

```bash
# Run database seed script
npm run seed
```

### Seed Accounts Created:
- **Student**: `student@cloudcode.arena` | Password: `StudentPass123!`
- **Faculty**: `faculty@cloudcode.arena` | Password: `FacultyPass123!`
- **Admin**: `admin@cloudcode.arena` | Password: `AdminPass123!`

---

## 5. Running Standalone (Without Docker)

You can also run the microservices directly using Node and local MongoDB:

```bash
# 1. Install dependencies in workspaces
npm run bootstrap

# 2. Start all backend microservices concurrently
npm run dev:backend

# 3. In another terminal, start the React frontend
npm run dev:frontend
```

---

## 6. Running Automated Tests

Execute the complete test suite (Unit, Security, Integration, and End-to-End):

```bash
# Run all test suites
npm test

# Run individual test suites
node --test tests/unit/*.test.js
node --test tests/security/*.test.js
node --test tests/integration/*.test.js
node --test tests/end-to-end/*.test.js
```

---

## 7. Stopping and Restarting

```bash
# Stop application gracefully (preserves database data)
docker compose stop

# Restart application
docker compose start

# Tear down containers (data in mongo-data volume remains intact)
docker compose down

# WARNING: Only run this if you want to permanently erase your local database:
# docker compose down -v
```
