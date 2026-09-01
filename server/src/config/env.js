require('dotenv').config();
const path = require('path');

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  jwt: {
    secret: process.env.JWT_SECRET || 'ciro-insecure-dev-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'ciro-insecure-dev-refresh-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  databasePath: path.resolve(
    __dirname,
    '..',
    '..',
    process.env.DATABASE_PATH || './database/ciro.sqlite'
  ),

  dashscope: {
    apiKey: process.env.DASHSCOPE_API_KEY || '',
    baseUrl: process.env.DASHSCOPE_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    textModel: process.env.QWEN_TEXT_MODEL || 'qwen-plus',
    visionModel: process.env.QWEN_VISION_MODEL || 'qwen-vl-plus'
  },

  weather: {
    apiKey: process.env.WEATHER_API_KEY || '',
    pointForecastKey: process.env.POINT_FORECAST_API_KEY || ''
  },

  maps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || ''
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || ''
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'alibaba-cloud-hackthon'
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || ''
  },

  oss: {
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    bucket: process.env.OSS_BUCKET || '',
    region: process.env.OSS_REGION || ''
  },

  uploadDir: path.resolve(__dirname, '..', '..', 'uploads'),

  get isProduction() {
    return this.nodeEnv === 'production';
  }
};

module.exports = env;
