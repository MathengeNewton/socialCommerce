# PLAN.md — Vibecode Build Plan (Social Publishing + shop.domain)

**Stack**
- Frontend Admin: Next.js (mobile-first web) → `admin.domain`
- Frontend Shop: Next.js storefront (custom, not React Storefront) → `shop.domain`
- Backend: NestJS API
- Background Jobs: NestJS Worker
- DB: PostgreSQL
- Cache/Queue/Rate-limits: Redis
- Storage: S3-compatible (Minio local)

**Goal**
Build a platform where teams can publish products to social media and sell them via shop.domain.

---

# A) Bootstrapping the Monorepo (Day 0)

## A1. Repo structure (monorepo)
- [ ] Create repo: `social-commerce-suite`
- [ ] Setup pnpm workspaces (recommended)
- [ ] Create folder structure:

```txt
apps/
  admin/            # Next.js admin dashboard
  shop/             # Next.js storefront
services/
  api/              # NestJS API
  worker/           # NestJS worker
packages/
  shared/           # shared types + zod validation
infra/
  docker/
docs/
```

## A2. Shared package
- [ ] Setup `packages/shared`
- [ ] Add shared:
  - [ ] `types.ts` (domain types)
  - [ ] `constants.ts` (roles, statuses)
  - [ ] `schemas.ts` (zod validators)

---

# B) Local Infrastructure (Docker First)

## B1. Docker Compose (source of truth dev environment)
- [ ] Add `docker-compose.yml` with:
  - [ ] postgres
  - [ ] redis
  - [ ] minio
  - [ ] api
  - [ ] worker
  - [ ] admin_web
  - [ ] shop_web

## B2. Env files
- [ ] Add `.env.example`
- [ ] Add `.env.api.example`
- [ ] Add `.env.admin.example`
- [ ] Add `.env.shop.example`

## B3. Health checks
- [ ] API `/health`
- [ ] Worker `/health`

✅ **Checkpoint**
- [ ] `docker compose up -d` boots everything with zero drama

---

# C) Database + Core Domain Setup

## C1. Choose ORM
- [ ] Prisma OR TypeORM (pick one and commit)

## C2. Core tables
- [ ] tenants
- [ ] clients (brands/workspaces)
- [ ] users
- [ ] memberships (RBAC)
- [ ] refresh_tokens (for session handling)
- [ ] audit_logs

## C3. Seed
- [ ] Seed tenant + client + admin user
- [ ] Seed demo products + demo draft posts

✅ **Checkpoint**
- [ ] `pnpm migrate && pnpm seed` works on a fresh DB

---

# D) Auth + Tenancy (Security Foundation)

## D1. Auth endpoints (API)
- [ ] POST `/auth/login`
- [ ] POST `/auth/refresh`
- [ ] POST `/auth/logout`
- [ ] GET `/me`

## D2. Session rules
- [ ] access token short lived
- [ ] refresh token rotation
- [ ] refresh token stored as hash

## D3. Tenant isolation (hard requirement)
- [ ] Every domain table has:
  - [ ] tenant_id
  - [ ] client_id where relevant
- [ ] Every API request resolves tenant + client server-side
- [ ] No cross-tenant reads/writes possible

✅ **Checkpoint**
- [ ] User from Tenant A cannot access Tenant B data even via ID guessing

---

# E) Admin Dashboard Skeleton (Mobile-First UX)

## E1. Pages
- [ ] `/login`
- [ ] `/dashboard`
- [ ] `/compose`
- [ ] `/products`
- [ ] `/orders`
- [ ] `/settings`

## E2. UX Principles
- [ ] wizard-style posting workflow
- [ ] big buttons (mobile first)
- [ ] empty states everywhere
- [ ] clear errors + retry options

✅ **Checkpoint**
- [ ] Admin can login + switch client workspace + see empty dashboard

---

# F) Media Upload Module (Shared for posts + products)

## F1. Media flow (direct upload)
- [ ] POST `/media/uploads` → returns signed URL + media_id
- [ ] Client uploads directly to storage
- [ ] POST `/media/:id/confirm`

## F2. Validation
- [ ] allowlist mime types (png/jpeg/mp4)
- [ ] max file size enforced
- [ ] store metadata (width/height/duration)

✅ **Checkpoint**
- [ ] Admin uploads image/video, sees preview, and it persists in DB

---

# G) Ecommerce Module (Admin + shop.domain)

## G1. Admin: Product catalog CRUD
- [ ] Create product:
  - [ ] title
  - [ ] description
  - [ ] price
  - [ ] currency
  - [ ] slug (unique)
  - [ ] status (draft/published)
- [ ] Upload product images (uses Media module)
- [ ] Product variants (optional):
  - [ ] size/color
  - [ ] SKU

## G2. Admin: Inventory
- [ ] stock per variant
- [ ] stock adjustments
- [ ] prevent negative stock

✅ **Checkpoint**
- [ ] Admin creates product → publishes it → it becomes visible to store API

---

# H) Storefront App (shop.domain)

> This storefront is built in Next.js from scratch (not React Storefront).

