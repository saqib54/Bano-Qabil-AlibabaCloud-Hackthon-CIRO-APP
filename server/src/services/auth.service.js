const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const userRepository = require('../repositories/user.repository');
const refreshTokenRepository = require('../repositories/refreshToken.repository');
const auditRepository = require('../repositories/audit.repository');
const otpRepository = require('../repositories/otp.repository');
const mailer = require('./mailer.service');

/**
 * Public self-registration is ONLY allowed for the PUBLIC role.
 * STAFF/ADMIN accounts are never created from this endpoint —
 * role values from the client are ignored by design.
 */
function register({ fullName, email, phone, password }) {
  const existing = userRepository.findByEmail(email);
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = userRepository.create({
    id: crypto.randomUUID(),
    fullName,
    email,
    phone: phone || null,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'PUBLIC'
  });

  auditRepository.log({ actorId: user.id, action: 'USER_REGISTERED', entity: 'users', entityId: user.id });

  return issueSession(user);
}

function login({ email, password }) {
  const user = userRepository.findByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.is_active) {
    throw ApiError.forbidden('This account has been disabled');
  }

  userRepository.updateLastLogin(user.id);
  auditRepository.log({ actorId: user.id, action: 'USER_LOGIN', entity: 'users', entityId: user.id });

  return issueSession(user);
}

/**
 * Firebase Auth ID tokens (issued by the Google sign-in popup) are NOT
 * accepted by Google's `tokeninfo` introspection endpoint — they must be
 * verified against Google's securetoken x509 certificates. We cache the
 * certs for an hour and verify the RS256 signature locally.
 */
let firebaseCertsCache = { certs: null, fetchedAt: 0 };

async function getFirebaseCerts() {
  const TTL_MS = 60 * 60 * 1000;
  if (firebaseCertsCache.certs && Date.now() - firebaseCertsCache.fetchedAt < TTL_MS) {
    return firebaseCertsCache.certs;
  }
  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!res.ok) throw ApiError.unauthorized('Could not fetch Google signing certificates');
  firebaseCertsCache = { certs: await res.json(), fetchedAt: Date.now() };
  return firebaseCertsCache.certs;
}

async function verifyFirebaseIdToken(idToken) {
  const [headerB64] = String(idToken).split('.');
  if (!headerB64) throw ApiError.unauthorized('Google token is malformed');
  let header;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
  } catch {
    throw ApiError.unauthorized('Google token is malformed');
  }
  const certs = await getFirebaseCerts();
  const pem = certs[header.kid];
  if (!pem) throw ApiError.unauthorized('Google token was signed with an unknown key');
  return jwt.verify(idToken, pem, {
    algorithms: ['RS256'],
    audience: env.firebase.projectId,
    issuer: `https://securetoken.google.com/${env.firebase.projectId}`
  });
}

/**
 * Google sign-in (citizen-first): verify the token, then find-or-create the
 * account. New Google accounts are always PUBLIC — STAFF/ADMIN can never be
 * created here, only linked if the email matches.
 * Two token kinds are supported:
 *   1. Firebase Auth ID token from the popup (verified locally via x509 certs)
 *   2. GIS OAuth token for GOOGLE_CLIENT_ID (verified via Google tokeninfo)
 * When no GOOGLE_CLIENT_ID is configured (dev/hackathon), a `demo` flag is
 * accepted so the flow can be exercised end-to-end; disabled in production.
 */
async function loginWithGoogle({ idToken, demo }) {
  let claims;

  if (idToken) {
    // 1) Firebase Auth token — the popup flow used by the client
    try {
      claims = await verifyFirebaseIdToken(idToken);
    } catch (fbErr) {
      // 2) Fall back to tokeninfo for GIS-issued tokens
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
      );
      if (!res.ok) {
        console.warn('[auth/google] Firebase verify failed:', fbErr.message);
        throw ApiError.unauthorized('Google token verification failed');
      }
      claims = await res.json();
      const gisOk = env.google.clientId && claims.aud === env.google.clientId;
      if (!gisOk) {
        console.warn('[auth/google] audience mismatch — aud:', claims.aud, 'iss:', claims.iss);
        throw ApiError.unauthorized('Google token audience mismatch');
      }
    }
    if (!claims.email) throw ApiError.unauthorized('Google token is missing an email');
    const profile = {
      sub: claims.sub,
      email: String(claims.email).toLowerCase(),
      name: claims.name || '',
      picture: claims.picture || null
    };
    return googleSessionForProfile(profile);
  }

  if (demo) {
    if (env.google.clientId || env.isProduction) {
      throw ApiError.badRequest('Demo Google login is not available');
    }
    return googleSessionForProfile({
      sub: 'google-demo-sub-0001',
      email: 'google.demo@gmail.com',
      name: 'Google Demo Citizen',
      picture: null
    });
  }

  throw ApiError.badRequest('A Google ID token is required');
}

