#!/bin/bash

APP_NAME="LinkUp World"
APP_URL="http://localhost:3000"
PUBLIC_URL="http://20.244.48.171"
EMAIL_TO="piyushprasad697@gmail.com"

REPORT_DATE=$(date +"%Y-%m-%d")
REPORT_FILE="/tmp/linkup-server-report-$REPORT_DATE.txt"

LOCAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL")
PUBLIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PUBLIC_URL")
NGINX_STATUS=$(systemctl is-active nginx)
DOCKER_STATUS=$(docker inspect --format='{{.State.Status}}' linkup-world-app 2>/dev/null || echo "not-found")
DOCKER_HEALTH=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' linkup-world-app 2>/dev/null || echo "unknown")

if [ "$LOCAL_STATUS" = "200" ] && [ "$PUBLIC_STATUS" = "200" ] && [ "$NGINX_STATUS" = "active" ] && [ "$DOCKER_STATUS" = "running" ]; then
  OVERALL_STATUS="HEALTHY"
else
  OVERALL_STATUS="ISSUE DETECTED"
fi

cat > "$REPORT_FILE" <<EOF
DAILY SERVER HEALTH REPORT

Application: $APP_NAME
Environment: Azure Ubuntu VM
Public URL: $PUBLIC_URL
Report Date: $REPORT_DATE
Generated At: $(date)
Server Hostname: $(hostname)

============================================================
1. EXECUTIVE SUMMARY
============================================================

Overall Status: $OVERALL_STATUS

This daily report contains the current status of the LinkUp World deployment, including application health, Docker container status, Nginx reverse proxy status, CPU, memory, disk usage, and recent logs.

============================================================
2. APPLICATION HEALTH
============================================================

Local URL: $APP_URL
Public URL: $PUBLIC_URL

Local HTTP Status: $LOCAL_STATUS
Public HTTP Status: $PUBLIC_STATUS

============================================================
3. DOCKER STATUS
============================================================

Container Name: linkup-world-app
Docker Status: $DOCKER_STATUS
Container Health: $DOCKER_HEALTH

Docker Containers:

$(docker ps -a 2>&1)

============================================================
4. NGINX STATUS
============================================================

Nginx Service Status: $NGINX_STATUS

Nginx Config Test:

$(sudo nginx -t 2>&1)

============================================================
5. SERVER RESOURCE USAGE
============================================================

Uptime:
$(uptime)

Memory:
$(free -h)

Disk:
$(df -h)

============================================================
6. RECENT APPLICATION LOGS
============================================================

$(docker logs linkup-world-app --tail 40 2>&1)

============================================================
7. RECENT NGINX ERROR LOGS
============================================================

$(sudo tail -40 /var/log/nginx/error.log 2>&1)

============================================================
8. CONCLUSION
============================================================

Daily server health report completed at $(date).
EOF

mail -s "Daily Server Health Report - $APP_NAME - $REPORT_DATE - $OVERALL_STATUS" "$EMAIL_TO" < "$REPORT_FILE"