## H1. Public store pages
- [ ] `/` home
- [ ] `/products` listing
- [ ] `/p/[slug]` product detail
- [ ] `/cart`
- [ ] `/checkout`
- [ ] `/order/[publicId]`

## H2. Store APIs
- [ ] GET `/store/products` (search/filter/pagination)
- [ ] GET `/store/products/:slug`

✅ **Checkpoint**
- [ ] Customer browses products and opens PDP successfully

---

# I) Cart + Checkout

## I1. Cart
- [ ] Add to cart
- [ ] Update quantity
- [ ] Remove item
- [ ] Persistence:
  - [ ] cookie OR server cart session

## I2. Checkout
- [ ] customer name
- [ ] phone/email
- [ ] address (optional)
- [ ] final stock validation

✅ **Checkpoint**
- [ ] Customer can checkout and reach payment stage

---

# J) Payments + Webhooks

## J1. Payment flow
- [ ] POST `/payments/create`
- [ ] Redirect to provider OR generate payment request
- [ ] POST `/payments/webhook` (signature verification)

## J2. Idempotency
- [ ] webhook replays do not duplicate orders

✅ **Checkpoint**
- [ ] Payment success → order created → inventory decremented

---

# K) Orders Module

## K1. Shop side
- [ ] Confirmation page `/order/[publicId]`

## K2. Admin side
- [ ] order list
- [ ] update fulfillment status:
  - [ ] pending
  - [ ] processing
  - [ ] shipped
  - [ ] complete

✅ **Checkpoint**
- [ ] Admin can see paid orders and update order status

---

# L) Social Integrations (OAuth)

## L1. Integrations to support
- [ ] Meta: Facebook Pages
- [ ] Meta: Instagram Business
- [ ] X (Twitter)
- [ ] Pinterest boards (destinations)

## L2. Endpoints
- [ ] POST `/integrations/:provider/connect`
- [ ] GET `/integrations`
- [ ] POST `/integrations/:id/disconnect`
- [ ] POST `/destinations/refresh`
- [ ] GET `/destinations`

✅ **Checkpoint**
- [ ] Connect platform → destinations appear in UI

---

# M) Post Composer (Admin)

## M1. Draft post model
- [ ] create post draft
- [ ] attach media
- [ ] choose destinations
- [ ] platform captions:
  - [ ] FB caption
  - [ ] IG caption
  - [ ] X caption
  - [ ] Pinterest caption
- [ ] optional: include product link in caption (toggle per platform)

## M2. Preview
- [ ] show platform preview cards
- [ ] show caption limits + warnings
- [ ] preview shows clickable product link when enabled

✅ **Checkpoint**
- [ ] Draft saved with variants + destinations + media

---

# N) Product Linking (Campaign Engine)

## N1. Link posts to products
- [ ] attach one or more products to a post
- [ ] choose primary product
- [ ] toggle option: include clickable link in published content

## N2. Generate links
- [ ] link = `shop.domain/p/:slug`
- [ ] attach UTM:
  - [ ] utm_source
  - [ ] utm_medium
  - [ ] utm_campaign
- [ ] when enabled, automatically append link to caption text (platform-aware formatting)
- [ ] link is clickable in published social media posts
- [ ] viewers click link → taken directly to shop product page

✅ **Checkpoint**
- [ ] Published post includes clickable product link in content that resolves correctly
- [ ] Link appears in actual social media post (not just metadata)

---

# O) Publishing Engine (Queue + Worker)

## O1. Publish now
- [ ] POST `/posts/:id/publish`
- [ ] create job per destination

## O2. Schedule
- [ ] POST `/posts/:id/schedule`
- [ ] POST `/posts/:id/cancel`

## O3. Worker execution rules
- [ ] idempotency key = post_id + destination_id
- [ ] store external_post_id on success
- [ ] retry with exponential backoff
- [ ] stop after max attempts
- [ ] rate-limit per provider in Redis

✅ **Checkpoint**
- [ ] Post publishes successfully to at least 1 platform and status updates correctly

---

# P) Post Status Tracking + Audit

## P1. Status tracker
- [ ] Draft / Scheduled / Publishing / Published / Failed
- [ ] per destination statuses
- [ ] retry failed destination

## P2. Audit logs
Audit everything serious:
- [ ] connect/disconnect integrations
- [ ] publishing actions
- [ ] product edits
- [ ] order status changes

✅ **Checkpoint**
- [ ] Admin can trace what happened and when (no guesswork)

---

# Q) QA Checklist (Minimum Non-Negotiable)

## Q1. Smoke tests
- [ ] login works
- [ ] create product → visible on shop
- [ ] add to cart
- [ ] connect meta platform
- [ ] create post draft

## Q2. E2E
- [ ] product → checkout → paid order → stock decrement
- [ ] draft → schedule → publish → status changes

## Q3. Security
- [ ] tenant isolation tests
- [ ] webhook signature verification

✅ **Final acceptance**
- [ ] Full ecosystem runs locally via docker
- [ ] Admin can publish posts + sell products from same system
