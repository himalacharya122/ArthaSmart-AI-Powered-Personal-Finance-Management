# ArthaSmart — Docker Run & Debug Guide

A step-by-step guide to running, inspecting, and debugging the full ArthaSmart stack using Docker.

---

## What Gets Spun Up

| Container | Role | Port |
|---|---|---|
| `db` | PostgreSQL 15 database | `5432` |
| `redis` | Cache, Celery broker, WebSocket layer | `6379` |
| `backend` | Django REST API + WebSocket | `8000` |
| `celery-worker` | Async task worker (notifications, reports) | — |
| `celery-beat` | Periodic task scheduler | — |
| `ai-service` | FastAPI AI microservice (LLM, OCR) | `8001` |
| `frontend-web` | React 19 + Vite dev server | `5173` |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and **running**
- At least **4 GB** of free RAM allocated to Docker
- A terminal open at the **project root** (same folder as `docker-compose.yml`)

---

## Step 1 — Set Up Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and update these key fields before running anything:

```env
# Required — Django will refuse to start without a secret key
DJANGO_SECRET_KEY=your-64-char-random-string-here

# Required for Docker — must be "db", not "localhost"
POSTGRES_HOST=db

# Required — get a free key at https://console.groq.com
GROQ_API_KEY=your-groq-api-key-here

# Optional — only needed if you want email notifications working
EMAIL_HOST_USER=your-gmail@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
```

> **Note:** `POSTGRES_HOST=db` is critical. When running inside Docker, the backend connects to the `db` container by its service name, not `localhost`.

---

## Step 2 — Build and Start the Full Stack

Run this once from the project root. It builds all images and starts every service:

```bash
docker compose up --build
```

The first build takes **3–5 minutes** as it installs Python and Node dependencies. Subsequent starts are much faster.

To run in the background (detached mode):

```bash
docker compose up --build -d
```

### What happens on startup

1. `db` and `redis` start and pass their health checks
2. `backend` waits for both, then runs `python manage.py migrate` automatically
3. `celery-worker` and `celery-beat` start after the database is ready
4. `ai-service` starts and connects to Redis
5. `frontend-web` starts the Vite dev server

---

## Step 3 — Verify Everything Is Running

Check that all containers are healthy:

```bash
docker compose ps
```

All services should show `running` or `healthy`. Then hit these URLs in your browser:

| Service | URL | Expected |
|---|---|---|
| Web dashboard | http://localhost:5173 | React app loads |
| Backend API root | http://localhost:8000/api/schema/ | OpenAPI schema (JSON) |
| Swagger UI | http://localhost:8000/api/schema/swagger-ui/ | Interactive API docs |
| ReDoc | http://localhost:8000/api/schema/redoc/ | Readable API docs |
| AI service health | http://localhost:8001/health | `{"status": "ok"}` |
| AI service docs | http://localhost:8001/docs | FastAPI Swagger UI |

---

## Step 4 — Common Day-to-Day Commands

### Start / Stop

```bash
# Start everything (no rebuild)
docker compose up

# Start in background
docker compose up -d

# Stop everything (keeps data)
docker compose down

# Stop and delete all data volumes (fresh slate)
docker compose down -v
```

### Rebuild a Single Service

Use this when you change a `Dockerfile` or `requirements.txt`:

```bash
docker compose up --build backend
docker compose up --build ai-service
docker compose up --build frontend-web
```

### Restart a Single Service

Use this when you just want to restart without rebuilding:

```bash
docker compose restart backend
docker compose restart celery-worker
```

---

## Step 5 — Running Django Management Commands

Open a shell inside the running backend container:

```bash
docker compose exec backend bash
```

Then run any Django command normally:

```bash
# Apply migrations
python manage.py migrate

# Create a superuser for the Django admin
python manage.py createsuperuser

# Open the Django shell (Python REPL with full app context)
python manage.py shell

# Collect static files
python manage.py collectstatic --noinput

# Check for issues
python manage.py check
```

Or run a single command without opening a shell:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

---

## Step 6 — Viewing Logs

### Follow logs for a specific service

```bash
docker compose logs -f backend
docker compose logs -f ai-service
docker compose logs -f celery-worker
docker compose logs -f celery-beat
docker compose logs -f frontend-web
```

### View all logs at once

```bash
docker compose logs -f
```

