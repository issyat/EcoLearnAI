# EcoLearnAI Scaffold

Full-stack starter with FastAPI, React (Vite), Postgres, and Docker Compose.

## Stack
- FastAPI + Uvicorn (async SQLAlchemy, asyncpg)
- React + Vite + TypeScript
- Postgres 16
- Docker Compose for local orchestration

## Quickstart (Docker)
1. Copy environment templates:
   ```sh
   cp backend/.env.example backend/.env
   cp .env.example .env
   ```
2. Build and start:
   ```sh
   docker compose up --build
   ```
3. Open frontend at http://localhost:3000 and API at http://localhost:8000.

## Local Dev (without Docker)
- Backend:
  ```sh
  cd backend
  python -m venv .venv && source .venv/bin/activate  # on Windows: .venv\Scripts\activate
  pip install -e .[dev]
  uvicorn app.main:app --reload
  ```
- Frontend:
  ```sh
  cd frontend
  npm install
  npm run dev
  ```

## Tests
- Backend tests: `cd backend && pytest`

## Deployment Notes
- Backend Dockerfile serves Uvicorn on port 8000.
- Frontend Dockerfile builds static assets and serves via Nginx on port 80.
- Compose mounts a persistent Postgres volume named `db_data`.
