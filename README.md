## Setup

Requirements:

### Authentication:

- Some form of OAuth Provider compatible with NextAuth (default is Keycloak)

### Database:

- PostgreSQL database
- qdrant Database

### Services:

- some Embedding service

## Deployment (Docker Compose)

`docker-compose.yml` deploys the app together with PostgreSQL and Qdrant.
Keycloak (auth), the embedding service, and the classifier service are hosted
separately and referenced via environment variables.

1. Copy the environment template and fill it in:

   ```sh
   cp .env.docker.example .env
   ```

   (Or keep it as `.env.docker` and pass `--env-file .env.docker` to every
   `docker compose` command — useful on machines that already have a
   development `.env`.)

2. Build and start:

   ```sh
   docker compose up -d --build
   ```

   The `migrate` service runs `prisma migrate deploy` against PostgreSQL
   before the app starts; the app waits for it to finish and for both
   databases to be healthy.

3. The app listens on container port 3000 but is not published on a host
   port: a TLS-terminating reverse proxy (e.g. Coolify's Traefik) is expected
   to route to it over the Docker network. Make sure `AUTH_URL` matches the
   public URL, since it is used for the OAuth callback with Keycloak. For a
   proxy-less deployment, add a `docker-compose.override.yml` with a
   `ports: ["3000:3000"]` mapping on the `app` service.

PostgreSQL and Qdrant are not published on host ports; they are only
reachable from the app container. Data is persisted in the `postgres-data`
and `qdrant-data` volumes.

## Field encryption

Provider API keys (fields marked `/// @encrypted` in `prisma/schema.prisma`)
are encrypted at rest via
[`prisma-field-encryption`](https://github.com/47ng/prisma-field-encryption).
This requires `PRISMA_FIELD_ENCRYPTION_KEY`; generate one with:

```sh
npx cloak generate
```

Treat the key like a database credential and back it up — without it the
stored API keys cannot be decrypted.

Values written before encryption was enabled remain readable (plaintext is
passed through on read) but stay unencrypted until rewritten. To encrypt
them in place, run once:

```sh
npx tsx scripts/encrypt-existing-data.ts
```
