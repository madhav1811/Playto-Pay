# Playto Payout Engine

A robust payout engine for Indian agencies and freelancers to collect international payments and withdraw funds to local bank accounts.

## Features
- **Strict Ledger**: Balance derived from immutable transaction history.
- **Idempotency**: Prevents duplicate payouts using `X-Idempotency-Key` headers.
- **Concurrency Protection**: Uses `SELECT FOR UPDATE` to prevent overdrawing.
- **Background Workers**: Celery tasks with exponential backoff and retry logic.
- **Premium Dashboard**: High-fidelity React dashboard with Glassmorphism.

## Tech Stack
- **Backend**: Django, Django REST Framework, Celery.
- **Frontend**: React, Vite, Tailwind CSS, Framer Motion.
- **Database**: PostgreSQL (Recommended) / SQLite (Local Demo).
- **Cache/Broker**: Redis.

## Setup Instructions

### Backend
1. `cd backend`
2. `python -m venv venv`
3. `.\venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Linux/Mac)
4. `pip install -r requirements.txt`
5. `python manage.py migrate`
6. `python seed.py` (To populate initial merchants and history)
7. `python manage.py runserver`

### Background Workers (Celery)
1. Ensure Redis is running on `localhost:6379`.
2. `celery -A core worker -l info -P solo`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## Testing
Run automated tests for concurrency and idempotency:
```bash
cd backend
pytest
```

## Explainer
See [EXPLAINER.md](./EXPLAINER.md) for deep dives into the ledger, locking mechanisms, and idempotency logic.