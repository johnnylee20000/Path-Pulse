# Path Pulse — scalable full-stack architecture

This document describes how the Path Pulse PWA, REST API, PostgreSQL, and real-time layer fit together for synced tracking and 3D route replay.

## High-level layers

| Layer | Role |
|--------|------|
| **PWA (static)** | Primary UX: steps, expeditions, maps, local persistence (`localStorage`), optional cloud sync (`/api/sync`). |
| **REST API (Node/Express)** | Structured data: profiles, XP/level, expedition metadata, GPS batches, terrain energy (`/api/routes/energy`). |
| **PostgreSQL** | Source of truth for explorer identity (`device_id`), profile/BMI/body composition, expedition sessions, ordered GPS samples. |
| **WebSocket (`/ws/live`)** | Low-latency fan-out when new points are appended (dashboards, second screens). Complements REST (which persists). |

## Sync model: “local first, server augmented”

1. **Device identity** — The app continues to use a stable `device_id` (or equivalent) for sync and API calls until you add auth (see below).
2. **Blob sync** — `GET/POST /api/sync` merges JSON into per-device files for backup/restore across browsers.
3. **Structured sync** — For analytics, replay, and multi-client views, the client should **POST batches of points** to `POST /api/v1/expeditions/:expeditionId/points` while an expedition is active, then **PATCH** complete with summary fields. That keeps the DB aligned with what the user sees after reload.
4. **Real-time** — Subscribers connect to `ws://<host>/ws/live`, send `{"type":"subscribe","expeditionId":"<uuid>"}`, and receive `points_batch` / `expedition_complete` messages when the API writes data.

## Scaling and deployment notes

- **Single Node process** — The in-memory `liveHub` only broadcasts within one process. For horizontal scale, replace it with **Redis Pub/Sub** (or NATS) and have each API instance subscribe and forward to its local WebSocket clients.
- **Serverless (e.g. Vercel)** — File sync and cron push fit serverless poorly; **WebSockets and long-lived DB pools** need a **long-running Node host** (Railway, Fly.io, Render, ECS, VPS). Keep the PWA static on a CDN; point `API_BASE` at the Node URL.
- **PostGIS (optional)** — For geofencing, snapping, or spatial indexes, add PostGIS and store `geography(Point)`; the current schema uses plain `lat`/`lng` for simplicity.

## REST API v1 (PostgreSQL)

Requires `DATABASE_URL`. Apply schema: `npm run db:migrate` in `backend/`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/health` | Liveness + DB configured/ready. |
| GET | `/api/v1/explorers/:deviceId/profile` | XP, computed level (1–100), BMI, `bodyComposition` JSON. |
| PUT | `/api/v1/explorers/:deviceId/profile` | Upsert weight, height, age, sex, BMI, optional `bodyComposition`. |
| POST | `/api/v1/explorers/:deviceId/xp` | Body: `{ "delta": n }` or `{ "set": n }`. |
| POST | `/api/v1/explorers/:deviceId/expeditions` | Start expedition; returns `expeditionId`. |
| GET | `/api/v1/explorers/:deviceId/expeditions` | List recent expeditions. |
| POST | `/api/v1/expeditions/:expeditionId/points` | Body: `{ "points": [{ "lat","lng","alt?","tMs?" }] }` (batch). |
| PATCH | `/api/v1/expeditions/:expeditionId/complete` | Finalize distance, terrain kcal, surface. |
| GET | `/api/v1/expeditions/:expeditionId/replay` | Expedition meta + ordered points for 3D/time-lapse UI. |

**Level curve** — Matches the client: `level = min(100, floor(0.1 * sqrt(xp)) + 1)`.

## Security evolution

Current API uses `device_id` in URLs (demo/dev friendly). For production:

- Issue **JWT** (or session cookies) after login; map `sub` → internal `explorer_id`.
- Rate-limit and validate body sizes on point batches.
- Use **HTTPS** and `wss://` for WebSockets.

## Pointer dashboard (3D wireframe time-lapse)

Static page `pointer-dashboard.html` loads expedition replay from the API, projects coordinates into a local tangent plane, and animates a **wireframe-style** polyline over time (play/pause + scrub). With `npm start` in `backend/`, Express serves the parent `path-pulse-web/` folder, so you can open `http://localhost:3030/pointer-dashboard.html` (same origin; leave API base empty). Otherwise use query params:

- `expeditionId` — UUID from API.
- `api` — API base URL if not same-origin (e.g. `http://localhost:3030`).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string. |
| `PGSSLMODE=require` | Common for managed Postgres (SSL). |
| `PORT` | API port (default 3030). |
| `VAPID_*` | Web Push (existing). |
