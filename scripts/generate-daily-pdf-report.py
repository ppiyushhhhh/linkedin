#!/usr/bin/env python3

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    PageBreak,
)
from datetime import datetime
import os
import subprocess

APP_NAME = "LinkUp World"
COMPANY_NAME = "LinkUp World Cloud Operations"
ENVIRONMENT = "Azure Ubuntu VM"
PUBLIC_URL = "http://20.244.48.171"
LOCAL_URL = "http://localhost:3000"

BASE_DIR = "/home/azureuser/linkedin"
LOGO_PATH = f"{BASE_DIR}/assets/company-logo.jpg"
REPORT_DIR = f"{BASE_DIR}/reports"
os.makedirs(REPORT_DIR, exist_ok=True)

REPORT_DATE = datetime.now().strftime("%Y-%m-%d")
REPORT_TIME = datetime.now().strftime("%H:%M:%S")
GENERATED_AT = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
REPORT_FILE = f"{REPORT_DIR}/linkup-world-corporate-daily-report-{REPORT_DATE}.pdf"

NAVY = colors.HexColor("#0F172A")
BLUE = colors.HexColor("#0A66C2")
LIGHT_BLUE = colors.HexColor("#EAF3FF")
GRAY_900 = colors.HexColor("#111827")
GRAY_700 = colors.HexColor("#374151")
GRAY_500 = colors.HexColor("#6B7280")
GRAY_300 = colors.HexColor("#D1D5DB")
GRAY_100 = colors.HexColor("#F3F4F6")
GRAY_50 = colors.HexColor("#F9FAFB")
GREEN = colors.HexColor("#16A34A")
GREEN_BG = colors.HexColor("#DCFCE7")
RED = colors.HexColor("#DC2626")
RED_BG = colors.HexColor("#FEE2E2")
AMBER = colors.HexColor("#D97706")
AMBER_BG = colors.HexColor("#FEF3C7")
WHITE = colors.white


def run_cmd(command, timeout=20):
    try:
        result = subprocess.run(
            command,
            shell=True,
            text=True,
            capture_output=True,
            timeout=timeout,
        )
        output = result.stdout.strip() or result.stderr.strip()
        return output if output else "N/A"
    except Exception as exc:
        return f"Command failed: {exc}"


def http_code(url):
    return run_cmd(f"curl -s -o /dev/null -w '%{{http_code}}' {url}")


def safe_text(value):
    if value is None:
        return "N/A"
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


hostname = run_cmd("hostname")
uptime = run_cmd("uptime -p")
cpu_load = run_cmd("uptime | awk -F'load average:' '{print $2}'")
memory = run_cmd("free -h | awk '/Mem:/ {print \"Used: \"$3\" / Total: \"$2\" / Free: \"$4}'")
disk = run_cmd("df -h / | awk 'NR==2 {print \"Used: \"$3\" / Total: \"$2\" / Available: \"$4\" / Usage: \"$5}'")

local_code = http_code(LOCAL_URL)
public_code = http_code(PUBLIC_URL)

nginx_status = run_cmd("systemctl is-active nginx")
nginx_test = run_cmd("sudo nginx -t 2>&1")
docker_status = run_cmd("docker inspect --format='{{.State.Status}}' linkup-world-app 2>/dev/null || echo not-found")
docker_health = run_cmd("docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' linkup-world-app 2>/dev/null || echo unknown")

