const http = require('http');

// Ensure schema + demo data exist before serving (ephemeral cloud disks start empty)
require('./database/bootstrap')();

const app = require('./src/app');
const env = require('./src/config/env');

const server = http.createServer(app);

// WebSocket hub — authenticated realtime events land here in Sprint 7.
// Kept ready so the server entry point does not change later.
const { setupWebSocket } = require('./src/websocket');
setupWebSocket(server);

server.listen(env.port, () => {
  console.log(`[ciro] API running on port ${env.port} (${env.nodeEnv})`);
});

module.exports = server;
