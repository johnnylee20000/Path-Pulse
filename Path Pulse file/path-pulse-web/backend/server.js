/**
 * Path Pulse — Backend API
 * - Sync: GET/POST /api/sync (deviceId) — backup/restore localStorage blob
 * - Push: POST /api/push-subscribe — store subscription for Web Push reminders
 * - Cron sends reminder at stored reminderTime (requires VAPID keys in .env)
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const webpush = require('web-push');

const app = express();
const PORT = process.env.PORT || 3030;
const DATA_DIR = path.join(__dirname, 'data');
const SYNC_FILE = (id) => path.join(DATA_DIR, `sync-${sanitizeId(id)}.json`);
const PUSH_FILE = path.join(DATA_DIR, 'push-subscriptions.json');

function sanitizeId(id) {
  if (!id || typeof id !== 'string') return '';
  return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || 'default';
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readSync(deviceId) {
  ensureDataDir();
  const file = SYNC_FILE(deviceId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeSync(deviceId, data) {
  ensureDataDir();
  const file = SYNC_FILE(deviceId);
  fs.writeFileSync(file, JSON.stringify(data, null, 0), 'utf8');
}

function readPushSubscriptions() {
  ensureDataDir();
  if (!fs.existsSync(PUSH_FILE)) return [];
  try {
    const raw = fs.readFileSync(PUSH_FILE, 'utf8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function writePushSubscriptions(arr) {
  ensureDataDir();
  fs.writeFileSync(PUSH_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

// ——— Sync ———
app.get('/api/sync', function (req, res) {
  const deviceId = sanitizeId(req.query.deviceId);
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId required' });
  }
  const data = readSync(deviceId);
  res.json(data || {});
});

app.post('/api/sync', function (req, res) {
  const deviceId = sanitizeId(req.body && req.body.deviceId);
  const payload = req.body && req.body.data;
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId required' });
  }
  if (payload == null || typeof payload !== 'object') {
    return res.status(400).json({ error: 'data object required' });
  }
  const existing = readSync(deviceId) || {};
  const merged = { ...existing, ...payload };
  writeSync(deviceId, merged);
  res.json({ ok: true });
});

// ——— Push subscribe ———
app.post('/api/push-subscribe', function (req, res) {
  const deviceId = sanitizeId(req.body && req.body.deviceId);
  const subscription = req.body && req.body.subscription;
  const reminderTime = (req.body && req.body.reminderTime) || '09:00';
  if (!deviceId || !subscription || typeof subscription.endpoint !== 'string') {
    return res.status(400).json({ error: 'deviceId and subscription required' });
  }
  const list = readPushSubscriptions();
  const idx = list.findIndex(function (s) { return s.deviceId === deviceId; });
  const entry = {
    deviceId,
    subscription: {
      endpoint: subscription.endpoint,
      keys: subscription.keys || {},
      expirationTime: subscription.expirationTime
    },
    reminderTime: String(reminderTime).slice(0, 5),
    lastSentDate: null
  };
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  writePushSubscriptions(list);
  res.json({ ok: true });
});

// ——— VAPID public key (for frontend push subscription) ———
app.get('/api/vapid-public', function (req, res) {
  res.json({ publicKey: vapidPublic || '' });
});

// ——— Health ———
app.get('/api/health', function (req, res) {
  res.json({ status: 'ok', service: 'path-pulse-api' });
});

// ——— Web Push (cron) ———
const vapidPublic = process.env.VAPID_PUBLIC;
const vapidPrivate = process.env.VAPID_PRIVATE;
if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(
    'mailto:path-pulse@local',
    vapidPublic,
    vapidPrivate
  );
}

function sendReminderToSubscription(entry) {
  const sub = entry.subscription;
  const endpoint = sub.endpoint;
  const keys = sub.keys;
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) return Promise.resolve();
  return webpush.sendNotification(
    { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, expirationTime: sub.expirationTime },
    JSON.stringify({ title: 'Path Pulse Reminder', body: 'Keep moving. Log steps, water, and meals in Path Pulse.', tag: 'pathpulse-reminder' }),
    { TTL: 60 }
  ).catch(function (err) {
    console.warn('Push failed for', entry.deviceId, err.statusCode || err.message);
  });
}

function runReminderCron() {
  const list = readPushSubscriptions();
  if (list.length === 0) return;
  const now = new Date();
  const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const promises = [];
  list.forEach(function (entry) {
    const [h, m] = (entry.reminderTime || '09:00').split(':').map(Number);
    const targetMin = (h || 0) * 60 + (m || 0);
    const diff = Math.abs(currentMin - targetMin);
    if (diff > 15) return;
    if (entry.lastSentDate === today) return;
    promises.push(
      sendReminderToSubscription(entry).then(function () {
        entry.lastSentDate = today;
      })
    );
  });
  if (promises.length > 0) {
    Promise.all(promises).then(function () {
      writePushSubscriptions(list);
    }).catch(function () {});
  }
}

if (vapidPublic && vapidPrivate) {
  cron.schedule('*/15 * * * *', runReminderCron);
}

ensureDataDir();
app.listen(PORT, function () {
  console.log('Path Pulse API on http://localhost:' + PORT);
  if (!vapidPublic || !vapidPrivate) {
    console.log('Optional: set VAPID_PUBLIC and VAPID_PRIVATE for Web Push reminders. Run: npm run generate-vapid');
  }
});
