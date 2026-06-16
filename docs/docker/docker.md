# Docker

This project ships with a Docker setup for both local development (database only) and full-stack deployment (Next.js app + PostgreSQL).

## Overview

| File                 | Purpose                                                            |
| -------------------- | ----------------------------------------------------------------- |
| `docker-compose.yml` | Defines the `postgres` and `app` services.                        |
| `Dockerfile`         | Multi-stage production build for the Next.js app (standalone).    |
| `.dockerignore`      | Excludes files from the build context.                            |
| `.env`               | Runtime environment variables (gitignored — create from example). |
| `.env.example`       | Template for `.env`.                                              |

### Services

- **`postgres`** — PostgreSQL `16.6-alpine`. Starts by default. Data persists in the named volume `meisterflow-postgres-data`. Has a `pg_isready` healthcheck.
- **`app`** — The Next.js app, built from `Dockerfile`. Gated behind the `app` [Compose profile](https://docs.docker.com/compose/how-tos/profiles/), so it only starts when that profile is enabled. Waits for `postgres` to be healthy before starting.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2 (`docker compose`, not the legacy `docker-compose`).

## Environment Variables

All services read from `.env`. Create it from the template before starting anything:

```bash
cp .env.example .env
```

| Variable            | Description                          | Default                                                              |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| `POSTGRES_USER`     | Database user.                       | `meisterflow`                                                       |
| `POSTGRES_PASSWORD` | Database password.                   | `meisterflow`                                                       |
| `POSTGRES_DB`       | Database name.                       | `meisterflow_crm`                                                   |
| `POSTGRES_PORT`     | Host port mapped to Postgres `5432`. | `5432`                                                             |
| `APP_PORT`          | Host port mapped to the app `3000`.  | `3000`                                                             |
| `DATABASE_URL`      | Connection string used by the app.   | `postgresql://meisterflow:meisterflow@postgres:5432/meisterflow_crm` |

> **Hostname matters for `DATABASE_URL`:**
>
> - Inside Docker Compose, use the service hostname `postgres`:
>   `postgresql://meisterflow:meisterflow@postgres:5432/meisterflow_crm`
> - When running the app **locally** (outside Docker) against the dockerized DB, use `localhost`:
>   `postgresql://meisterflow:meisterflow@localhost:5432/meisterflow_crm`

## Local Development (database only)

For day-to-day development, run the Next.js app on your host (`npm run dev`) and only start PostgreSQL in Docker. The `app` service is behind the `app` profile, so it is excluded by default:

```bash
# Start Postgres only
docker compose up -d

# Run the app on your host
npm run dev
```

Make sure `DATABASE_URL` in `.env` uses `localhost` for this workflow (see note above).

To stop:

```bash
docker compose down
```

## Full Stack (app + database)

To build and run both the app and the database in Docker, enable the `app` profile:

```bash
docker compose --profile app up -d --build
```

The app will be available at http://localhost:3000 (or `APP_PORT`).

Make sure `DATABASE_URL` in `.env` uses the `postgres` hostname for this workflow.

To stop:

```bash
docker compose --profile app down
```

## Common Commands

```bash
# View running services
docker compose ps

# Follow logs (all services)
docker compose logs -f

# Follow logs for a single service
docker compose logs -f postgres
docker compose logs -f app

# Rebuild the app image without cache
docker compose --profile app build --no-cache app

# Open a shell in the running app container
docker compose exec app sh

# Open a psql session in the database
docker compose exec postgres psql -U meisterflow -d meisterflow_crm

# Validate the compose configuration
docker compose config

# List services for the active profile
docker compose config --services
docker compose --profile app config --services
```

## Data Persistence

PostgreSQL data is stored in the named volume `meisterflow-postgres-data`, so it survives container restarts and recreation.

```bash
# Stop and remove containers, but keep the data volume
docker compose down

# Stop and remove containers AND delete the data volume (destroys all DB data)
docker compose down -v
```

## The Dockerfile

The app image is a multi-stage build optimized for production:

1. **`deps`** — installs dependencies with `npm ci`.
2. **`builder`** — runs `npm run build`. Relies on `output: "standalone"` in `next.config.ts`, which traces only the files needed at runtime.
3. **`runner`** — copies the standalone output (`.next/standalone`), static assets (`.next/static`), and `public/`. Runs as a non-root `nextjs` user and starts the server with `node server.js`.

Key environment defaults baked into the runner stage:

- `NODE_ENV=production`
- `NEXT_TELEMETRY_DISABLED=1`
- `PORT=3000`
- `HOSTNAME=0.0.0.0` (required so the server is reachable from outside the container)

Base image: `node:22-alpine` (satisfies Next.js's `>=20.9.0` engine requirement).

## Deployment

The same `Dockerfile` and `app` profile are used for deployment.

1. Provision a `.env` on the target host with production values. At minimum set:
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
   - `DATABASE_URL` (pointing at the `postgres` service or your managed database)
   - `APP_PORT` if you need a non-default host port
2. Build and start the full stack:

   ```bash
   docker compose --profile app up -d --build
   ```

3. Verify health and logs:

   ```bash
   docker compose ps
   docker compose logs -f app
   ```

### Deployment notes

- **Secrets:** Never commit `.env`. Use strong, unique values for `POSTGRES_PASSWORD` in production. Consider a secrets manager instead of a plaintext `.env` where possible.
- **Managed database:** If you use an external/managed PostgreSQL instead of the `postgres` service, point `DATABASE_URL` at it and start only the app:

  ```bash
  docker compose up -d --build app
  ```

- **Reverse proxy:** It is recommended to run a reverse proxy (e.g. nginx) in front of the app for TLS, rate limiting, and request validation rather than exposing the container directly.
- **Updating:** Pull the latest code, then rebuild and restart:

  ```bash
  docker compose --profile app up -d --build
  ```

## Troubleshooting

- **`operation not permitted` reading `.env`:** Some sandboxed tools can't read `.env`. Run the command in a normal shell.
- **App can't reach the database:** Check that `DATABASE_URL` uses the `postgres` hostname (inside Docker) vs `localhost` (on host). Confirm Postgres is healthy with `docker compose ps`.
- **Port already in use:** Change `APP_PORT` or `POSTGRES_PORT` in `.env`.
- **Stale build:** Rebuild without cache: `docker compose --profile app build --no-cache`.