docker_ps = run_cmd("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
recent_logs = run_cmd("docker logs linkup-world-app --tail 10 2>&1")
nginx_errors = run_cmd("sudo tail -10 /var/log/nginx/error.log 2>&1")

backup_file = run_cmd("ls -t /home/azureuser/backups/linkup-full-backup-*.tar.gz 2>/dev/null | head -1")
if backup_file and backup_file != "N/A":
    backup_size = run_cmd(f"du -h {backup_file} 2>/dev/null | awk '{{print $1}}'")
else:
    backup_size = "N/A"

local_status = "UP" if local_code in ["200", "301", "302"] else "DOWN"
public_status = "UP" if public_code in ["200", "301", "302"] else "DOWN"
docker_result = "RUNNING" if docker_status == "running" else "DOWN"
nginx_result = "ACTIVE" if nginx_status == "active" else "DOWN"
backup_result = "AVAILABLE" if backup_file and backup_file != "N/A" else "NOT FOUND"

overall = "HEALTHY"
if local_status != "UP" or public_status != "UP" or docker_result != "RUNNING" or nginx_result != "ACTIVE":
    overall = "ISSUE DETECTED"


doc = SimpleDocTemplate(
    REPORT_FILE,
    pagesize=A4,
    rightMargin=13 * mm,
    leftMargin=13 * mm,
    topMargin=10 * mm,
    bottomMargin=12 * mm,
)

styles = {
    "coverTitle": ParagraphStyle(
        "coverTitle",
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=WHITE,
        alignment=TA_LEFT,
    ),
    "coverSub": ParagraphStyle(
        "coverSub",
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#CBD5E1"),
        alignment=TA_LEFT,
    ),
    "section": ParagraphStyle(
        "section",
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=NAVY,
        spaceBefore=10,
        spaceAfter=5,
    ),
    "normal": ParagraphStyle(
        "normal",
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=GRAY_900,
    ),
    "small": ParagraphStyle(
        "small",
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=GRAY_700,
    ),
    "tiny": ParagraphStyle(
        "tiny",
        fontName="Helvetica",
        fontSize=7,
        leading=8.5,
        textColor=GRAY_500,
    ),
    "cardTitle": ParagraphStyle(
        "cardTitle",
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9,
        textColor=GRAY_500,
        alignment=TA_CENTER,
    ),
    "cardValue": ParagraphStyle(
        "cardValue",
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        textColor=GRAY_900,
        alignment=TA_CENTER,
    ),
    "badge": ParagraphStyle(
        "badge",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=WHITE,
        alignment=TA_CENTER,
    ),
}

story = []


def status_fill(value):
    value = str(value).upper()
    if value in ["HEALTHY", "UP", "ACTIVE", "RUNNING", "AVAILABLE", "HEALTHY"]:
        return GREEN
    if value in ["STARTING", "NO-HEALTHCHECK", "UNKNOWN"]:
        return AMBER
    return RED


def status_bg(value):
    value = str(value).upper()
    if value in ["HEALTHY", "UP", "ACTIVE", "RUNNING", "AVAILABLE", "HEALTHY"]:
        return GREEN_BG
    if value in ["STARTING", "NO-HEALTHCHECK", "UNKNOWN"]:
        return AMBER_BG
    return RED_BG


def logo_element(width=18 * mm, height=18 * mm):
    if os.path.exists(LOGO_PATH):
        return Image(LOGO_PATH, width=width, height=height)
    return Paragraph("LOGO", styles["normal"])


def corporate_header():
    logo_card = Table(
        [[logo_element(18 * mm, 18 * mm)]],
        colWidths=[24 * mm],
        rowHeights=[24 * mm],
    )
    logo_card.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#1E293B")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )

    title_block = [
        Paragraph("Daily Infrastructure Operations Report", styles["coverTitle"]),
        Paragraph(f"{COMPANY_NAME} | {APP_NAME}", styles["coverSub"]),
        Paragraph(f"{ENVIRONMENT} | Generated: {GENERATED_AT}", styles["coverSub"]),
    ]

    header = Table(
        [[logo_card, title_block]],
        colWidths=[30 * mm, 150 * mm],
        rowHeights=[32 * mm],
    )
    header.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), NAVY),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.append(header)
    story.append(Spacer(1, 7))


def section(title):
    story.append(Paragraph(title, styles["section"]))


def data_table(data, widths):
    table_data = []
    for row in data:
        table_data.append([Paragraph(safe_text(cell), styles["small"]) for cell in row])

    t = Table(table_data, colWidths=widths, hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GRAY_100),
                ("TEXTCOLOR", (0, 0), (-1, 0), NAVY),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.35, GRAY_300),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(t)


def summary_cards(cards):
    row = []
    for title, value in cards:
        cell = Table(
            [
                [Paragraph(title, styles["cardTitle"])],
                [Paragraph(value, styles["cardValue"])],
            ],
            colWidths=[42 * mm],
        )
        cell.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), status_bg(value)),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        row.append(cell)

    t = Table([row], colWidths=[45 * mm] * 4)
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(t)


def text_box(title, text):
    title_para = Paragraph(title, ParagraphStyle(
        "boxTitle",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=NAVY,
    ))
    body_para = Paragraph(safe_text(text).replace("\n", "<br/>"), styles["tiny"])

    t = Table(
        [[title_para], [body_para]],
        colWidths=[180 * mm],
    )
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GRAY_100),
                ("BACKGROUND", (0, 1), (-1, 1), GRAY_50),
                ("BOX", (0, 0), (-1, -1), 0.35, GRAY_300),
                ("LINEBELOW", (0, 0), (-1, 0), 0.35, GRAY_300),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(t)


