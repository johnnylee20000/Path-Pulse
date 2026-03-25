'use strict';

const explorers = require('./explorers');
const expeditions = require('./expeditions');
const { isDbEnabled, query } = require('../../lib/db');

function mountV1(app) {
  app.get('/api/v1/health', async function (req, res) {
    const out = {
      ok: true,
      service: 'path-pulse-v1',
      database: { configured: isDbEnabled() },
    };
    if (isDbEnabled()) {
      try {
        await query('SELECT 1');
        out.database.ready = true;
      } catch (e) {
        out.database.ready = false;
        out.database.error = String(e.message || e);
      }
    }
    res.json(out);
  });

  app.use('/api/v1/explorers', explorers);
  app.use('/api/v1', expeditions);
}

module.exports = { mountV1 };
