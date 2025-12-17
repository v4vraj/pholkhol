# 🛣️ PholKhol – AI-Powered Civic Issue Reporting Platform

PholKhol is a social media–style civic issue reporting platform that enables citizens to report local infrastructure problems such as potholes, water logging, damaged signs, and road hazards.  
The system uses **AI-powered workflows (Kestra)** to automatically analyze, prioritize, and escalate the most critical issues.

---

## 🚀 Features

- 📸 Citizens can post civic issues with images and descriptions
- 🧠 AI-based image classification & severity assessment
- ⚙️ Event-driven and scheduled workflows using **Kestra**
- 🗺️ Location-aware issue context (Mumbai-focused)
- 🐦 Automated generation of social-media–ready content for escalation
- 📦 Scalable backend with FastAPI, PostgreSQL, and MinIO

---

## 🧱 Tech Stack

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS

### Backend

- FastAPI
- PostgreSQL
- SQLAlchemy

### AI & Automation

- Kestra (workflow orchestration)
- Gemini (multimodal image + text analysis)
- Mistral (structured JSON extraction)

### Infrastructure

- Docker & Docker Compose
- MinIO (object storage)

---

## 📂 Project Structure

```text
pothole-hacks/
│
├── backend/
│   ├── app/
│   │   ├── auth.py
│   │   ├── db.py
│   │   ├── kestra_client.py
│   │   └── main.py
│   ├── requirements.txt
│   └── .env (ignored)
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── .env (ignored)
│
├── kestra_flows/
│   ├── issue-recognition.yaml
│   └── top3Posts.yaml
│
├── docker-compose.yml
├── .gitignore
└── README.md
⚙️ Kestra Workflows
1️⃣ Issue Recognition Flow (issue-recognition.yaml)
Triggered whenever a user creates a post.

Steps:

Fetch post data from PostgreSQL

Download image from MinIO

Classify issue using Gemini (category, severity, authenticity)

Extract structured JSON using Mistral

Update post with AI scores and status

2️⃣ Daily Escalation Flow (top3Posts.yaml)
Runs daily via cron.

Steps:

Fetch all analysed posts from the current day

Rank them by composite score

Select the most critical issue

Generate a social-media–ready post

Store the generated communication for escalation

ℹ️ Note: Automatic posting to Facebook was planned but not implemented due to Facebook Page verification limitations.

🔐 Secrets & Configuration
This project uses Kestra Secrets.
❌ Do NOT hardcode credentials or API keys in YAML files.

Required Secrets
Secret Name	Description
POSTGRES_URL	PostgreSQL JDBC URL
POSTGRES_USER	Database username
POSTGRES_PASSWORD	Database password
GEMINI_API_KEY	Google Gemini API key
MISTRAL_API_KEY	Mistral AI API key
MINIO_ACCESS_KEY	MinIO access key
MINIO_SECRET_KEY	MinIO secret key
MINIO_ENDPOINT	MinIO endpoint URL

🐳 Running with Docker
bash
Copy code
docker-compose up -d
Services
Kestra → http://localhost:8080

MinIO Console → http://localhost:9001

PostgreSQL → localhost:5432

▶️ Running Backend Locally
bash
Copy code
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
▶️ Running Frontend
bash
Copy code
cd frontend
npm install
npm run dev
🧠 AI Agent Usage (Kestra)
The project uses Kestra’s built-in AI capabilities to:

Summarize multimodal data (image + text)

Rank issues based on severity and authenticity

Make decisions on which issue should be escalated

This enables transparent, automated civic prioritization without manual intervention.
```
