#!/bin/bash

PROJECT_NAME="LinkUp World"
APP_URL_LOCAL="http://localhost:3000/login"
APP_URL_PUBLIC="http://20.244.48.171/login"
CONTAINER_NAME="linkup-world-app"
EMAIL_TO="piyushprasad697@gmail.com"
STATE_FILE="/tmp/linkup-world-downtime-state.txt"

HOSTNAME=$(hostname)
DATE=$(date)

LOCAL_STATUS="DOWN"
PUBLIC_STATUS="DOWN"
NGINX_STATUS="DOWN"
DOCKER_STATUS="DOWN"

if curl -fsI "$APP_URL_LOCAL" >/dev/null 2>&1; then
    LOCAL_STATUS="UP"
fi

if curl -fsI "$APP_URL_PUBLIC" >/dev/null 2>&1; then
    PUBLIC_STATUS="UP"
fi

if systemctl is-active --quiet nginx; then
    NGINX_STATUS="UP"
fi

if sudo docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    DOCKER_STATUS="UP"
fi

CURRENT_STATE="UP"

if [ "$LOCAL_STATUS" = "DOWN" ] || [ "$PUBLIC_STATUS" = "DOWN" ] || [ "$NGINX_STATUS" = "DOWN" ] || [ "$DOCKER_STATUS" = "DOWN" ]; then
    CURRENT_STATE="DOWN"
fi

PREVIOUS_STATE="UNKNOWN"

if [ -f "$STATE_FILE" ]; then
    PREVIOUS_STATE=$(cat "$STATE_FILE")
fi

if [ "$CURRENT_STATE" = "DOWN" ] && [ "$PREVIOUS_STATE" != "DOWN" ]; then
    SUBJECT="URGENT: LinkUp World Downtime Alert"

    BODY="Downtime detected for LinkUp World.

Project: $PROJECT_NAME
Server: Azure Ubuntu VM
Hostname: $HOSTNAME
Public URL: $APP_URL_PUBLIC
Time: $DATE

Health Check:
Local App: $LOCAL_STATUS
Public URL: $PUBLIC_STATUS
Nginx: $NGINX_STATUS
Docker Container: $DOCKER_STATUS

Recommended action:
1. SSH into Azure server.
2. Run: sudo docker ps
3. Run: sudo docker logs linkup-world-app --tail 100
4. Run: sudo systemctl status nginx --no-pager
5. Run: sudo docker compose up -d --build

This alert will not repeat until the service recovers and goes down again."

    echo "$BODY" | mail -s "$SUBJECT" "$EMAIL_TO"
fi

if [ "$CURRENT_STATE" = "UP" ] && [ "$PREVIOUS_STATE" = "DOWN" ]; then
    SUBJECT="RECOVERY: LinkUp World Service Restored"

    BODY="LinkUp World service has recovered.

Project: $PROJECT_NAME
Server: Azure Ubuntu VM
Hostname: $HOSTNAME
Public URL: $APP_URL_PUBLIC
Time: $DATE

Health Check:
Local App: $LOCAL_STATUS
Public URL: $PUBLIC_STATUS
Nginx: $NGINX_STATUS
Docker Container: $DOCKER_STATUS

Status: RECOVERED"

    echo "$BODY" | mail -s "$SUBJECT" "$EMAIL_TO"
fi

echo "$CURRENT_STATE" > "$STATE_FILE"
