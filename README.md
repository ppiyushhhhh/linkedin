# Linkedin 🌐

A LinkedIn-style social networking web application deployed on **Microsoft Azure** with a full production-grade DevOps workflow — featuring Docker, Nginx, GitHub Actions CI/CD, automated backups, PDF reporting, and downtime alerting.

> **Live App:** [http://20.244.48.171](http://20.244.48.171) &nbsp;|&nbsp; **Login:** [http://20.244.48.171/login](http://20.244.48.171/login)

---

## 📌 Project Overview

LinkUp World demonstrates end-to-end cloud deployment for a modern React/Vite/TanStack application. It showcases real-world DevOps practices including containerization, reverse proxy configuration, CI/CD automation, server backup, PDF reporting, and production monitoring.

---

## 🏗️ Architecture

```
Developer
   │
   ▼
GitHub Repository
   │
   ▼
GitHub Actions CI/CD Pipeline
   │
   ▼
Azure Ubuntu VM
   │
   ▼
Docker Compose
   │
   ▼
LinkUp World Container (:3000)
   │
   ▼
Nginx Reverse Proxy (:80)
   │
   ▼
Public User Access
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, TanStack Router, Vite |
| **Runtime** | Node.js 22 |
| **Backend/Auth** | Supabase (Auth, Database, Storage) |
| **Containerization** | Docker, Docker Compose |
| **Reverse Proxy** | Nginx |
| **Cloud** | Microsoft Azure (Ubuntu VM) |
| **CI/CD** | GitHub Actions |
| **Automation** | Linux Cron Jobs |
| **Email** | msmtp, mailutils (Gmail SMTP) |
| **Reporting** | Python, ReportLab |

---

## 🚀 Features

### Application
- LinkedIn-style social networking UI
- Supabase authentication and database integration
- Production server-side routing via custom Node server adapter
- `/login` route support

### DevOps & Infrastructure
- Azure Ubuntu VM hosting
- Dockerized deployment with `docker-compose`
- Nginx reverse proxy (port 80 → container port 3000)
- GitHub Actions CI/CD — auto-deploys on push to `main`
- Secure environment variable handling via `.env` and GitHub Secrets

### Automation & Monitoring
- ✅ **Daily full server backup** — archives project files, configs, Docker/Nginx status, server metrics; emails `.tar.gz` attachment; 7-day retention
- ✅ **Daily corporate PDF report** — professional 2-page operations report with service health matrix, Docker/Nginx status, resource summary, and recommendations
- ✅ **Downtime alert system** — checks app URL, Nginx, and Docker every 5 minutes; sends urgent email on failure and recovery email on restore
- ✅ **Cron-based scheduling** for all automation tasks

---

## ⏱️ Automation Schedule

| Task | Schedule | Description |
|---|---|---|
| Full Server Backup | Daily at 8:30 AM | Creates and emails backup archive |
| PDF Operations Report | Daily at 9:00 AM | Generates and emails daily report |
| Downtime Health Check | Every 5 minutes | Monitors services and sends alerts |

---

## 📁 Project Structure

```
linkedin/
├── Dockerfile
├── docker-compose.yml
├── server-adapter.mjs          # Custom Node server for production routing
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD pipeline
├── scripts/
│   ├── daily-full-backup.sh    # Server backup + email
│   ├── send-daily-pdf-report.sh# PDF report email sender
│   ├── generate-daily-pdf-report.py  # PDF report generator
│   └── down-alert.sh           # Downtime/recovery alerting
└── reports/                    # Generated PDF reports (git-ignored)
```

---

## ⚙️ Server Details

| Item | Value |
|---|---|
| Cloud Provider | Microsoft Azure |
| OS | Ubuntu Linux |
| Public IP | `20.244.48.171` |
| Project Path | `/home/azureuser/linkedin` |
| Docker Container | `linkup-world-app` |
| Nginx Config | `/etc/nginx/sites-available/linkedin` |
| App Port | `3000` (internal) |
| Public Port | `80` |

---

## 🔐 CI/CD — GitHub Secrets Required

| Secret | Purpose |
|---|---|
| `AZURE_VM_HOST` | Azure VM public IP |
| `AZURE_VM_USER` | Server username |
| `AZURE_VM_SSH_KEY` | Private SSH key for deployment |

> ⚠️ The Gmail App Password is stored only on the server in `~/.msmtprc` and is **never** committed to GitHub.

---

## 🧑‍💻 Key Commands

### Deploy / Restart App
```bash
cd /home/azureuser/linkedin
sudo docker compose down --remove-orphans
sudo docker compose up -d --build
sudo docker ps
sudo docker logs linkup-world-app --tail 80
```

### Health Check
```bash
curl -I http://localhost:3000/login
curl -I http://20.244.48.171/login
```

### Nginx
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### Run Automation Scripts Manually
```bash
./scripts/daily-full-backup.sh
./scripts/down-alert.sh
./scripts/send-daily-pdf-report.sh
```

### View Logs
```bash
tail -50 scripts/daily-full-backup.log
tail -50 scripts/down-alert.log
tail -50 scripts/daily-pdf-report.log
```

---

## 🔒 Security Practices

- `.env` file is git-ignored and loaded server-side only
- Gmail App Password never committed to GitHub
- SSH private key stored only in GitHub Secrets
- Docker Compose reads environment variables from server-side `.env`
- Backups, reports, logs, and build output excluded from Git

---

## 🗺️ Future Improvements

- [ ] Custom domain with HTTPS (Let's Encrypt SSL)
- [ ] Grafana + Prometheus monitoring dashboard
- [ ] Docker image push to GitHub Container Registry
- [ ] Staging vs. production environments
- [ ] Rollback strategy in GitHub Actions
- [ ] Supabase database backup automation
- [ ] Slack / Discord alert integration
- [ ] Blue-green deployment strategy
- [ ] Azure Blob Storage for backup uploads
- [ ] Weekly executive summary report
- [ ] Automated vulnerability scanning with Trivy

---

## 👤 Author

**Piyush Prasad**

DevOps and Cloud learner focused on Linux, Docker, Azure, CI/CD, Nginx, and production deployment workflows.
