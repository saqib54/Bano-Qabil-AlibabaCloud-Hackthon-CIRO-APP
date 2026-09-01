const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

/**
 * Real email delivery via any SMTP provider (Gmail app-password, Alibaba
 * DirectMail, SendGrid SMTP…). Returns null until SMTP_HOST **and** SMTP_PASS
 * are set — callers then fall back to the dev-only code echo, so a half
 * configured SMTP (host without password) never breaks OTP login.
 */
function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtp.host || !env.smtp.pass) return null;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined
  });
  return transporter;
}

function isConfigured() {
  return Boolean(env.smtp.host && env.smtp.pass);
}

async function sendOtpEmail({ email, code }) {
  const t = getTransporter();
  if (!t) return false;

  await t.sendMail({
    from: env.smtp.from || '"CIRO Emergency Network" <no-reply@ciro.app>',
    to: email,
    subject: 'Your CIRO sign-in code',
    text:
      `Your CIRO one-time sign-in code is ${code}.\n` +
      'It expires in 10 minutes. If you did not request this, ignore this email.\n' +
      'CIRO — Secure. Connected. Human-led.',
    html:
      `<div style="font-family:Arial,sans-serif;background:#0A1E42;padding:24px">` +
      `<div style="background:#ffffff;border-radius:12px;padding:24px;max-width:420px;margin:auto">` +
      `<h2 style="color:#0A1E42;margin:0">CIRO</h2>` +
      `<p style="color:#334155">Your one-time sign-in code:</p>` +
      `<p style="font-size:28px;font-weight:bold;letter-spacing:8px;color:#2563EB;margin:16px 0">${code}</p>` +
      `<p style="color:#64748b;font-size:12px">Expires in 10 minutes. If you did not request this, ignore this email.</p>` +
      `</div></div>`
  });
  return true;
}

module.exports = { sendOtpEmail, isConfigured };