### View last N lines

```bash
docker compose logs --tail=100 backend
```

Press `Ctrl+C` to stop following logs.

---

## Step 7 — Database Access

Connect directly to PostgreSQL:

```bash
docker compose exec db psql -U postgres -d kash_db
```

Once inside `psql`:

```sql
-- List all tables
\dt

-- Inspect a specific table
\d expenses

-- Run a query
SELECT * FROM users LIMIT 5;

-- Exit
\q
```

---

## Step 8 — Redis Access

Inspect the Redis cache or Celery queues:

```bash
docker compose exec redis redis-cli
```

Useful Redis commands:

```
# Check all keys
KEYS *

# Check Celery queue length
LLEN celery

# Check cache
GET some-cache-key

# Flush everything (clears cache and queues)
FLUSHALL

# Exit
EXIT
```

---

## Step 9 — Running Tests

### Backend (Django + Pytest)

```bash
docker compose exec backend pytest
```

Run with coverage:

```bash
docker compose exec backend pytest --cov=. --cov-report=term-missing
```

Run a specific test file:

```bash
docker compose exec backend pytest apps/expenses/tests/test_views.py -v
```

### AI Service (FastAPI + Pytest)

```bash
docker compose exec ai-service pytest
```

---

## Step 10 — Linting and Code Quality

### Backend

```bash
# Lint with Ruff
docker compose exec backend ruff check .

# Format with Ruff
docker compose exec backend ruff format .

# Security scan with Bandit
docker compose exec backend bandit -r . -x ./tests
```

### Frontend Web

```bash
docker compose exec frontend-web npm run lint
```

---

## Debugging Scenarios

### Backend won't start — migration error

```bash
# Check what went wrong
docker compose logs backend

# Try running migration manually to see the full error
docker compose exec backend python manage.py migrate --verbosity=2
```

### `POSTGRES_HOST` connection refused

Make sure `.env` has `POSTGRES_HOST=db` (not `localhost`). The backend must use the Docker service name to reach the database container.

### AI service returns 500 errors

```bash
# Check the logs
docker compose logs ai-service

# Verify the Groq API key is set correctly
docker compose exec ai-service env | grep GROQ
```

### Frontend shows "Network Error" / can't reach backend

The Vite dev server is configured to call `http://localhost:8000`. Make sure the backend container is healthy:

```bash
docker compose ps backend
```

If it's unhealthy, check:

```bash
docker compose logs backend
```

### Celery tasks not processing

```bash
# Check worker is alive and picking up tasks
docker compose logs -f celery-worker

# Check what's in the queue
docker compose exec redis redis-cli LLEN celery
```

### Port already in use

If a port like `5432` or `8000` is already taken on your machine, stop the conflicting process or change the host-side port in `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"   # maps host port 5433 to container port 5432
```

### Fresh start — wipe everything and rebuild

```bash
docker compose down -v --remove-orphans
docker compose up --build
```

> **Warning:** `down -v` deletes all database data. Only do this if you want a completely clean slate.

---

## Mobile App (React Native / Expo)

The mobile app (`frontend-mobile/`) runs on your physical device or emulator, **not inside Docker**. It connects to the backend running in Docker.

```bash
# Install dependencies
cd frontend-mobile
npm install

# Start Expo
npx expo start
```

Make sure your device and machine are on the same network, and update the API URL in the app to point to your machine's local IP (e.g., `http://192.168.x.x:8000/api/v1`).

---

## IoT Devices (ESP32)

IoT firmware is in `iot/` and is flashed to physical ESP32 boards using PlatformIO — it does not run in Docker. Devices communicate directly with the backend over HTTP.

---

## Quick Reference Card

```bash
# Start everything
docker compose up --build

# Stop everything (keep data)
docker compose down

# Nuke everything (delete data too)
docker compose down -v

# See status of all containers
docker compose ps

# Follow logs for one service
docker compose logs -f backend

# Open a shell in any container
docker compose exec backend bash
docker compose exec ai-service bash

# Run migrations
docker compose exec backend python manage.py migrate

# Seed categories
docker compose exec backend python manage.py seed_categories

# Create superuser
docker compose exec backend python manage.py createsuperuser

# Run backend tests
docker compose exec backend pytest

# Rebuild one service
docker compose up --build ai-service
```
