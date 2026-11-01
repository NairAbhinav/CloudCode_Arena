#!/usr/bin/env bash
# ==============================================================================
# CloudCode Arena - Build & Push Docker Images to Google Artifact Registry
# ==============================================================================
# Usage:
#   export GCP_PROJECT_ID="your-project-id"
#   export GCP_REGION="us-central1"
#   export GCP_ARTIFACT_REGISTRY_REPO="cloudcode-arena-repo"
#   ./scripts/build-and-push-gcp.sh [service-name]
#
# Examples:
#   ./scripts/build-and-push-gcp.sh          # Builds and pushes ALL services
#   ./scripts/build-and-push-gcp.sh auth-service   # Builds and pushes only auth-service
# ==============================================================================

set -euo pipefail

# Load environment defaults if .env.gcp exists
if [ -f ".env.gcp" ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env.gcp | xargs)
elif [ -f ".env" ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
fi

GCP_PROJECT_ID="${GCP_PROJECT_ID:-}"
GCP_REGION="${GCP_REGION:-us-central1}"
GCP_ARTIFACT_REGISTRY_REPO="${GCP_ARTIFACT_REGISTRY_REPO:-cloudcode-arena-repo}"

if [ -z "$GCP_PROJECT_ID" ]; then
  echo "❌ Error: GCP_PROJECT_ID is not set. Please set it or create a .env.gcp file."
  echo "   export GCP_PROJECT_ID=\"<YOUR_GCP_PROJECT_ID>\""
  exit 1
fi

REGISTRY_URL="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${GCP_ARTIFACT_REGISTRY_REPO}"
TARGET_SERVICE="${1:-all}"

echo "================================================================================"
echo " CloudCode Arena - GCP Image Build & Push"
echo " Target Registry: ${REGISTRY_URL}"
echo " Service Target : ${TARGET_SERVICE}"
echo "================================================================================"

build_and_push() {
  local service_name="$1"
  local context_dir="$2"
  local dockerfile="$3"
  local image_tag="${REGISTRY_URL}/${service_name}:latest"

  echo ""
  echo "🚀 [${service_name}] Building image ${image_tag}..."
  docker build -f "${dockerfile}" -t "${image_tag}" "${context_dir}"

  echo "📤 [${service_name}] Pushing image to Artifact Registry..."
  docker push "${image_tag}"
  echo "✅ [${service_name}] Successfully pushed!"
}

# 1. Frontend
if [ "$TARGET_SERVICE" = "all" ] || [ "$TARGET_SERVICE" = "frontend" ]; then
  build_and_push "frontend" "./frontend" "./frontend/Dockerfile"
fi

# 2. API Gateway
if [ "$TARGET_SERVICE" = "all" ] || [ "$TARGET_SERVICE" = "api-gateway" ]; then
  build_and_push "api-gateway" "./api-gateway" "./api-gateway/Dockerfile"
fi

# 3. Auth Service
if [ "$TARGET_SERVICE" = "all" ] || [ "$TARGET_SERVICE" = "auth-service" ]; then
  build_and_push "auth-service" "." "services/auth-service/Dockerfile"
fi

# 4. Assessment Service
if [ "$TARGET_SERVICE" = "all" ] || [ "$TARGET_SERVICE" = "assessment-service" ]; then
  build_and_push "assessment-service" "." "services/assessment-service/Dockerfile"
fi

# 5. Submission Service
if [ "$TARGET_SERVICE" = "all" ] || [ "$TARGET_SERVICE" = "submission-service" ]; then
  build_and_push "submission-service" "." "services/submission-service/Dockerfile"
fi

# 6. Reporting Service
if [ "$TARGET_SERVICE" = "all" ] || [ "$TARGET_SERVICE" = "reporting-service" ]; then
  build_and_push "reporting-service" "." "services/reporting-service/Dockerfile"
fi

# 7. Code Runner
if [ "$TARGET_SERVICE" = "all" ] || [ "$TARGET_SERVICE" = "code-runner" ]; then
  build_and_push "code-runner" "./code-runner" "./code-runner/Dockerfile"
fi

echo ""
echo "🎉 Build and Push pipeline completed successfully!"
