# Squirrel: AI-Powered Personal Finance Management

![Django](https://img.shields.io/badge/Django-6.0-092E20?style=for-the-badge&logo=django&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-F55036?style=for-the-badge&logo=meta&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white)
![Status](https://img.shields.io/badge/Status-Complete-2ECC71?style=for-the-badge)

---

Squirrel is a full-stack, AI-powered personal finance management system built for tracking expenses, managing budgets, and gaining intelligent financial insights across web and mobile.

---

## What It Does

- **Track** expenses and income from any source: manual entry, receipt scanning, or AI chat
- **Budget** smarter with category-based limits, alert thresholds, and rollover support
- **Chat** with an AI financial assistant that understands your spending history and gives personalised advice
- **Scan** physical receipts with your phone camera: OCR extracts the amount, merchant, and date automatically
- **Visualise** spending trends, category breakdowns, and income vs. expense charts
- **Get alerted** via in-app, email, SMS, or push notification when budgets are breached or anomalies are detected

---

## Architecture

Squirrel is a multi-service system. Every service is independently deployable and wired together via Docker Compose.

```
           ┌─────────────────┐    ┌─────────────────┐
           │  React Web App  │    │  React Native   │
           │  (Port 5173)    │    │  Mobile (Expo)  │
           └────────┬────────┘    └────────┬────────┘
                    │                      │
                    └───────────┬──────────┘
                                │  REST API / WebSocket
                    ┌───────────▼───────────┐
                    │   Django Backend API  │
                    │      (Port 8000)      │
                    └───┬───────────────┬───┘
                        │               │
           ┌────────────▼──┐    ┌───────▼────────────┐
           │  FastAPI AI   │    │  Celery Worker     │
           │  Microservice │    │  + Beat Scheduler  │
           │  (Port 8001)  │    └────────────────────┘
           └───────────────┘
                        │
           ┌────────────┴────────────┐
           │                         │
    ┌──────▼──────┐         ┌────────▼──────┐
    │ PostgreSQL  │         │    Redis 7    │
    │     15      │         │ Cache + Queue │
    └─────────────┘         └───────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend API** | Django 6.0, Django REST Framework 3.16, Celery 5.6, Django Channels 4.3 |
| **AI Microservice** | FastAPI 0.115, Groq Cloud (Llama 3.3 70B / Llama 3.1 8B), scikit-learn, pytesseract |
| **Web Frontend** | React 19, TypeScript 5.9, Vite 7, TailwindCSS, Zustand, React Query, Recharts |
| **Mobile App** | React Native 0.81, Expo SDK 54, React Navigation 7, Expo SQLite, Expo Camera |
| **Database** | PostgreSQL 15 |
| **Cache & Queue** | Redis 7, Celery Beat (DatabaseScheduler) |
| **Authentication** | JWT (SimpleJWT), token rotation & blacklist, Google OAuth |
| **DevOps** | Docker Compose (8 containers), GitHub Actions CI/CD, Ruff, Bandit |

---

## Project Structure

```
Squirrel/
├── backend/            # Django REST API (9 apps)
├── ai-service/         # FastAPI AI microservice (Groq LLM, OCR, insights)
├── frontend-web/       # React 19 web dashboard
├── frontend-mobile/    # React Native mobile app (Expo SDK 54)
└── docker-compose.yml  # One-command full-stack startup
```

---

## Key Features

### Transactions
- Add expenses and income manually, via OCR receipt scan, AI chat command, or recurring automation
- Payment method tracking (card, cash, wallet, bank transfer)
- Soft delete with full admin visibility
- Multi-currency support

### Budgets & Categories
- Category-based budgets with configurable alert thresholds
- Budget rollover for unused amounts
- System-wide and user-defined categories

### AI Assistant
- Natural language chat powered by Groq (Llama 3.3 70B)
- Intent detection: add expense, query balance, get insight, general conversation
- Persistent user memory: learns spending habits over time
- Voice input via Expo Audio (mobile)

### Notifications & Insights
- Budget breach and threshold alerts
- AI-generated spending pattern insights and anomaly detection
- Multi-channel delivery: in-app, email (Gmail SMTP), SMS, push (Expo Notifications)
- Quiet hours and per-type preferences per user

---

## Quick Start

**Docker (recommended): starts everything in one command:**

```bash
git clone https://github.com/himalacharya122/Squirrel.git
cd Squirrel
cp backend/.env.example backend/.env        # Django secret, DB password, shared AI key
cp ai-service/.env.example ai-service/.env  # GROQ_API_KEY, same shared AI key
docker compose up --build
```

| Service | URL |
|---------|-----|
| Web App | http://localhost:5173 |
| API | http://localhost:8000/api/v1/ |
| API Docs (Swagger) | http://localhost:8000/api/docs/ |
| AI Service | http://localhost:8001/health |

---

## API Overview

The REST API is organised into the modules below. Full interactive documentation is available at `/api/docs/` (Swagger UI) and `/api/redoc/` once the backend is running.

| Module | Base Path |
|--------|-----------|
| Authentication | `/api/v1/auth/` |
| Expenses & Incomes | `/api/v1/expenses/`, `/api/v1/incomes/` |
| Recurring Transactions | `/api/v1/recurring-transactions/` |
| Budgets | `/api/v1/budgets/` |
| Categories | `/api/v1/categories/` |
| AI Chat | `/api/v1/chat/conversations/` |
| AI Insights | `/api/v1/insights/` |
| Receipts (OCR) | `/api/v1/receipts/` |
| Notifications | `/api/v1/notifications/` |