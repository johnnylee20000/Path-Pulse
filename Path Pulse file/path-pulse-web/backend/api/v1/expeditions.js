'use strict';

const express = require('express');
const { query, getPool, isDbEnabled } = require('../../lib/db');
const { deviceId } = require('../../lib/sanitize');
const liveHub = require('../../lib/liveHub');

const router = express.Router({ mergeParams: true });

function db503(res) {
  return res.status(503).json({ ok: false, error: 'database_not_configured', code: 'DB_DISABLED' });
}

async function ensureExplorer(id) {
  await query(
    `INSERT INTO explorers (device_id) VALUES ($1)
     ON CONFLICT (device_id) DO UPDATE SET updated_at = NOW()`,
    [id]
  );
}

router.post('/explorers/:deviceId/expeditions', express.json({ limit: '16kb' }), async function (req, res) {
  if (!isDbEnabled()) return db503(res);
  const id = deviceId(req.params.deviceId);
  if (!id) return res.status(400).json({ ok: false, error: 'invalid_device_id' });
  const b = req.body || {};
  const surfaceKey = typeof b.surfaceKey === 'string' ? b.surfaceKey.slice(0, 64) : 'pavement';

  try {
    await ensureExplorer(id);
    const r = await query(
      `INSERT INTO expeditions (device_id, surface_key, status) VALUES ($1, $2, 'active') RETURNING id, started_at`,
      [id, surfaceKey]
    );
    const row = r.rows[0];
    res.status(201).json({
      ok: true,
      expeditionId: row.id,
      startedAt: row.started_at,
    });
  } catch (e) {
    if (e.code === 'DB_DISABLED') return db503(res);
    console.error('[v1 expedition POST]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

router.get('/explorers/:deviceId/expeditions', async function (req, res) {
  if (!isDbEnabled()) return db503(res);
  const id = deviceId(req.params.deviceId);
  if (!id) return res.status(400).json({ ok: false, error: 'invalid_device_id' });
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  try {
    const r = await query(
      `SELECT id, started_at, ended_at, distance_km, surface_key, terrain_kcal, status
       FROM expeditions WHERE device_id = $1 ORDER BY started_at DESC LIMIT $2`,
      [id, limit]
    );
    res.json({ ok: true, expeditions: r.rows });
  } catch (e) {
    if (e.code === 'DB_DISABLED') return db503(res);
    console.error('[v1 expeditions list]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

router.post('/expeditions/:expeditionId/points', express.json({ limit: '512kb' }), async function (req, res) {
  if (!isDbEnabled()) return db503(res);
  const expId = req.params.expeditionId;
  if (!expId || !/^[0-9a-f-]{36}$/i.test(expId)) {
    return res.status(400).json({ ok: false, error: 'invalid_expedition_id' });
  }
  const points = req.body && req.body.points;
  if (!Array.isArray(points) || points.length === 0) {
    return res.status(400).json({ ok: false, error: 'points_array_required' });
  }
  if (points.length > 500) {
    return res.status(400).json({ ok: false, error: 'too_many_points_max_500' });
  }

  try {
    const chk = await query(`SELECT id, status FROM expeditions WHERE id = $1`, [expId]);
    if (chk.rows.length === 0) return res.status(404).json({ ok: false, error: 'expedition_not_found' });
    if (chk.rows[0].status !== 'active') {
      return res.status(409).json({ ok: false, error: 'expedition_not_active' });
    }

    let maxSeq = 0;
    const rMax = await query(`SELECT COALESCE(MAX(seq), 0) AS m FROM expedition_points WHERE expedition_id = $1`, [expId]);
    maxSeq = rMax.rows[0].m;

    const pool = getPool();
    if (!pool) return db503(res);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let seq = maxSeq;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        if (!isFinite(lat) || !isFinite(lng)) continue;
        seq += 1;
        const alt = p.alt != null ? Number(p.alt) : null;
        const tMs = p.tMs != null ? Math.floor(Number(p.tMs)) : null;
        await client.query(
          `INSERT INTO expedition_points (expedition_id, seq, lat, lng, alt, t_ms) VALUES ($1, $2, $3, $4, $5, $6)`,
          [expId, seq, lat, lng, isFinite(alt) ? alt : null, tMs]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const last = points[points.length - 1];
    liveHub.broadcast(expId, {
      type: 'points_batch',
      expeditionId: expId,
      count: points.length,
      last: last
        ? { lat: Number(last.lat), lng: Number(last.lng), alt: last.alt != null ? Number(last.alt) : null, tMs: last.tMs }
        : null,
    });

    res.json({ ok: true, expeditionId: expId, appended: points.length });
  } catch (e) {
    if (e.code === 'DB_DISABLED') return db503(res);
    console.error('[v1 points POST]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

router.patch('/expeditions/:expeditionId/complete', express.json({ limit: '16kb' }), async function (req, res) {
  if (!isDbEnabled()) return db503(res);
  const expId = req.params.expeditionId;
  if (!expId || !/^[0-9a-f-]{36}$/i.test(expId)) {
    return res.status(400).json({ ok: false, error: 'invalid_expedition_id' });
  }
  const b = req.body || {};
  const distanceKm = b.distanceKm != null ? Number(b.distanceKm) : null;
  const terrainKcal = b.terrainKcal != null ? Math.floor(Number(b.terrainKcal)) : null;
  const surfaceKey = typeof b.surfaceKey === 'string' ? b.surfaceKey.slice(0, 64) : null;

  try {
    const r = await query(
      `UPDATE expeditions SET
        status = 'completed',
        ended_at = NOW(),
        distance_km = COALESCE($2, distance_km),
        terrain_kcal = COALESCE($3, terrain_kcal),
        surface_key = COALESCE($4, surface_key)
       WHERE id = $1 AND status = 'active'
       RETURNING id, device_id, started_at, ended_at, distance_km, terrain_kcal, surface_key`,
      [expId, distanceKm, terrainKcal, surfaceKey]
    );
    if (r.rows.length === 0) {
      const ex = await query(`SELECT status FROM expeditions WHERE id = $1`, [expId]);
      if (ex.rows.length === 0) return res.status(404).json({ ok: false, error: 'expedition_not_found' });
      return res.status(409).json({ ok: false, error: 'already_finalized', status: ex.rows[0].status });
    }
    liveHub.broadcast(expId, { type: 'expedition_complete', expeditionId: expId });
    res.json({ ok: true, expedition: r.rows[0] });
  } catch (e) {
    if (e.code === 'DB_DISABLED') return db503(res);
    console.error('[v1 complete PATCH]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

router.get('/expeditions/:expeditionId/replay', async function (req, res) {
  if (!isDbEnabled()) return db503(res);
  const expId = req.params.expeditionId;
  if (!expId || !/^[0-9a-f-]{36}$/i.test(expId)) {
    return res.status(400).json({ ok: false, error: 'invalid_expedition_id' });
  }

  try {
    const meta = await query(
      `SELECT id, device_id, started_at, ended_at, distance_km, surface_key, terrain_kcal, status FROM expeditions WHERE id = $1`,
      [expId]
    );
    if (meta.rows.length === 0) return res.status(404).json({ ok: false, error: 'expedition_not_found' });

    const pts = await query(
      `SELECT seq, lat, lng, alt, t_ms, recorded_at FROM expedition_points WHERE expedition_id = $1 ORDER BY seq ASC`,
      [expId]
    );

    res.json({
      ok: true,
      expedition: meta.rows[0],
      points: pts.rows,
    });
  } catch (e) {
    if (e.code === 'DB_DISABLED') return db503(res);
    console.error('[v1 replay GET]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

module.exports = router;
