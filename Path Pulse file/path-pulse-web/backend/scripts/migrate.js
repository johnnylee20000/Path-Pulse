'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const client = new Client({ connectionString: url, ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : false });
  await client.connect();
  try {
    await client.query(sql);
    console.log('Schema applied:', schemaPath);
  } finally {
    await client.end();
  }
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
