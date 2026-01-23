# Copilot / AI Agent Instructions for this repository

Purpose: give an AI coding agent just enough, focused context to be immediately productive in this mono-repo (backend + frontend).

Quick overview
- Monorepo with two main apps:
  - ai_saas_backend: Flask-based API and admin tools. See [ai_saas_backend/src/main.py](ai_saas_backend/src/main.py) and [ai_saas_backend/src/run_server.py](ai_saas_backend/src/run_server.py).
  - ai_saas_frontend: Vite + React UI. See [ai_saas_frontend/package.json](ai_saas_frontend/package.json) and [ai_saas_frontend/src](ai_saas_frontend/src).

High-level architecture notes
- Backend is a Flask app assembled in `ai_saas_backend/src` using Blueprints. Routes are registered in `ai_saas_backend/src/routes` (examples: `user_api`, `auth_api`, `ai_generation_api`). The app uses SQLAlchemy models in `ai_saas_backend/src/models` and Flask-Migrate (`ai_saas_backend/migrations`).
- Authentication uses `Flask-JWT-Extended` with cookies: the access cookie name is `access_token_cookie` and token storage is cookie-based. CORS for development is limited to `http://localhost:3000` (see `DEV_ORIGINS` in [ai_saas_backend/src/main.py](ai_saas_backend/src/main.py)).
- Background/production serving uses `waitress` in [ai_saas_backend/src/run_server.py](ai_saas_backend/src/run_server.py) (note: ensure `waitress` is installed in the env; it is not listed in `requirements.txt`).

Important environment variables
- `DATABASE_URL` — SQLAlchemy DB connection
- `SECRET_KEY` and `JWT_SECRET_KEY` — app/jwt secrets
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_USERNAME`, `ADMIN_NAME` — used by the default admin seed in `main.py`
- The app uses `python-dotenv` (`load_dotenv()` in `main.py`) so a `.env` file in `ai_saas_backend` or the environment is expected for local dev.

Developer workflows (exact commands)
- Backend setup (Windows):
  - cd to backend: `cd ai_saas_backend`
  - create venv: `python -m venv venv`
  - activate: `venv\Scripts\activate`
  - install deps: `pip install -r requirements.txt`
  - (If deploying via `run_server.py`) ensure `waitress` is installed: `pip install waitress` or add it to `requirements.txt`.
- Run backend (dev): from `ai_saas_backend/src` run `python main.py` — this launches Flask debug server on `127.0.0.1:8000`.
- Run backend (production-like): from `ai_saas_backend/src` run `python run_server.py` — serves with `waitress` on `0.0.0.0:8000`.
- Frontend setup & dev server:
  - cd `ai_saas_frontend`
  - `npm install`
  - Start Vite dev server: `npm run dev -- --port 3000` (the project expects frontend on port 3000; backend CORS allows 3000 by default).
- Tests: backend tests use pytest and an in-memory SQLite configured in `tests/conftest.py`. From `ai_saas_backend` run: `pytest -q`.

Project-specific conventions and patterns
- Blueprints are mounted with a consistent url_prefix (e.g., `/api/users`, `/api/auth`, `/api/ai`) — prefer adding new routes as Blueprints under `ai_saas_backend/src/routes` and register them in `main.py`.
- JWT handling is cookie-based (HttpOnly) so most client-side logic uses the backend to set/clear cookies. Avoid implementing token storage on the client when adding auth flows.
- Static uploads are served via `@app.route('/static/uploads/<path:filename>')` and saved under the repo `static/uploads`. When adding file upload features, follow the existing path conventions.
- DB migrations: use `Flask-Migrate`. Migration files live in `ai_saas_backend/migrations` — run migration commands from the `src` directory (typical pattern: `flask db migrate` / `flask db upgrade` when `FLASK_APP` is set appropriately).

Integration points & external deps to watch
- AI generation endpoints under `ai_saas_backend/src/routes/ai_generation_api.py` and `ai_generation_video_api.py` talk to internal generation utilities. Review `ai_saas_backend/src/routes/generation` for text/video specifics.
- External services: MySQL (via `mysqlclient` / `mysql-connector-python`) and Redis appear in `requirements.txt` — ensure environment credentials are available for integration tests or end-to-end runs.

When making changes, quickly check these files to understand existing patterns:
- `ai_saas_backend/src/main.py` — app setup, CORS, cookie/JWT config, blueprint registration
- `ai_saas_backend/src/extensions.py` — centralized extension instances (db, jwt, bcrypt, limiter)
- `ai_saas_backend/src/models/` — data models and associations
- `ai_saas_frontend/src/services/apiService.jsx` — API client patterns and auth usage on the frontend
- `ai_saas_frontend/package.json` — dev/build scripts

PR Guidance for AI agents
- Small, focused PRs: change one layer at a time (API, DB model, frontend). Include a short migration plan if DB changes are required.
- Update `requirements.txt` if new server-side packages are introduced (note: `waitress` is used but not listed; mirror runtime dependencies explicitly).

If anything is unclear or you'd like more examples (e.g., a sample API change PR), ask and I'll add concrete examples referencing the exact files.

-- End of instructions
