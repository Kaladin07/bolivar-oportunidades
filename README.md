# Bolivar Opportunities

A bilingual public aggregator of jobs, internships, courses, and scholarships for young people in Bolivar, Colombia. The interface defaults to Spanish and is also available in English. Applications and authoritative requirements remain on each original source.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the architecture decision, request flow, and production follow-up work.

## Architecture

- `frontend`: Next.js App Router organized by product features, with server-rendered public listings and bilingual routes under `/es` and `/en`.
- `backend`: NestJS modular monolith with domain modules for authentication, opportunities, applications, and external imports.
- Root workspace: npm workspaces provide a canonical root lockfile and shared build, lint, test, and database commands.
- PostgreSQL: users, profiles, opportunities, categories, and applications, managed with Prisma.
- Redis: best-effort cache for public opportunity searches. Database queries continue when Redis is unavailable.
- External imports: the backend checks the Himalayas public API for remote jobs, Cartagena's public calls page for relevant local opportunities, and reviewed learning catalogs from freeCodeCamp, CS50, and OpenLearn. Each listing links to its original source with visible attribution.
- Public aggregator mode: account, dashboard, manual publishing, and internal application routes are disabled by default with `INTERNAL_FEATURES_ENABLED=false`.

## Local development

1. Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env.local`.
2. Set a long random `JWT_SECRET` in `backend/.env`.
3. Run `docker compose up -d` from this directory.
4. Run `npm install` from this directory.
5. Run `npm run db:migrate` from this directory.
6. Run `npm run dev:api` and `npm run dev:web` in separate terminals.
7. Open `http://localhost:3000/es`.

From the repository root, `npm run lint`, `npm test`, and `npm run build` validate every workspace.

The backend imports external listings in the background when it starts, then checks hourly whether 24 hours have passed since the last successful import. The first import may take a minute. It reads up to 100 recent entry-level remote jobs available from Colombia. Imported jobs include the full description, employment type, experience level, salary when supplied, and country eligibility. Applications go to the original source. Listing content retains the source language; site navigation and actions are translated into Spanish and English. Set `EXTERNAL_IMPORT_ENABLED=false` in `backend/.env` to disable the importer. External listings stop appearing after their closing date or after 45 days without a successful refresh. The importer uses the [Himalayas Remote Jobs API](https://himalayas.app/docs/remote-jobs-api), which requires visible attribution and a link back to the original listing.

The Cartagena adapter reads the [public calls page](https://cartagena.gov.co/convocatorias) and imports only open calls related to jobs, internships, courses, or scholarships. It stores factual metadata and an original link, rather than republishing the call's full text or attachments. It checks up to five listing pages, validates each relevant detail page and closing date, and closes records no longer shown as open after a complete successful scan. Set `CARTAGENA_IMPORT_ENABLED=false` to disable only this adapter. The source's page structure and usage terms should be reviewed periodically. SENA APE is not scraped because its [terms require prior written authorization to reproduce or store its content](https://ape.sena.edu.co/Paginas/T%C3%A9rminos-y-condiciones-de-uso-del-portal-web-de-la-Agencia-P%C3%BAblica-de-Empleo-del-SENA.aspx).

The freeCodeCamp adapter imports a small, version-controlled catalog of reviewed current certifications and links each record to its official learning page. Once per week it validates the allowlist against freeCodeCamp's official curriculum structure before refreshing the records. It never imports every curriculum entry automatically, so legacy or unfinished certifications are not published by accident. Set `FREECODECAMP_IMPORT_ENABLED=false` to disable only this adapter.

The curated learning adapter imports reviewed CS50 courses from Harvard University and selected badged OpenLearn courses from The Open University. It validates every official course URL before refreshing a source, keeps CS50's free certificates distinct from OpenLearn's free digital badges and statements of participation, and never deletes records after a failed validation. Set `CS50_IMPORT_ENABLED=false` or `OPENLEARN_IMPORT_ENABLED=false` to disable either source.

For UI testing without external data, `npm run db:seed` from the repository root creates clearly labeled demo listings and a demo provider account (`demo-provider@example.com`, password `DemoPassword123!`). Set `SEED_PROVIDER_PASSWORD` before seeding to choose a different password.

The frontend calls the API through a same-origin `/api` rewrite, so authentication cookies stay on the frontend origin. Public pages are server rendered and indexable. Set `API_INTERNAL_URL` to the backend's server-side address when deploying the frontend separately.

Set `INTERNAL_FEATURES_ENABLED=true` only if the dormant account, manual publishing, and internal application modules are intentionally restored together with their frontend routes.

## Deployment notes

Provide managed PostgreSQL and Redis, configure HTTPS, set `COOKIE_SECURE=true`, and set the public frontend/backend URLs. Run `npm run db:deploy` during deployment. The seed command is for local development only.
