const profileService = require('../services/profile.service');
const asyncHandler = require('../utils/asyncHandler');
const { uploadAvatarImage } = require('../services/storage.service');

const getProfile = asyncHandler(async (req, res) => {
  const profile = profileService.getProfile(req.user.id);
  res.json({ success: true, message: 'Profile loaded', data: profile });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, avatarUrl } = req.body;
  const updated = profileService.updateProfile(req.user.id, { fullName, phone, avatarUrl });
  res.json({ success: true, message: 'Profile updated', data: updated });
});

/** PATCH /users/prefs — merge account preferences (theme, lang, …) */
const updatePrefs = asyncHandler(async (req, res) => {
  const updated = profileService.updatePrefs(req.user.id, req.body.prefs || {});
  res.json({ success: true, message: 'Preferences saved', data: updated });
});

/** POST /users/terms/accept — record terms & consent acceptance */
const acceptTerms = asyncHandler(async (req, res) => {
  const updated = profileService.acceptTerms(req.user.id);
  res.json({ success: true, message: 'Terms accepted', data: updated });
});

/** Multer middleware wrapped so validation errors surface consistently. */
const parseAvatarUpload = (req, res, next) => {
  uploadAvatarImage(req, res, (err) => {
    if (err) {
      err.statusCode = err.statusCode || (err.code === 'LIMIT_FILE_SIZE' ? 400 : 500);
      if (err.code === 'LIMIT_FILE_SIZE') err.message = 'Photo too large — maximum size is 2 MB';
      return next(err);
    }
    next();
  });
};

/** POST /users/profile/avatar — upload a profile picture */
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please choose an image file', data: null });
  }
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const updated = profileService.updateProfile(req.user.id, { avatarUrl });
  res.json({ success: true, message: 'Profile photo updated', data: updated });
});

module.exports = { getProfile, updateProfile, updatePrefs, acceptTerms, parseAvatarUpload, uploadAvatar };
