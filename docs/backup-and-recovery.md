# CloudCode Arena — Database Backup and Disaster Recovery

## 1. Overview

CloudCode Arena stores all user accounts, question libraries, assessment schedules, attempts, submissions, and audit trails in a single MongoDB database named `cloudcode_arena`.

---

## 2. Creating a Database Backup

### In Docker Compose Environment:
```bash
# 1. Create a timestamped backup directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p ./backups/${TIMESTAMP}

# 2. Execute mongodump inside the running MongoDB container
docker exec cca-mongodb mongodump --db=cloudcode_arena --archive=/data/db/backup_${TIMESTAMP}.archive --gzip

# 3. Copy archive to host machine
docker cp cca-mongodb:/data/db/backup_${TIMESTAMP}.archive ./backups/${TIMESTAMP}/cloudcode_arena.archive

# 4. Cleanup ephemeral archive in container
docker exec cca-mongodb rm /data/db/backup_${TIMESTAMP}.archive
```

---

## 3. Restoring from a Backup

```bash
# 1. Copy backup archive into the MongoDB container
docker cp ./backups/<BACKUP_FOLDER>/cloudcode_arena.archive cca-mongodb:/data/db/restore.archive

# 2. Execute mongorestore with drop flag (drops existing collection state before restore)
docker exec cca-mongodb mongorestore --archive=/data/db/restore.archive --gzip --drop

# 3. Clean up container restore archive
docker exec cca-mongodb rm /data/db/restore.archive
```

---

## 4. Verifying Database Persistence Across Restarts

To verify that MongoDB data survives container restarts:

1. Create a user or seed problems: `npm run seed`
2. Stop and remove containers without volume flag:
   ```bash
   docker compose down
   ```
3. Start containers again:
   ```bash
   docker compose up -d
   ```
4. Check that data is intact by logging in or running tests: `npm test`
