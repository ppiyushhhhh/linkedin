#!/bin/bash

set -e

PROJECT_DIR="/home/azureuser/linkedin"
BACKUP_DIR="/home/azureuser/backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_NAME="linkup-world-full-backup-$DATE"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
ARCHIVE_PATH="$BACKUP_DIR/$BACKUP_NAME.tar.gz"

EMAIL_TO="piyushprasad697@gmail.com"
HOSTNAME=$(hostname)
PUBLIC_IP="20.244.48.171"

mkdir -p "$BACKUP_PATH"
mkdir -p "$BACKUP_DIR"

STATUS="SUCCESS"
ERROR_MESSAGE=""

{
    echo "Starting full server backup..."
    echo "Date: $(date)"
    echo "Server: $HOSTNAME"
    echo "Project: LinkUp World"
    echo ""

    mkdir -p "$BACKUP_PATH/project"
    mkdir -p "$BACKUP_PATH/system"
    mkdir -p "$BACKUP_PATH/docker"
    mkdir -p "$BACKUP_PATH/nginx"
    mkdir -p "$BACKUP_PATH/logs"

    echo "Backing up project files..."
    rsync -av \
      --exclude node_modules \
      --exclude dist \
      --exclude .git \
      --exclude reports \
      --exclude "*.log" \
      "$PROJECT_DIR/" "$BACKUP_PATH/project/"

    echo "Backing up Nginx config..."
    sudo cp /etc/nginx/sites-available/linkedin "$BACKUP_PATH/nginx/linkedin-nginx.conf" 2>/dev/null || true

    echo "Collecting Docker info..."
    sudo docker ps -a > "$BACKUP_PATH/docker/docker-containers.txt" 2>&1 || true
    sudo docker images > "$BACKUP_PATH/docker/docker-images.txt" 2>&1 || true
    sudo docker compose -f "$PROJECT_DIR/docker-compose.yml" ps > "$BACKUP_PATH/docker/docker-compose-status.txt" 2>&1 || true
    sudo docker logs linkup-world-app --tail 200 > "$BACKUP_PATH/logs/app-container.log" 2>&1 || true

    echo "Collecting system info..."
    uptime > "$BACKUP_PATH/system/uptime.txt" 2>&1 || true
    df -h > "$BACKUP_PATH/system/disk-usage.txt" 2>&1 || true
    free -h > "$BACKUP_PATH/system/memory-usage.txt" 2>&1 || true
    crontab -l > "$BACKUP_PATH/system/cron-jobs.txt" 2>&1 || true
    systemctl status nginx --no-pager > "$BACKUP_PATH/system/nginx-status.txt" 2>&1 || true

    echo "Creating compressed archive..."
    tar -czf "$ARCHIVE_PATH" -C "$BACKUP_DIR" "$BACKUP_NAME"

    echo "Deleting temporary backup folder..."
    rm -rf "$BACKUP_PATH"

    echo "Deleting backups older than 7 days..."
    find "$BACKUP_DIR" -name "linkup-world-full-backup-*.tar.gz" -type f -mtime +7 -delete

} || {
    STATUS="FAILED"
    ERROR_MESSAGE="Backup failed on $HOSTNAME at $(date)"
}

if [ "$STATUS" = "SUCCESS" ]; then
    SUBJECT="SUCCESS: LinkUp World Daily Full Server Backup - $DATE"
    BODY="Daily full server backup completed successfully.

Project: LinkUp World
Server: Azure Ubuntu VM
Hostname: $HOSTNAME
Public IP: http://$PUBLIC_IP
Backup File: $ARCHIVE_PATH
Retention: Backups older than 7 days are automatically deleted.

This backup includes:
- Project source and config files
- Dockerfile and docker-compose.yml
- Automation scripts
- Nginx config
- Docker container status
- Docker image status
- Recent app logs
- System uptime
- Disk usage
- Memory usage
- Cron jobs

Status: SUCCESS
Generated at: $(date)
"

    echo "$BODY" | mail -s "$SUBJECT" -A "$ARCHIVE_PATH" "$EMAIL_TO"
else
    SUBJECT="FAILED: LinkUp World Daily Full Server Backup - $DATE"
    BODY="Daily full server backup failed.

Project: LinkUp World
Server: Azure Ubuntu VM
Hostname: $HOSTNAME
Public IP: http://$PUBLIC_IP

Error:
$ERROR_MESSAGE

Please check the server immediately.

Generated at: $(date)
"

    echo "$BODY" | mail -s "$SUBJECT" "$EMAIL_TO"
fi
