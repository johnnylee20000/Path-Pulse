'use strict';

function deviceId(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || '';
}

module.exports = { deviceId };