corporate_header()

summary_cards(
    [
        ("OVERALL STATUS", overall),
        ("APPLICATION", local_status),
        ("PUBLIC URL", public_status),
        ("DOCKER", docker_result),
    ]
)

section("1. Executive Overview")
data_table(
    [
        ["Report Field", "Details"],
        ["Application", APP_NAME],
        ["Environment", ENVIRONMENT],
        ["Hostname", hostname],
        ["Generated At", GENERATED_AT],
        ["Public Endpoint", PUBLIC_URL],
        ["Operational Status", overall],
    ],
    [48 * mm, 132 * mm],
)

section("2. Service Health Matrix")
data_table(
    [
        ["Service", "Status", "Operational Detail"],
        ["Application Local Endpoint", local_status, f"{LOCAL_URL} | HTTP {local_code}"],
        ["Public Endpoint", public_status, f"{PUBLIC_URL} | HTTP {public_code}"],
        ["Docker Runtime", docker_result, f"Container: linkup-world-app | Health: {docker_health}"],
        ["Nginx Reverse Proxy", nginx_result, f"Service State: {nginx_status}"],
    ],
    [50 * mm, 32 * mm, 98 * mm],
)

section("3. Server Resource Summary")
data_table(
    [
        ["Metric", "Current Reading"],
        ["Server Uptime", uptime],
        ["CPU Load Average", cpu_load],
        ["Memory Utilization", memory],
        ["Root Disk Utilization", disk],
    ],
    [48 * mm, 132 * mm],
)

section("4. Backup and Retention Summary")
data_table(
    [
        ["Backup Field", "Details"],
        ["Backup Status", backup_result],
        ["Latest Backup Archive", backup_file],
        ["Backup Size", backup_size],
        ["Retention Policy", "7 days"],
        ["Backup Directory", "/home/azureuser/backups"],
    ],
    [48 * mm, 132 * mm],
)

section("5. Automation Schedule")
data_table(
    [
        ["Automation", "Schedule", "Purpose"],
        ["Health Alert", "Every 5 minutes", "Detect downtime and trigger urgent email alert"],
        ["Full Server Backup", "Daily at 08:30 AM", "Create server backup and send email confirmation"],
        ["PDF Health Report", "Daily at 09:00 AM", "Generate and email this corporate PDF report"],
    ],
    [48 * mm, 42 * mm, 90 * mm],
)

story.append(PageBreak())

corporate_header()

section("6. Docker Runtime Snapshot")
text_box("Current Container Status", docker_ps)

section("7. Nginx Validation")
text_box("Nginx Configuration Test", nginx_test)

section("8. Recent Application Logs")
text_box("Docker Application Logs", recent_logs)

section("9. Recent Nginx Error Logs")
text_box("Nginx Error Log Snapshot", nginx_errors)

section("10. Operational Recommendation")
if overall == "HEALTHY":
    recommendation = (
        "No immediate corrective action is required. The application, Docker container, "
        "Nginx reverse proxy, and public endpoint are currently operational. Continue with "
        "scheduled monitoring, backup validation, and daily reporting."
    )
else:
    recommendation = (
        "An operational issue was detected. Review the service health matrix, Docker runtime "
        "snapshot, Nginx validation output, and recent logs. Prioritize checking the application "
        "container, reverse proxy configuration, and public endpoint accessibility."
    )

text_box("Action Required", recommendation)

section("11. Report Conclusion")
text_box(
    "Conclusion",
    (
        "This report confirms the current operational state of the LinkUp World Azure deployment. "
        "The environment is monitored through Docker, Nginx, cron automation, backup checks, "
        "and email reporting. This document is generated automatically by the Azure server "
        "as part of the daily infrastructure operations process."
    ),
)


def footer(canvas, doc):
    canvas.saveState()

    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, 210 * mm, 7 * mm, fill=1, stroke=0)

    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(WHITE)
    canvas.drawString(13 * mm, 2.4 * mm, f"{COMPANY_NAME} | Confidential Operations Report")
    canvas.drawRightString(197 * mm, 2.4 * mm, f"Page {doc.page} of 2")

    canvas.restoreState()


doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(REPORT_FILE)
