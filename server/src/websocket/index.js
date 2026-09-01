const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/** Active WebSocket connections keyed by userId. */
const clients = new Map();

/**
 * Sprint 1: WebSocket server authenticates connections via access token.
 * Sprint 7: Role-filtered event broadcasting.
 */
function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (socket, req) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      const payload = token ? jwt.verify(token, env.jwt.secret) : null;

      if (!payload) {
        socket.close(4401, 'Unauthorized');
        return;
      }

      socket.userId = payload.sub;
      socket.role = payload.role;
      socket.isAlive = true;

      // Register client
      if (!clients.has(socket.userId)) clients.set(socket.userId, new Set());
      clients.get(socket.userId).add(socket);

      socket.on('pong', () => { socket.isAlive = true; });

      socket.on('close', () => {
        const userSockets = clients.get(socket.userId);
        if (userSockets) {
          userSockets.delete(socket);
          if (userSockets.size === 0) clients.delete(socket.userId);
        }
      });

      socket.send(
        JSON.stringify({ type: 'connection.established', role: payload.role })
      );
    } catch (_err) {
      socket.close(4401, 'Unauthorized');
    }
  });

  // Heartbeat to prune dead connections
  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.isAlive === false) return socket.terminate();
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  return wss;
}

/**
 * Send an event to a specific user by ID.
 */
function sendToUser(userId, event) {
  const userSockets = clients.get(userId);
  if (!userSockets) return 0;
  const payload = JSON.stringify(event);
  let sent = 0;
  for (const socket of userSockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
      sent++;
    }
  }
  return sent;
}

/**
 * Broadcast an event to all connected users with a specific role.
 */
function broadcastToRole(role, event) {
  const payload = JSON.stringify(event);
  let sent = 0;
  for (const [, userSockets] of clients) {
    for (const socket of userSockets) {
      if (socket.readyState === WebSocket.OPEN && socket.role === role) {
        socket.send(payload);
        sent++;
      }
    }
  }
  return sent;
}

/**
 * Broadcast an event to all connected users regardless of role.
 */
function broadcastToAll(event) {
  const payload = JSON.stringify(event);
  let sent = 0;
  for (const [, userSockets] of clients) {
    for (const socket of userSockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
        sent++;
      }
    }
  }
  return sent;
}

module.exports = { setupWebSocket, sendToUser, broadcastToRole, broadcastToAll };