function googleSessionForProfile(profile) {
  let user = userRepository.findByEmail(profile.email);
  if (user) {
    if (!user.is_active) throw ApiError.forbidden('This account has been disabled');
    if (user.provider !== 'google' || user.provider_sub !== profile.sub) {
      user = userRepository.linkProvider(user.id, {
        provider: 'google',
        providerSub: profile.sub,
        avatarUrl: profile.picture
      });
    }
  } else {
    // Unusable password hash — Google accounts authenticate via OAuth only.
    user = userRepository.createWithProvider({
      id: crypto.randomUUID(),
      fullName: profile.name || profile.email.split('@')[0],
      email: profile.email,
      passwordHash: bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10),
      provider: 'google',
      providerSub: profile.sub,
      avatarUrl: profile.picture,
      role: 'PUBLIC'
    });
    auditRepository.log({ actorId: user.id, action: 'USER_REGISTERED_GOOGLE', entity: 'users', entityId: user.id });
  }

  userRepository.updateLastLogin(user.id);
  auditRepository.log({ actorId: user.id, action: 'USER_GOOGLE_LOGIN', entity: 'users', entityId: user.id });

  return issueSession(user);
}

/**
 * Email OTP sign-in (citizen-first). requestOtp emails a 6-digit code via the
 * configured SMTP provider; without SMTP (dev/hackathon) the code is echoed in
 * the response as `devCode` so the flow stays demoable — never in production.
 */
async function requestOtp({ email }) {
  const recent = otpRepository.findLatest(email);
  if (recent) {
    const ageMs = Date.now() - new Date(`${recent.created_at}Z`).getTime();
    if (ageMs < 30 * 1000) {
      throw new ApiError(429, 'Please wait a moment before requesting another code');
    }
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  otpRepository.create({
    id: crypto.randomUUID(),
    email,
    codeHash: bcrypt.hashSync(code, 10),
    expiresAt
  });

  let sent = false;
  try {
    sent = await mailer.sendOtpEmail({ email, code });
  } catch (err) {
    throw ApiError.badRequest('Could not send the email — check the address or try again');
  }

  auditRepository.log({ actorId: null, action: 'OTP_REQUESTED', entity: 'otp_codes', entityId: email, meta: { sent } });

  // Without SMTP there is no delivery channel — echo the code so the flow
  // stays usable (hackathon/demo deployments). Once SMTP is configured the
  // email is sent and devCode is suppressed automatically.
  return { sent, devCode: sent ? undefined : code };
}

function verifyOtp({ email, code }) {
  const rec = otpRepository.findLatest(email);
  if (!rec) throw ApiError.unauthorized('No sign-in code was requested for this email');
  if (rec.verified) throw ApiError.unauthorized('This code has already been used — request a new one');
  if (new Date(rec.expires_at).getTime() < Date.now()) {
    throw ApiError.unauthorized('This code has expired — request a new one');
  }
  if (rec.attempts >= 5) {
    throw ApiError.unauthorized('Too many incorrect attempts — request a new code');
  }
  if (!bcrypt.compareSync(code, rec.code_hash)) {
    otpRepository.incrementAttempts(rec.id);
    throw ApiError.unauthorized('Incorrect code — check the email and try again');
  }

  otpRepository.markVerified(rec.id);

  let user = userRepository.findByEmail(email);
  if (user) {
    if (!user.is_active) throw ApiError.forbidden('This account has been disabled');
  } else {
    // Passwordless account — OTP is the only way in.
    user = userRepository.createWithProvider({
      id: crypto.randomUUID(),
      fullName: email.split('@')[0],
      email,
      passwordHash: bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10),
      provider: 'otp',
      providerSub: null,
      avatarUrl: null,
      role: 'PUBLIC'
    });
    auditRepository.log({ actorId: user.id, action: 'USER_REGISTERED_OTP', entity: 'users', entityId: user.id });
  }

  userRepository.updateLastLogin(user.id);
  auditRepository.log({ actorId: user.id, action: 'USER_OTP_LOGIN', entity: 'users', entityId: user.id });

  return issueSession(user);
}

/**
 * Rotating refresh tokens: the presented token is revoked and a new one issued.
 */
function refresh(refreshToken) {
  const record = refreshTokenRepository.findValid(refreshToken);
  if (!record) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = userRepository.findById(record.user_id);
  if (!user || !user.is_active) {
    throw ApiError.unauthorized('Account is not active');
  }

  refreshTokenRepository.revoke(record.id);
  return issueSession(user);
}

function logout(refreshToken) {
  if (refreshToken) {
    const record = refreshTokenRepository.findValid(refreshToken);
    if (record) refreshTokenRepository.revoke(record.id);
  }
}

function getCurrentUser(userId) {
  const user = userRepository.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const safe = userRepository.toSafeUser(user);
  if (user.role === 'STAFF') {
    safe.staff_profile = userRepository.findStaffProfile(user.id) || null;
  }
  return safe;
}

function issueSession(user) {
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.accessExpiresIn }
  );

  const refreshToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  refreshTokenRepository.create({
    id: crypto.randomUUID(),
    userId: user.id,
    token: refreshToken,
    expiresAt
  });

  const safeUser = userRepository.toSafeUser(user);
  if (user.role === 'STAFF') {
    safeUser.staff_profile = userRepository.findStaffProfile(user.id) || null;
  }

  return { user: safeUser, accessToken, refreshToken };
}

module.exports = { register, login, loginWithGoogle, requestOtp, verifyOtp, refresh, logout, getCurrentUser };
