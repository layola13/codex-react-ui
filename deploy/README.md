# Docker Compose Installation

This deployment follows the Sub2API-style layout: one application container plus a PostgreSQL container, with all secrets kept in a local `.env` file.

## Prerequisites

- Docker 20.10+
- Docker Compose v2+
- A Codex CLI binary available inside the application container

The provided image builds Codex React UI, but it does not build Codex CLI itself. Mount a Codex binary or wrapper into the container and set `CODEX_BIN` if `codex` is not already available in the image.

## Quick Start

```bash
cd deploy
cp .env.example .env

# Generate secure secrets.
sed -i "s/change-this-postgres-password/$(openssl rand -hex 24)/" .env
sed -i "s/change-this-to-openssl-rand-hex-32/$(openssl rand -hex 32)/" .env
sed -i "s/change-this-admin-password/$(openssl rand -hex 24)/" .env

# Review CODEX_UI_ADMIN_EMAIL and optional CODEX_BIN before starting.
nano .env

docker compose up -d --build
```

Open:

```text
http://127.0.0.1:43110
```

Sign in with `CODEX_UI_ADMIN_EMAIL` and `CODEX_UI_ADMIN_PASSWORD` from `.env`. On first boot, if the `users` table has no administrator, the server creates this default `role='admin'` account.

## Mounting Codex CLI

If Codex CLI is installed on the host, mount it into the container:

```yaml
services:
  codex-react-ui:
    volumes:
      - /absolute/path/to/codex:/usr/local/bin/codex:ro
    environment:
      CODEX_BIN: /usr/local/bin/codex
```

If your Codex setup also depends on local config, keep the included `codex_home` volume or mount your own directory to `/root/.codex`.

## Useful Commands

```bash
# Start or update the stack
docker compose up -d --build

# View application logs
docker compose logs -f codex-react-ui

# View PostgreSQL logs
docker compose logs -f postgres

# Stop containers but keep data
docker compose down

# Remove containers and volumes. This deletes PostgreSQL data.
docker compose down -v
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `POSTGRES_DB` | PostgreSQL database name |
| `POSTGRES_USER` | PostgreSQL user |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `CODEX_UI_PORT` | Host port mapped to the UI |
| `CODEX_UI_JWT_SECRET` | HS256 JWT signing secret |
| `CODEX_UI_ADMIN_EMAIL` | First administrator email |
| `CODEX_UI_ADMIN_PASSWORD` | First administrator password |
| `CODEX_UI_JWT_EXPIRE_HOURS` | Login token lifetime |
| `CODEX_BIN` | Codex CLI executable path inside the container |

## Data Volumes

| Volume | Contents |
| --- | --- |
| `postgres_data` | PostgreSQL user/auth data |
| `codex_ui_home` | Codex React UI local provider/audit data |
| `codex_home` | Codex CLI home directory |
