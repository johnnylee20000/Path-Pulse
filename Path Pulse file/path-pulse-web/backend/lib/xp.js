'use strict';

/**
 * Path-Pulse rank curve (mirrors web app.js level()): floor(0.1 * sqrt(xp)) + 1, capped 1–100.
 */
function levelFromXp(xp) {
  var x = Math.max(0, Math.floor(Number(xp) || 0));
  var lv = Math.floor(0.1 * Math.sqrt(x)) + 1;
  return Math.min(100, Math.max(1, lv));
}

function xpForNextLevel(level) {
  if (level >= 100) return null;
  var L = level + 1;
  var need = Math.ceil(Math.pow((L - 1) / 0.1, 2));
  return need;
}

module.exports = { levelFromXp, xpForNextLevel };
