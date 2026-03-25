'use strict';

const WebSocket = require('ws');
const liveHub = require('../lib/liveHub');

/**
 * Attach WebSocket server at path /ws/live (same HTTP server as Express).
 * Client sends JSON: { "type": "subscribe", "expeditionId": "<uuid>" }
 * Server pushes: points_batch, expedition_complete (see liveHub.broadcast).
 */
function attachLiveWss(httpServer) {
  const wss = new WebSocket.Server({ noServer: true });

  httpServer.on('upgrade', function (req, socket, head) {
    var pathname = '';
    try {
      var host = req.headers.host || 'localhost';
      pathname = new URL(req.url, 'http://' + host).pathname;
    } catch (e) {
      socket.destroy();
      return;
    }
    if (pathname !== '/ws/live') {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, function (ws) {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', function (ws) {
    ws.on('message', function (raw) {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'subscribe' && msg.expeditionId && typeof msg.expeditionId === 'string') {
          if (ws._ppExpeditionId && ws._ppExpeditionId !== msg.expeditionId) {
            liveHub.unsubscribe(ws._ppExpeditionId, ws);
          }
          ws._ppExpeditionId = msg.expeditionId;
          liveHub.subscribe(msg.expeditionId, ws);
          ws.send(JSON.stringify({ type: 'subscribed', expeditionId: msg.expeditionId }));
        }
      } catch (e) {}
    });

    ws.on('close', function () {
      if (ws._ppExpeditionId) liveHub.unsubscribe(ws._ppExpeditionId, ws);
    });

    ws.on('error', function () {});
  });

  return wss;
}

module.exports = { attachLiveWss };
