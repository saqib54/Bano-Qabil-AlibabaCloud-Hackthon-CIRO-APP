const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const { globalLimiter, sanitizeInput, securityHeaders } = require('./middleware/security.middleware');

const app = express();

// Security & parsing
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'http://localhost:*', 'https:'],
        fontSrc: ["'self'", 'https:'],
        objectSrc: ["'none'"],
        frameSrc: ["'self'", 'https://embed.windy.com']
      }
    }
  })
);
app.use(securityHeaders);
app.use(globalLimiter);

// FRONTEND_URL accepts a comma-separated origin list; "*" reflects any origin
// (needed for mobile WebView apps where the origin is app-specific).
const allowedOrigins = env.frontendUrl.split(',').map((o) => o.trim()).filter(Boolean);
const allowAnyOrigin = allowedOrigins.includes('*');
app.use(
  cors({
    origin: allowAnyOrigin ? true : allowedOrigins,
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
}

// Local upload fallback (Alibaba Cloud OSS used when configured)
fs.mkdirSync(env.uploadDir, { recursive: true });
app.use('/uploads', express.static(env.uploadDir));

// API v1
app.use('/api/v1', apiRoutes);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'CIRO — Crisis Intelligence & Response Orchestrator API',
    data: { docs: '/api/v1/health' }
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
