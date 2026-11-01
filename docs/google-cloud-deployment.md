# Google Cloud Platform (GCP) Deployment Guide

> **IMPORTANT**: This guide is intended for platform administrators deploying CloudCode Arena to Google Cloud Platform. The codebase remains identical across environments. You can run and test everything locally using the root `compose.yaml`, while using the dedicated individual or grouped compose files in `docker/` for GCP deployment.

---

## 1. Deployment Architecture Options

CloudCode Arena provides modular Docker Compose configurations to accommodate any deployment topology:

### Model A: Granular Per-Service Deployment (Recommended for Large Scale / Production)
Each service runs on its own dedicated Compute Engine VM or container instance with its own compose file:
1. `cca-vm-mongodb`: Dedicated MongoDB 7.0 database (`docker/compose-mongodb.yaml`)
2. `cca-vm-auth`: Auth & User Service (`docker/compose-auth-service.yaml`)
3. `cca-vm-assessment`: Assessment & Question Service (`docker/compose-assessment-service.yaml`)
4. `cca-vm-submission`: Submission & Grading Service (`docker/compose-submission-service.yaml`)
5. `cca-vm-reporting`: Reporting, Analytics & Anti-Cheating Service (`docker/compose-reporting-service.yaml`)
6. `cca-vm-runner`: Dedicated Isolated Sandbox Runner (`docker/compose-code-runner.yaml`)
7. `cca-vm-gateway`: Public API Gateway & Reverse Proxy (`docker/compose-api-gateway.yaml`)
8. `cca-vm-frontend`: Web Client Application (`docker/compose-frontend.yaml`)

### Model B: Tier-Grouped Multi-VM Architecture (Balanced Cost & Isolation)
Workloads grouped across 4 VMs:
1. `cca-vm-database`: MongoDB (`docker/compose-database.yaml`)
2. `cca-vm-runner`: Dedicated Hardened Code Runner (`docker/compose-runner.yaml`)
3. `cca-vm-backend`: Core Microservices (`docker/compose-backend.yaml`)
4. `cca-vm-ingress`: Ingress, API Gateway & Frontend (`docker/compose.frontend-gateway.yaml`)

### Model C: Single All-in-One Production VM (Staging / Cost-Effective)
Run the entire production stack on a single `e2-standard-4` VM using `docker/compose.production.yaml`.

---

## 2. Inventory of Docker Compose Files

| File | Purpose | Target Environment / VM |
| :--- | :--- | :--- |
| `compose.yaml` | **Complete Local Testing** - builds all 8 services from local source code | Local developer machine |
| `docker/compose-mongodb.yaml` | MongoDB database service | `cca-vm-database` |
| `docker/compose-auth-service.yaml` | Auth & User Management microservice (Port 5001) | `cca-vm-auth` (Model A) |
| `docker/compose-assessment-service.yaml` | Question & Assessment microservice (Port 5002) | `cca-vm-assessment` (Model A) |
| `docker/compose-submission-service.yaml` | Submission & Judging microservice (Port 5003) | `cca-vm-submission` (Model A) |
| `docker/compose-reporting-service.yaml` | Reporting & Anti-Cheating microservice (Port 5004) | `cca-vm-reporting` (Model A) |
| `docker/compose-code-runner.yaml` | Dedicated Sandbox Runner microservice (Port 5005) | `cca-vm-runner` |
| `docker/compose-api-gateway.yaml` | API Gateway & Reverse Proxy (Port 5000) | `cca-vm-gateway` (Model A) |
| `docker/compose-frontend.yaml` | React Vite Frontend (Port 80/443) | `cca-vm-frontend` (Model A) |
| `docker/compose-backend.yaml` | Grouped 4 Backend Services (Auth, Assessment, Submission, Reporting) | `cca-vm-backend` (Model B) |
| `docker/compose.frontend-gateway.yaml` | Grouped Frontend & API Gateway | `cca-vm-ingress` (Model B) |
| `docker/compose.production.yaml` | All 8 services in production mode | All-in-One VM (Model C) |

---

## 3. Google Artifact Registry Setup

Create a private Docker registry to store your container images:

```bash
# 1. Configure variables
export PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
export REGION="us-central1"
export REPO_NAME="cloudcode-arena-repo"

# 2. Select project
gcloud config set project $PROJECT_ID

# 3. Enable required GCP services
gcloud services enable \
  artifactregistry.googleapis.com \
  compute.googleapis.com \
  secretmanager.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com

# 4. Create Docker repository
gcloud artifacts repositories create $REPO_NAME \
  --repository-format=docker \
  --location=$REGION \
  --description="Docker repository for CloudCode Arena containers"

# 5. Authenticate Docker locally
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

---

## 4. Building and Pushing Images to Artifact Registry

You can build and push all services with one command using the provided helper scripts:

### Using PowerShell (Windows):
```powershell
$env:GCP_PROJECT_ID = "<YOUR_GCP_PROJECT_ID>"
$env:GCP_REGION = "us-central1"
$env:GCP_ARTIFACT_REGISTRY_REPO = "cloudcode-arena-repo"

