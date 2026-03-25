'use strict';

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.PG_POOL_MAX || 10),
      ssl:
        process.env.PGSSLMODE === 'require' || process.env.DATABASE_URL.includes('sslmode=require')
          ? { rejectUnauthorized: false }
          : false,
    });
  }
  return pool;
}

function isDbEnabled() {
  return !!getPool();
}

async function query(text, params) {
  const p = getPool();
  if (!p) {
    const err = new Error('DATABASE_URL not configured');
    err.code = 'DB_DISABLED';
    throw err;
  }
  return p.query(text, params);
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, isDbEnabled, query, closePool };
