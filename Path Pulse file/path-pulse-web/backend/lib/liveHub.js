'use strict';

/**
 * In-memory pub/sub for expedition live points (scale-out: replace with Redis pub/sub).
 */
const rooms = new Map(); // expeditionId -> Set<WebSocket>

function subscribe(expeditionId, ws) {
  if (!expeditionId || !ws) return;
  if (!rooms.has(expeditionId)) rooms.set(expeditionId, new Set());
  rooms.get(expeditionId).add(ws);
}

function unsubscribe(expeditionId, ws) {
  const set = rooms.get(expeditionId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) rooms.delete(expeditionId);
}

function unsubscribeAll(ws) {
  rooms.forEach(function (set, id) {
    set.delete(ws);
    if (set.size === 0) rooms.delete(id);
  });
}

function broadcast(expeditionId, payload) {
  const set = rooms.get(expeditionId);
  if (!set) return;
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  set.forEach(function (ws) {
    if (ws.readyState === 1) {
      try {
        ws.send(data);
      } catch (e) {}
    }
  });
}

module.exports = { subscribe, unsubscribe, unsubscribeAll, broadcast };
