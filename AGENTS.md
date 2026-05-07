# AGENTS.md

## Repository Structure

- `backend/` - Django 6.0.1 API with DRF, SQLite, custom user model (`authentication.User`)
- `frontend/` - React 19 + Vite 7 + Tailwind CSS 4, no test framework configured
- `backend/dspace_uploader/` - Standalone OAI-PMH harvester (not part of Django app)

## Commands

### Frontend (in `frontend/`)
- `pnpm dev` - Dev server on port 3000
- `pnpm build` - Production build
- `pnpm format` / `pnpm lint` / `pnpm check` - Biome (not ESLint/Prettier)

### Backend (in `backend/`)
- `python manage.py runserver 8000` - Dev server
- `python manage.py migrate` - Run migrations
- Docker: `docker compose up` - Full stack (backend:8000, frontend:3000)

## Key Architecture Facts

- Frontend proxies `/api/dspace` to DSpace (port 8080) and `/api` to Django (port 8000)
- DSpace proxy uses `changeOrigin: false` with cookie path rewriting (`/server` → `/`) - critical for CSRF
- Environment variables: `backend/.env` and `frontend/.env` (see `.env.example` files)
- External dependencies: DSpace (8080), Koha (8085), VuFind (8090)

## Development Quirks

- Backend requires Tesseract OCR with Amharic (`tesseract-ocr-amh`) and English languages
- Biome config uses tabs, double quotes (`biome.json`)
- Frontend path alias: `@/*` → `./src/*` (`jsconfig.json`)
- CORS allows all origins in development (`CORS_ALLOW_ALL_ORIGINS = True`)
- No test framework configured - do not expect `npm test` or `pytest` to work

## References

- DSpace integration details: `frontend/DSPACE_INTEGRATION.md`
- DSpace→Koha harvester docs: `backend/dspace_uploader/README.md`
- VS Code spell-check words and commit scopes: `.vscode/settings.json`
