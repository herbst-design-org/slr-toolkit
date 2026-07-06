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

## MCP (agent access)

The app exposes an [MCP](https://modelcontextprotocol.io) server at
`/api/mcp` (Streamable HTTP, stateless) so agents can operate on the user's
data. Available tools:

- `list-slrs` — lists the SLRs the authenticated user owns or participates in.

### Authentication

The endpoint is an OAuth resource server: it accepts access tokens issued by
the **same Keycloak realm** the web app uses and validates them locally
against the realm's JWKS. Unauthenticated requests get a `401` whose
`WWW-Authenticate` header points to the RFC 9728 metadata at
`/.well-known/oauth-protected-resource/api/mcp`, from which MCP clients
discover Keycloak and run their OAuth flow.

Tokens are mapped to app users via the token's `sub` (the Keycloak user id,
stored by NextAuth in `Account.providerAccountId`) — a user must have signed
in to the web app at least once before agents can act on their behalf.

### Keycloak client for MCP clients

Do not reuse the web app's confidential client. Create a second,
**public** client in the same realm (e.g. `slr-toolkit-mcp`):

- Client authentication: **off** (public client)
- Standard flow: **on**; Advanced → PKCE Code Challenge Method: **S256**
- Valid redirect URIs, depending on which clients you use:
  - MCP Inspector: `http://localhost:6274/oauth/callback`
  - Claude: `https://claude.ai/api/mcp/auth_callback` and
    `https://claude.com/api/mcp/auth_callback`

### Testing with the MCP Inspector

```sh
npx @modelcontextprotocol/inspector
```

In the UI select transport "Streamable HTTP", URL
`https://<your-app>/api/mcp`, and set the OAuth client id to
`slr-toolkit-mcp` in the auth settings. The inspector redirects to the
Keycloak login and then connects with the obtained token. Alternatively, with
a token at hand:

```sh
npx @modelcontextprotocol/inspector --cli https://<your-app>/api/mcp \
  --transport http --header "Authorization: Bearer <token>" --method tools/list
```

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
