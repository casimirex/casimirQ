# casimirQ

A quantum circuit simulation platform: build circuits, run them on real
simulation engines (dense statevector, matrix-product-state, and Clifford
stabilizer), and inspect the results — with per-user persistence, authentication,
and a React UI.

- **Backend** — NestJS (TypeScript) REST API + quantum engines
- **Frontend** — React 18 + Vite + Tailwind + Zustand + TanStack Query
- **Database** — PostgreSQL (optional; falls back to in-memory)

## Features

- **Simulation engines** — dense statevector, MPS, and Clifford (stabilizer)
  with automatic engine selection; exact statevector, probabilities and sampled
  measurement counts.
- **Circuits & history** — create/update/delete circuits and run simulations,
  all persisted per user; a batch runner and an analysis pipeline.
- **Auth** — JWT (signature-verified) with bcrypt-hashed passwords and signup.
- **Advanced features** — quantum error correction (Steane/Shor), noise models,
  and quantum ML (VQE, quantum kernels).
- **Ops** — GitHub Actions CI, Docker/`docker compose`, and versioned DB
  migrations.

## Quick start (Docker)

The fastest way to run the whole stack (Postgres + API + web UI):

```bash
docker compose up --build
```

Then open **http://localhost:8080** and sign in with the demo account:

| email | password |
| --- | --- |
| `admin@example.com` | `admin123` |
| `demo@example.com` | `demo` |

What compose starts:

- `postgres` — PostgreSQL 16 (data in the `pgdata` volume)
- `migrate` — one-shot: applies DB migrations, then exits
- `backend` — the API on `:3000` (waits for `migrate` to finish)
- `frontend` — nginx serving the SPA on `:8080`, reverse-proxying `/api` to the
  backend (so the app is single-origin — no CORS needed)

Set a real secret in production: `JWT_SECRET=... docker compose up`.

## Local development

Requires **Node.js 18+** (CI runs on Node 20).

### Backend (API on :3000)

```bash
npm install
# optional: use Postgres (otherwise an in-memory store is used)
export DATABASE_URL=postgres://user:pass@localhost:5432/casimirq
npm run migrate          # apply migrations (only when using Postgres)
npm run start:dev        # watch mode
```

Without `DATABASE_URL` the API runs against an in-memory store — great for a
quick spin-up, but data is lost on restart.

### Frontend (dev server on :5173)

```bash
cd frontend
npm install
npm run dev
```

The dev server calls the API at `http://localhost:3000/api/v1` by default
(override with `VITE_API_URL`). The backend's CORS allows `localhost:5173`.

## Database & migrations

Schema is owned by [`node-pg-migrate`](https://github.com/salsita/node-pg-migrate)
(migrations in [`migrations/`](./migrations)) — the app does **not** create
tables at boot.

```bash
npm run migrate          # apply pending migrations (uses DATABASE_URL)
npm run migrate:down     # roll back the last migration
npm run migrate:create   # scaffold a new migration
```

Under Docker, the `migrate` service applies migrations before the backend
starts. Applied migrations are tracked in the `pgmigrations` table.

## Configuration

Backend (environment variables):

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | _(unset)_ | Postgres connection string. If unset, an in-memory store is used. |
| `JWT_SECRET` | dev fallback | JWT signing secret — **set this in production**. |
| `PORT` | `3000` | API port. |
| `PGSSL` | _(unset)_ | Set to `true` to connect to Postgres over TLS. |
| `SEED_DEMO_USERS` | _(unset)_ | Set to `false` to skip seeding the demo/admin accounts. |
| `TEST_DATABASE_URL` | _(unset)_ | Enables the Postgres integration tests (and migrates that DB before the suite). |

Frontend (build-time):

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3000/api/v1` | API base URL. The Docker image builds with `/api/v1` to use the nginx proxy. |

## Testing

```bash
# backend
npm run lint:ci          # eslint (no --fix), 0 warnings
npm run typecheck
npm test                 # ~1038 tests (in-memory)
# run the Postgres integration tests too:
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/casimirq_test npm test

# frontend
cd frontend
npm run lint && npm run typecheck && npm run test:ci
```

When `TEST_DATABASE_URL` is set, a jest global-setup applies migrations to that
database before the suite, and the DB-backed integration tests run against it.

## Continuous integration

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs on push
(`main`/`master`) and PRs, with two jobs — **backend** (lint · typecheck ·
build · test, against a Postgres service) and **frontend** (lint · typecheck ·
build · test).

## API overview

All routes are under `/api/v1` and (except auth) require a
`Authorization: Bearer <token>` header.

Interactive API docs (Swagger UI) are served at **`/api/v1/docs`**, and the raw
OpenAPI 3.0 document at **`/api/v1/docs-json`**. The spec is the versioned
contract for every client — regenerate the committed [`openapi.json`](./openapi.json)
with:

```bash
npm run openapi:generate
```

| Group | Base path | Purpose |
| --- | --- | --- |
| Auth | `/auth` | `login`, `signup`, `refresh`, `logout`, `me`, `validate` |
| Circuits | `/circuits` | CRUD + `:id/simulate` |
| Simulations | `/simulations` | run history, results |
| Jobs | `/jobs` | **asynchronous** job engine: submit (202 → queued), poll status/progress/result, cancel, delete |
| Visualizations | `/visualizations` | Bloch sphere, circuit diagram (SVG), histogram, 3D state |
| Advanced | `/advanced` | error correction, noise, quantum ML; `batch/*`, `pipeline/*` |

## Project layout

```
src/                     # backend (NestJS)
  modules/
    circuit-engine/      # immutable Circuit builder
    gate-library/        # quantum gates
    simulation-engines/  # statevector, MPS, Clifford
    algorithms/          # Grover, Shor, QFT, VQE, ...
    advanced-features/   # QEC, noise, quantum ML
    visualization/       # Bloch sphere, circuit diagrams
    api/                 # REST controllers, repositories, guards, auth
migrations/              # node-pg-migrate schema migrations
frontend/                # React + Vite SPA
Dockerfile               # backend image (multi-stage)
frontend/Dockerfile      # frontend image (vite build -> nginx)
docker-compose.yml       # postgres + migrate + backend + frontend
```

> The `PHASE*_*.md` / `*_AUDIT_REPORT.md` files in the repo root are historical
> development notes and are not required to run the project.

## License

MIT
