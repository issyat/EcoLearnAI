# EcoLearnAI

A gamified environmental education platform combining AI-powered learning with carbon footprint tracking.

## Features

- **🔐 Authentication**: Secure JWT-based user registration and login
- **📚 AI-Powered Lessons**: Generate personalized environmental lessons using GPT API
- **🌱 Carbon Tracking**: Track eco-friendly actions and calculate CO2 impact with Climatiq API
- **🎮 Gamification**: Trees planted equivalent based on cumulative CO2 savings

## Stack
- **Backend**: FastAPI + Uvicorn (async SQLAlchemy, asyncpg)
- **Frontend**: React + Vite + TypeScript
- **Database**: PostgreSQL 16 with Alembic migrations
- **APIs**: GPT (dat1.co) for lessons, Climatiq for carbon calculations
- **Deployment**: Docker Compose for local orchestration


## Local Dev (without Docker)

### Backend
```sh
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Unix: source .venv/bin/activate
pip install -e .[dev]

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8960
```

### Frontend
```sh
cd frontend
npm install
npm run dev
```

## Tests
```sh
cd backend
pytest                 # All tests (25)
pytest -v              # Verbose output
pytest tests/test_carbon.py  # Carbon tracking tests only
```

All tests use TDD approach with comprehensive mocking of external APIs.

## Database Migrations

```sh
cd backend
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one version
alembic downgrade -1
```

## Architecture

- **Backend**: Async FastAPI with dependency injection, Pydantic validation
- **Database**: Async SQLAlchemy ORM with PostgreSQL
- **Testing**: pytest with httpx AsyncClient, SQLite test database
- **Code Quality**: Ruff linter with 100-char line limit

## Deployment Notes
- Backend Dockerfile serves Uvicorn on port 8000
- Frontend Dockerfile builds static assets and serves via Nginx on port 80
- Compose mounts a persistent Postgres volume named `db_data`
- Migrations must be run manually after deployment

