# CloudCode Arena — Troubleshooting Guide

## 1. Common Issues and Resolutions

### Issue: "Docker daemon is not running" or "failed to connect to docker API"
- **Cause**: Docker Desktop or Docker Engine has not been started.
- **Fix**: Launch Docker Desktop from the Start Menu / Applications folder and wait for the status indicator to turn green before running `docker compose up`.

### Issue: "Port 5000 / 3000 / 27017 is already in use"
- **Cause**: Another local service or previous container instance is occupying the port.
- **Fix**:
  - Windows PowerShell:
    ```powershell
    Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
    ```
  - Linux/macOS:
    ```bash
    sudo lsof -i :5000 | awk 'NR>1 {print $2}' | xargs kill -9
    ```

### Issue: "MongoServerError: connect ECONNREFUSED"
- **Cause**: MongoDB container is still starting or failed health checks.
- **Fix**: Check MongoDB logs:
  ```bash
  docker compose logs mongodb
  ```
  Verify that the MongoDB data volume is accessible.

### Issue: Student code runs but returns "Time Limit Exceeded"
- **Cause**: Submitted code contains an infinite loop or unoptimized recursion exceeding the default 5000ms timeout.
- **Fix**: Review time complexity in algorithm. If a problem genuinely requires higher execution time, adjust `CODE_EXEC_TIMEOUT_MS` in `.env`.

### Issue: "Cannot publish: question must have at least 1 public and 1 hidden test case"
- **Cause**: Attempting to publish a question without meeting the mandatory validation rule.
- **Fix**: Open question editor and ensure both a public test case and a hidden test case have been added with non-empty expected outputs.

---

## 2. Container Restart and Logs

```bash
# View real-time logs for a specific service
docker compose logs -f api-gateway
docker compose logs -f submission-service
docker compose logs -f code-runner

# Restart a specific service without affecting others
docker compose restart submission-service

# Rebuild a single container after code changes
docker compose up -d --build frontend
```

> **WARNING**: Avoid running `docker compose down -v` as the `-v` flag deletes named volumes and will permanently erase your local MongoDB database.