# Build & push ALL 7 service images:
.\scripts\build-and-push-gcp.ps1

# Or push a single service image:
.\scripts\build-and-push-gcp.ps1 -TargetService auth-service
```

### Using Bash (Linux / macOS):
```bash
export GCP_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
export GCP_REGION="us-central1"
export GCP_ARTIFACT_REGISTRY_REPO="cloudcode-arena-repo"

# Build & push ALL 7 service images:
chmod +x ./scripts/build-and-push-gcp.sh
./scripts/build-and-push-gcp.sh

# Or push a single service image:
./scripts/build-and-push-gcp.sh auth-service
```

### Manual Docker Build & Push Commands:
```bash
export REGISTRY_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

# 1. Frontend
docker build -t ${REGISTRY_URL}/frontend:latest ./frontend
docker push ${REGISTRY_URL}/frontend:latest

# 2. API Gateway
docker build -t ${REGISTRY_URL}/api-gateway:latest ./api-gateway
docker push ${REGISTRY_URL}/api-gateway:latest

# 3. Auth Service
docker build -f services/auth-service/Dockerfile -t ${REGISTRY_URL}/auth-service:latest .
docker push ${REGISTRY_URL}/auth-service:latest

# 4. Assessment Service
docker build -f services/assessment-service/Dockerfile -t ${REGISTRY_URL}/assessment-service:latest .
docker push ${REGISTRY_URL}/assessment-service:latest

# 5. Submission Service
docker build -f services/submission-service/Dockerfile -t ${REGISTRY_URL}/submission-service:latest .
docker push ${REGISTRY_URL}/submission-service:latest

# 6. Reporting Service
docker build -f services/reporting-service/Dockerfile -t ${REGISTRY_URL}/reporting-service:latest .
docker push ${REGISTRY_URL}/reporting-service:latest

# 7. Code Runner
docker build -t ${REGISTRY_URL}/code-runner:latest ./code-runner
docker push ${REGISTRY_URL}/code-runner:latest
```

---

## 5. Provisioning Compute Engine VMs & Docker

### Recommended Machine Types
| Service / VM | Machine Type | Disk | Suggested Tags |
| :--- | :--- | :--- | :--- |
| `cca-vm-frontend` | `e2-micro` or `e2-small` | 20 GB Balanced | `http-server`, `https-server`, `cca-frontend` |
| `cca-vm-gateway` | `e2-small` or `e2-medium` | 25 GB Balanced | `cca-gateway` |
| `cca-vm-auth` | `e2-small` | 20 GB Balanced | `cca-internal`, `cca-auth` |
| `cca-vm-assessment` | `e2-small` | 20 GB Balanced | `cca-internal`, `cca-assessment` |
| `cca-vm-submission` | `e2-medium` | 25 GB Balanced | `cca-internal`, `cca-submission` |
| `cca-vm-reporting` | `e2-small` | 20 GB Balanced | `cca-internal`, `cca-reporting` |
| `cca-vm-runner` | `e2-standard-4` (4 vCPU, 16GB) | 50 GB SSD | `cca-internal`, `cca-runner` |
| `cca-vm-database` | `e2-standard-2` (2 vCPU, 8GB) | 100 GB SSD | `cca-internal`, `cca-db` |

### Docker Setup on Every VM
Run this bootstrap script once on each newly created Ubuntu VM:
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

---

## 6. VPC Network & Firewall Rules

Ensure microservices communicate privately across internal VPC IP addresses while only Frontend and Gateway accept necessary external traffic:

```bash
# 1. Allow public web traffic to Frontend (Ports 80/443)
gcloud compute firewall-rules create allow-cca-public-web \
  --direction=INGRESS --priority=1000 --network=default --action=ALLOW \
  --rules=tcp:80,tcp:443 \
  --target-tags=http-server,https-server

# 2. Allow public/load balancer traffic to API Gateway (Port 5000)
gcloud compute firewall-rules create allow-cca-gateway \
  --direction=INGRESS --priority=1000 --network=default --action=ALLOW \
  --rules=tcp:5000 \
  --target-tags=cca-gateway

# 3. Allow API Gateway to access all backend microservices
gcloud compute firewall-rules create allow-gateway-to-backend \
  --direction=INGRESS --priority=1000 --network=default --action=ALLOW \
  --rules=tcp:5001,tcp:5002,tcp:5003,tcp:5004 \
  --source-tags=cca-gateway \
  --target-tags=cca-internal

# 4. Allow Submission Service to communicate with Code Runner (Port 5005)
gcloud compute firewall-rules create allow-submission-to-runner \
  --direction=INGRESS --priority=1000 --network=default --action=ALLOW \
  --rules=tcp:5005 \
  --source-tags=cca-internal,cca-submission \
  --target-tags=cca-runner

# 5. Allow backend microservices to access MongoDB (Port 27017)
gcloud compute firewall-rules create allow-backend-to-mongodb \
  --direction=INGRESS --priority=1000 --network=default --action=ALLOW \
  --rules=tcp:27017 \
  --source-tags=cca-internal,cca-auth,cca-assessment,cca-submission,cca-reporting \
  --target-tags=cca-db
