#!/bin/bash

APP_NAME="LinkUp World"
EMAIL_TO="piyushprasad697@gmail.com"
EMAIL_FROM="piyushprasad8122@gmail.com"
DATE=$(date +"%Y-%m-%d")

PDF_FILE=$(python3 /home/azureuser/linkedin/scripts/generate-daily-pdf-report.py)

if [ ! -f "$PDF_FILE" ]; then
  echo "PDF report generation failed. File not found: $PDF_FILE" | mail -s "URGENT: Daily PDF Report Failed - $APP_NAME - $DATE" "$EMAIL_TO"
  exit 1
fi

SUBJECT="Daily Server Health PDF Report - $APP_NAME - $DATE"

BODY_FILE="/tmp/linkup-report-email-body-$DATE.txt"

cat > "$BODY_FILE" <<EOF
Hello,

Please find attached the daily server health PDF report for $APP_NAME.

Report Date: $DATE
Environment: Azure Ubuntu VM
Public URL: http://20.244.48.171

This report includes:
- Application health status
- Docker container status
- Nginx reverse proxy status
- CPU, memory, disk, and uptime summary
- Latest backup status
- Recent application and Nginx logs
- Action required summary

Regards,
Azure Server Automation
EOF

mail -s "$SUBJECT" -A "$PDF_FILE" "$EMAIL_TO" < "$BODY_FILE"
