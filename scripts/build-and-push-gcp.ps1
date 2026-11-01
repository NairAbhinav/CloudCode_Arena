# ==============================================================================
# CloudCode Arena - Build & Push Docker Images to Google Artifact Registry (PowerShell)
# ==============================================================================
# Usage:
#   $env:GCP_PROJECT_ID = "your-project-id"
#   $env:GCP_REGION = "us-central1"
#   $env:GCP_ARTIFACT_REGISTRY_REPO = "cloudcode-arena-repo"
#   .\scripts\build-and-push-gcp.ps1
#
# Or push a single service:
#   .\scripts\build-and-push-gcp.ps1 -TargetService auth-service
# ==============================================================================

param (
    [string]$TargetService = "all"
)

$ErrorActionPreference = "Stop"

if (-not $env:GCP_PROJECT_ID) {
    if (Test-Path ".env.gcp") {
        Get-Content ".env.gcp" | Where-Object { $_ -match '^([^#=]+)=(.*)$' } | ForEach-Object {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($name, $value)
        }
    }
}

$ProjectId = $env:GCP_PROJECT_ID
$Region = if ($env:GCP_REGION) { $env:GCP_REGION } else { "us-central1" }
$Repo = if ($env:GCP_ARTIFACT_REGISTRY_REPO) { $env:GCP_ARTIFACT_REGISTRY_REPO } else { "cloudcode-arena-repo" }

if (-not $ProjectId) {
    Write-Error "❌ Error: GCP_PROJECT_ID environment variable is not set. Set it via `$env:GCP_PROJECT_ID = '<YOUR_GCP_PROJECT_ID>'"
    exit 1
}

$RegistryUrl = "${Region}-docker.pkg.dev/${ProjectId}/${Repo}"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " CloudCode Arena - GCP Image Build & Push (PowerShell)" -ForegroundColor Cyan
Write-Host " Target Registry: $RegistryUrl" -ForegroundColor Cyan
Write-Host " Target Service : $TargetService" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

function Build-And-Push {
    param(
        [string]$ServiceName,
        [string]$ContextDir,
        [string]$Dockerfile
    )
    $ImageTag = "${RegistryUrl}/${ServiceName}:latest"
    Write-Host "`n🚀 [$ServiceName] Building image $ImageTag..." -ForegroundColor Yellow
    docker build -f $Dockerfile -t $ImageTag $ContextDir
    if ($LASTEXITCODE -ne 0) { throw "Build failed for $ServiceName" }

    Write-Host "📤 [$ServiceName] Pushing image to Artifact Registry..." -ForegroundColor Green
    docker push $ImageTag
    if ($LASTEXITCODE -ne 0) { throw "Push failed for $ServiceName" }
    Write-Host "✅ [$ServiceName] Successfully pushed!" -ForegroundColor Green
}

# 1. Frontend
if ($TargetService -eq "all" -or $TargetService -eq "frontend") {
    Build-And-Push -ServiceName "frontend" -ContextDir "./frontend" -Dockerfile "./frontend/Dockerfile"
}

# 2. API Gateway
if ($TargetService -eq "all" -or $TargetService -eq "api-gateway") {
    Build-And-Push -ServiceName "api-gateway" -ContextDir "./api-gateway" -Dockerfile "./api-gateway/Dockerfile"
}

# 3. Auth Service
if ($TargetService -eq "all" -or $TargetService -eq "auth-service") {
    Build-And-Push -ServiceName "auth-service" -ContextDir "." -Dockerfile "services/auth-service/Dockerfile"
}

# 4. Assessment Service
if ($TargetService -eq "all" -or $TargetService -eq "assessment-service") {
    Build-And-Push -ServiceName "assessment-service" -ContextDir "." -Dockerfile "services/assessment-service/Dockerfile"
}

# 5. Submission Service
if ($TargetService -eq "all" -or $TargetService -eq "submission-service") {
    Build-And-Push -ServiceName "submission-service" -ContextDir "." -Dockerfile "services/submission-service/Dockerfile"
}

# 6. Reporting Service
if ($TargetService -eq "all" -or $TargetService -eq "reporting-service") {
    Build-And-Push -ServiceName "reporting-service" -ContextDir "." -Dockerfile "services/reporting-service/Dockerfile"
}

# 7. Code Runner
if ($TargetService -eq "all" -or $TargetService -eq "code-runner") {
    Build-And-Push -ServiceName "code-runner" -ContextDir "./code-runner" -Dockerfile "./code-runner/Dockerfile"
}

Write-Host "`n🎉 Build and Push pipeline completed successfully!" -ForegroundColor Cyan