```

---

## 7. Launching Services with Individual Compose Files

Copy `.env.gcp.example` as `.env` on each VM and fill in:
- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GCP_ARTIFACT_REGISTRY_REPO`
- `JWT_SECRET`
- The respective internal IP addresses.

Authenticate the VM's Docker with GCP Artifact Registry:
```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### 1. Database VM (`cca-vm-database`):
```bash
# Transfer docker/compose-mongodb.yaml to the VM
docker compose -f compose-mongodb.yaml up -d
```

### 2. Code Runner VM (`cca-vm-runner`):
```bash
# Transfer docker/compose-code-runner.yaml to the VM
docker compose -f compose-code-runner.yaml up -d
```

### 3. Auth Service VM (`cca-vm-auth`):
```bash
export INTERNAL_DB_IP="<INTERNAL_IP_OF_DATABASE_VM>"
export JWT_SECRET="<YOUR_PRODUCTION_JWT_SECRET>"
docker compose -f compose-auth-service.yaml up -d
```

### 4. Assessment Service VM (`cca-vm-assessment`):
```bash
export INTERNAL_DB_IP="<INTERNAL_IP_OF_DATABASE_VM>"
export JWT_SECRET="<YOUR_PRODUCTION_JWT_SECRET>"
docker compose -f compose-assessment-service.yaml up -d
```

### 5. Submission Service VM (`cca-vm-submission`):
```bash
export INTERNAL_DB_IP="<INTERNAL_IP_OF_DATABASE_VM>"
export INTERNAL_RUNNER_IP="<INTERNAL_IP_OF_RUNNER_VM>"
export JWT_SECRET="<YOUR_PRODUCTION_JWT_SECRET>"
docker compose -f compose-submission-service.yaml up -d
```

### 6. Reporting Service VM (`cca-vm-reporting`):
```bash
export INTERNAL_DB_IP="<INTERNAL_IP_OF_DATABASE_VM>"
export JWT_SECRET="<YOUR_PRODUCTION_JWT_SECRET>"
docker compose -f compose-reporting-service.yaml up -d
```

### 7. API Gateway VM (`cca-vm-gateway`):
```bash
export INTERNAL_AUTH_IP="<INTERNAL_IP_OF_AUTH_VM>"
export INTERNAL_ASSESSMENT_IP="<INTERNAL_IP_OF_ASSESSMENT_VM>"
export INTERNAL_SUBMISSION_IP="<INTERNAL_IP_OF_SUBMISSION_VM>"
export INTERNAL_REPORTING_IP="<INTERNAL_IP_OF_REPORTING_VM>"
export CORS_ORIGINS="https://<YOUR_DOMAIN>.com"
docker compose -f compose-api-gateway.yaml up -d
```

### 8. Frontend VM (`cca-vm-frontend`):
```bash
export PUBLIC_API_URL="https://api.<YOUR_DOMAIN>.com"
docker compose -f compose-frontend.yaml up -d
```

---

## 8. SSL & Custom Domain Setup (Certbot & Nginx)

Install Nginx and Let's Encrypt Certbot to handle TLS termination on your public ingress points:

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL Certificate
sudo certbot --nginx -d <YOUR_DOMAIN>.com -d api.<YOUR_DOMAIN>.com
```

Sample Nginx Reverse Proxy snippet:
```nginx
server {
    server_name api.<YOUR_DOMAIN>.com;
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 9. Verification & Health Diagnostic Checks

Once all containers are running, test each service endpoint:

| Endpoint | Test Command | Expected Output |
| :--- | :--- | :--- |
| **API Gateway** | `curl http://localhost:5000/health` | `{"status":"healthy","uptime":...}` |
| **Auth Service** | `curl http://localhost:5001/health` | `{"status":"ok","service":"auth-service"}` |
| **Assessment Service** | `curl http://localhost:5002/health` | `{"status":"ok","service":"assessment-service"}` |
| **Submission Service** | `curl http://localhost:5003/health` | `{"status":"ok","service":"submission-service"}` |
| **Reporting Service** | `curl http://localhost:5004/health` | `{"status":"ok","service":"reporting-service"}` |
| **Code Runner** | `curl http://localhost:5005/health` | `{"status":"ok","service":"code-runner"}` |
| **Frontend** | `curl -I http://localhost:80` | `HTTP/1.1 200 OK` |
| **MongoDB** | `docker exec cca-mongodb mongosh --eval "db.adminCommand('ping')"` | `{ ok: 1 }` |

---

## 10. Automated Seeding in Production

After provisioning the database and auth service, create the initial administrative user and seed problem bank:

```bash
# Call the admin bootstrap endpoint (if BOOTSTRAP_ADMIN_KEY was set):
curl -X POST http://<API_GATEWAY_OR_AUTH_HOST>:5001/api/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{
    "bootstrapKey": "<YOUR_BOOTSTRAP_ADMIN_KEY>",
    "name": "Platform Administrator",
    "email": "admin@yourdomain.com",
    "password": "<STRONG_ADMIN_PASSWORD>"
  }'
```
