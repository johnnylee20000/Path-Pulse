# Path Pulse API (Backend)

Small Node.js backend for **Path Pulse** web app: data sync and optional Web Push reminders.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sync?deviceId=...` | Return saved data blob for this device |
| POST | `/api/sync` | Body: `{ deviceId, data }` — merge and save |
| POST | `/api/push-subscribe` | Body: `{ deviceId, subscription, reminderTime }` — store push subscription |
| GET | `/api/health` | Health check |

Data is stored under `./data/` as JSON (one file per device for sync, one file for push subscriptions).

## Run locally

```bash
cd backend
npm install
npm start
```

Server runs at `http://localhost:3030`. Use a different port with `PORT=4000 npm start`.

## Web Push (reminders when app is closed)

1. Generate VAPID keys:
   ```bash
   npm run generate-vapid
   ```
2. Create a `.env` file (copy from `.env.example`) and set:
   - `VAPID_PUBLIC=...`
   - `VAPID_PRIVATE=...`
3. Restart the server. The server runs a cron every 15 minutes and sends a push to subscriptions whose `reminderTime` matches the current time (same day, once per day).

The frontend must:
- Subscribe via PushManager (using the same `VAPID_PUBLIC` in the client)
- POST the subscription to `POST /api/push-subscribe` with `deviceId` and `reminderTime`.

## Frontend configuration

In the web app, set the API base URL so the app can sync and register push:

- **Option A:** In `index.html`, before loading `app.js`, add:
  ```html
  <script>window.PATH_PULSE_API = 'http://localhost:3030';</script>
  ```
- **Option B:** In `app.js`, the code reads `window.PATH_PULSE_API` and, when set, syncs on load and after saves, and registers the push subscription when the user enables reminders.

For production, use your deployed API URL (e.g. `https://your-api.vercel.app`) and ensure CORS allows your app origin.

## Deploy

- **Vercel:** Use a serverless function that mounts this logic, or run `server.js` via a Node server.
- **Railway / Render / Fly:** Run `node server.js`; set `PORT` and `VAPID_*` in the dashboard.
- **VPS:** `node server.js` behind nginx; use PM2 or systemd to keep it running.
