# Development vs Deploy (hhourssop.co.ke)

## Subdomains to add (hhourssop.co.ke)

Create these **DNS A (or CNAME) records** pointing to your server IP:

| Subdomain | Purpose | Port / reverse proxy |
|-----------|---------|----------------------|
| **api.hhourssop.co.ke** | Backend API (REST, auth, media) | Proxy to `localhost:3004` |
| **admin.hhourssop.co.ke** | Admin dashboard (login, clients, posts, billing) | Proxy to `localhost:3005` |
| **shop.hhourssop.co.ke** | Customer shop (products, cart, checkout) | Proxy to `localhost:3003` |

Optional (internal / dev only, usually not public):

- Minio (S3): `localhost:9000` (console `:9001`) – only expose if you need web UI; otherwise keep internal.
- Postgres: `localhost:5434` – never expose publicly.

---

## Running locally (development)

Everything on **localhost**; one command to run all services.

1. **Secrets** – Put Cloudinary (and any other secrets) in **`.env`** at project root. Do not commit `.env`.
2. **URLs** – Either:
   - Use the **default** `.env` (or no file): compose uses `NEXT_PUBLIC_API_URL=http://localhost:3004` etc., or
   - Use the dev env file:  
     `docker compose --env-file .env.development up -d`
3. **Start:**
   ```bash
   docker compose up -d
   ```
   Or with dev env explicitly:
   ```bash
   docker compose --env-file .env.development up -d
   ```

**Local URLs:**

- Admin: http://localhost:3005  
- Shop: http://localhost:3003  
- API: http://localhost:3004 (e.g. http://localhost:3004/health)

`.env.development` is meant to be committed; keep real secrets only in `.env`.

---

## Deploy (production, hhourssop.co.ke)

1. **DNS** – Add the three subdomains above (api, admin, shop) pointing to your server.
2. **Secrets** – In **`.env`** (or your deploy secret store) set:
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` (strong, random)
   - `DATABASE_URL`, `REDIS_URL` if using external DB/Redis
   - `CLOUDINARY_*` or `S3_*` (Spaces) for media
3. **Start with deploy env:**
   ```bash
   docker compose --env-file .env.deploy up -d --build
   ```
   This sets:
   - `NODE_ENV=production`
   - `NEXT_PUBLIC_API_URL=https://api.hhourssop.co.ke`
   - `NEXT_PUBLIC_SHOP_DOMAIN=shop.hhourssop.co.ke`
4. **Reverse proxy (HTTPS)** – Put Nginx, Caddy, or Traefik in front and:
   - **api.hhourssop.co.ke** → `http://127.0.0.1:3004`
   - **admin.hhourssop.co.ke** → `http://127.0.0.1:3005`
   - **shop.hhourssop.co.ke** → `http://127.0.0.1:3003`  
   Terminate SSL at the proxy (e.g. Let’s Encrypt).

Example **Caddy** (one line per host):

```text
api.hhourssop.co.ke    { reverse_proxy localhost:3004 }
admin.hhourssop.co.ke  { reverse_proxy localhost:3005 }
shop.hhourssop.co.ke   { reverse_proxy localhost:3003 }
```

5. **Optional** – Use `.env.deploy` only for URLs and `NODE_ENV`; keep all secrets in `.env` and load both:
   ```bash
   set -a && . .env && . .env.deploy && set +a && docker compose up -d --build
   ```
   Or merge the deploy file into your CI/deploy pipeline so both are available when compose runs.

---

## Automating deploy (CI/CD)

GitHub Actions workflows in `.github/workflows/` handle **dependencies** and **deploy** so you don’t have to remember `pnpm install` or run deploy by hand.

### When you add a dependency

1. Add it in `package.json` (or in the right app/service).
2. Run **`pnpm install`** locally so `pnpm-lock.yaml` is updated.
3. Commit **both** `package.json` and `pnpm-lock.yaml`, then push.

**CI** (`.github/workflows/ci.yml`) runs on every push/PR: it runs `pnpm install --frozen-lockfile` and `pnpm build`. If the lockfile is out of date (e.g. you added a dep but didn’t run `pnpm install`), CI fails. So the workflow enforces “install → commit lockfile → push.”

Docker builds (e.g. when you run `./scripts/deploy.sh` with `--build`) run `pnpm install` **inside the image**, so new dependencies in `package.json` are installed at image build time. No need to run `pnpm install` on the server.

### Deploy workflow

**Deploy** (`.github/workflows/deploy.yml`) runs your deploy script on the server over SSH.

1. In the repo: **Settings → Secrets and variables → Actions**, add:
   - `DEPLOY_HOST` – server hostname or IP  
   - `DEPLOY_USER` – SSH user (e.g. `ubuntu`)  
   - `SSH_PRIVATE_KEY` – full private key (PEM) for that user  
   - `DEPLOY_PATH` – path to the repo on the server (e.g. `/home/ubuntu/uzahX`)

2. Trigger:
   - **Manual:** Actions → Deploy → Run workflow  
   - **On push to main:** In `deploy.yml`, uncomment the `push: branches: [main]` block

The workflow SSHs to the server, runs `git pull` and `./scripts/deploy.sh`. That runs `docker compose --env-file .env.deploy up -d --build`, which rebuilds images (and runs `pnpm install` inside them) and restarts containers.

### One-line summary

| Step | What happens |
|------|----------------|
| You add a dependency | Run `pnpm install`, commit lockfile, push |
| CI | Runs `pnpm install --frozen-lockfile` and `pnpm build` (fails if lockfile is stale) |
| Deploy (manual or on push) | SSH to server → `git pull` → `./scripts/deploy.sh` → Docker rebuild and up |

---

## Quick reference

| Goal | Command |
|------|--------|
| **Local dev (localhost)** | `./scripts/dev.sh` or `docker compose up -d` (with `.env` for secrets) |
| **Production (domains)** | `./scripts/deploy.sh` or `docker compose --env-file .env.deploy up -d --build` + reverse proxy |

Make scripts executable once: `chmod +x scripts/dev.sh scripts/deploy.sh`
