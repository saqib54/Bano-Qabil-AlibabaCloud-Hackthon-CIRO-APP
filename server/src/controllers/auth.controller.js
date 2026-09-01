const authService = require('../services/auth.service');

async function register(req, res) {
  const session = authService.register(req.body);
  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: session
  });
}

async function login(req, res) {
  const session = authService.login(req.body);
  res.json({
    success: true,
    message: 'Login successful',
    data: session
  });
}

async function google(req, res) {
  const session = await authService.loginWithGoogle(req.body);
  res.json({
    success: true,
    message: 'Google login successful',
    data: session
  });
}

async function otpRequest(req, res) {
  const result = await authService.requestOtp(req.body);
  res.json({
    success: true,
    message: result.sent
      ? 'Verification code sent to your email'
      : 'Verification code generated (dev mode — no SMTP configured)',
    data: result
  });
}

async function otpVerify(req, res) {
  const session = authService.verifyOtp(req.body);
  res.json({
    success: true,
    message: 'Email verified — login successful',
    data: session
  });
}

async function refresh(req, res) {
  const session = authService.refresh(req.body.refreshToken);
  res.json({
    success: true,
    message: 'Tokens refreshed',
    data: session
  });
}

async function logout(req, res) {
  authService.logout(req.body.refreshToken);
  res.json({
    success: true,
    message: 'Logged out successfully',
    data: null
  });
}

async function me(req, res) {
  const user = authService.getCurrentUser(req.user.id);
  res.json({
    success: true,
    message: 'Current user fetched',
    data: user
  });
}

module.exports = { register, login, google, otpRequest, otpVerify, refresh, logout, me };
