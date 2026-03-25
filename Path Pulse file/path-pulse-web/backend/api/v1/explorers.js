'use strict';

const express = require('express');
const { query, isDbEnabled } = require('../../lib/db');
const { levelFromXp, xpForNextLevel } = require('../../lib/xp');
const { deviceId } = require('../../lib/sanitize');

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

router.get('/:deviceId/profile', async function (req, res) {
  if (!isDbEnabled()) return db503(res);
  const id = deviceId(req.params.deviceId);
  if (!id) return res.status(400).json({ ok: false, error: 'invalid_device_id' });
  try {
    await ensureExplorer(id);
    const r = await query(
      `SELECT e.xp, e.created_at, e.game_progress,
              p.weight_kg, p.height_m, p.age, p.is_male, p.bmi, p.body_composition, p.updated_at AS profile_updated_at
       FROM explorers e
       LEFT JOIN explorer_profiles p ON p.device_id = e.device_id
       WHERE e.device_id = $1`,
      [id]
    );
    const row = r.rows[0];
    const xp = row.xp;
    const level = levelFromXp(xp);
    res.json({
      ok: true,
      deviceId: id,
      xp,
      level,
      xpForNextLevel: xpForNextLevel(level),
      gameProgress: row.game_progress && typeof row.game_progress === 'object' ? row.game_progress : {},
      profile: {
        weightKg: row.weight_kg,
        heightM: row.height_m,
        age: row.age,
        isMale: row.is_male,
        bmi: row.bmi,
        bodyComposition: row.body_composition || {},
        updatedAt: row.profile_updated_at,
      },
      createdAt: row.created_at,
    });
  } catch (e) {
    if (e.code === 'DB_DISABLED') return db503(res);
    console.error('[v1 profile GET]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

router.put('/:deviceId/profile', express.json({ limit: '64kb' }), async function (req, res) {
  if (!isDbEnabled()) return db503(res);
  const id = deviceId(req.params.deviceId);
  if (!id) return res.status(400).json({ ok: false, error: 'invalid_device_id' });
  const b = req.body || {};
  const weightKg = b.weightKg != null ? Number(b.weightKg) : null;
  const heightM = b.heightM != null ? Number(b.heightM) : null;
  const age = b.age != null ? parseInt(b.age, 10) : null;
  const isMale = typeof b.isMale === 'boolean' ? b.isMale : null;
  let bmi = b.bmi != null ? Number(b.bmi) : null;
  if (bmi == null && weightKg > 0 && heightM > 0) {
    bmi = weightKg / (heightM * heightM);
  }
  var comp = b.bodyComposition;
  if (comp !== undefined && (comp === null || typeof comp !== 'object' || Array.isArray(comp))) {
    return res.status(400).json({ ok: false, error: 'bodyComposition_must_be_object' });
  }
  if (comp === undefined) comp = null;
  var gameProgress = b.gameProgress;
  if (
    gameProgress !== undefined &&
    (gameProgress === null || typeof gameProgress !== 'object' || Array.isArray(gameProgress))
  ) {
    return res.status(400).json({ ok: false, error: 'gameProgress_must_be_object' });
  }

  try {
    await ensureExplorer(id);
    if (comp === null) {
      await query(
        `INSERT INTO explorer_profiles (device_id, weight_kg, height_m, age, is_male, bmi, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (device_id) DO UPDATE SET
           weight_kg = COALESCE(EXCLUDED.weight_kg, explorer_profiles.weight_kg),
           height_m = COALESCE(EXCLUDED.height_m, explorer_profiles.height_m),
           age = COALESCE(EXCLUDED.age, explorer_profiles.age),
           is_male = COALESCE(EXCLUDED.is_male, explorer_profiles.is_male),
           bmi = COALESCE(EXCLUDED.bmi, explorer_profiles.bmi),
           updated_at = NOW()`,
        [id, weightKg, heightM, isNaN(age) ? null : age, isMale, bmi]
      );
    } else {
      await query(
        `INSERT INTO explorer_profiles (device_id, weight_kg, height_m, age, is_male, bmi, body_composition, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
         ON CONFLICT (device_id) DO UPDATE SET
           weight_kg = COALESCE(EXCLUDED.weight_kg, explorer_profiles.weight_kg),
           height_m = COALESCE(EXCLUDED.height_m, explorer_profiles.height_m),
           age = COALESCE(EXCLUDED.age, explorer_profiles.age),
           is_male = COALESCE(EXCLUDED.is_male, explorer_profiles.is_male),
           bmi = COALESCE(EXCLUDED.bmi, explorer_profiles.bmi),
           body_composition = EXCLUDED.body_composition,
           updated_at = NOW()`,
        [id, weightKg, heightM, isNaN(age) ? null : age, isMale, bmi, JSON.stringify(comp)]
      );
    }
    if (gameProgress !== undefined) {
      await query(`UPDATE explorers SET game_progress = $2::jsonb, updated_at = NOW() WHERE device_id = $1`, [
        id,
        JSON.stringify(gameProgress),
      ]);
    }
    const r = await query(`SELECT xp FROM explorers WHERE device_id = $1`, [id]);
    const xp = r.rows[0].xp;
    res.json({ ok: true, deviceId: id, xp, level: levelFromXp(xp) });
  } catch (e) {
    if (e.code === 'DB_DISABLED') return db503(res);
    console.error('[v1 profile PUT]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

router.post('/:deviceId/xp', express.json({ limit: '8kb' }), async function (req, res) {
  if (!isDbEnabled()) return db503(res);
  const id = deviceId(req.params.deviceId);
  if (!id) return res.status(400).json({ ok: false, error: 'invalid_device_id' });
  const b = req.body || {};
  const delta = b.delta != null ? Math.floor(Number(b.delta)) : null;
  const set = b.set != null ? Math.floor(Number(b.set)) : null;
  if (delta == null && set == null) {
    return res.status(400).json({ ok: false, error: 'need_delta_or_set' });
  }

  try {
    await ensureExplorer(id);
    let row;
    if (set != null) {
      const s = Math.max(0, set);
      const r = await query(
        `UPDATE explorers SET xp = $2, updated_at = NOW() WHERE device_id = $1 RETURNING xp`,
        [id, s]
      );
      row = r.rows[0];
    } else {
      const r = await query(
        `UPDATE explorers SET xp = GREATEST(0, xp + $2), updated_at = NOW() WHERE device_id = $1 RETURNING xp`,
        [id, delta]
      );
      row = r.rows[0];
    }
    const xp = row.xp;
    const level = levelFromXp(xp);
    res.json({ ok: true, deviceId: id, xp, level, xpForNextLevel: xpForNextLevel(level) });
  } catch (e) {
    if (e.code === 'DB_DISABLED') return db503(res);
    console.error('[v1 xp POST]', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

module.exports = router;
