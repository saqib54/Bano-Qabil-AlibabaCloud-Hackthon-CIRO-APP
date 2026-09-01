const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');

/**
 * Storage service — local disk in development, Alibaba Cloud OSS in
 * production when OSS_* env vars are configured (wired in Sprint 3+).
 * Only URLs/keys are stored in the database, never binaries (§5).
 */
const incidentUploadDir = path.join(env.uploadDir, 'incidents');
fs.mkdirSync(incidentUploadDir, { recursive: true });
const avatarUploadDir = path.join(env.uploadDir, 'avatars');
fs.mkdirSync(avatarUploadDir, { recursive: true });

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, incidentUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Only jpg, jpeg, png and webp images are allowed'), { statusCode: 400 }));
  }
};

const uploadIncidentImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE }
}).single('image');

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});

const uploadAvatarImage = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: MAX_AVATAR_SIZE }
}).single('avatar');

module.exports = { uploadIncidentImage, uploadAvatarImage, ALLOWED_MIME, MAX_SIZE };
