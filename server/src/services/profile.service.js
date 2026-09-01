const userRepository = require('../repositories/user.repository');
const auditRepository = require('../repositories/audit.repository');

/** Only these preference keys may be stored on the account. */
const PREFS_WHITELIST = ['theme', 'lang', 'defaultCity', 'onboarding'];

const profileService = {
  getProfile(userId) {
    const user = userRepository.findById(userId);
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    const safe = userRepository.toSafeUser(user);
    const staffProfile = user.role === 'STAFF' ? userRepository.findStaffProfile(userId) : null;
    return staffProfile ? { ...safe, staff_profile: staffProfile } : safe;
  },

  updateProfile(userId, { fullName, phone, avatarUrl }) {
    if (fullName !== undefined && fullName.trim().length < 2) {
      throw Object.assign(new Error('Full name must be at least 2 characters'), { status: 400 });
    }
    const before = userRepository.findById(userId);
    const updated = userRepository.updateProfile(userId, { fullName, phone, avatarUrl });
    const safe = userRepository.toSafeUser(updated);

    // Log change
    const changes = {};
    if (fullName !== undefined && fullName !== before.full_name) changes.full_name = { from: before.full_name, to: fullName };
    if (phone !== undefined && phone !== before.phone) changes.phone = { from: before.phone, to: phone };
    if (Object.keys(changes).length > 0) {
      auditRepository.log({
        actorId: userId, action: 'PROFILE_UPDATE', entity: 'user', entityId: userId,
        newValue: JSON.stringify(changes)
      });
    }

    return safe;
  },

  /**
   * Merge account preferences (theme, language, …). Preferences follow the
   * account, so logging in on any device restores the citizen's choices.
   */
  updatePrefs(userId, incoming) {
    const user = userRepository.findById(userId);
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    let current = {};
    try { current = JSON.parse(user.prefs || '{}'); } catch { current = {}; }

    const merged = { ...current };
    for (const key of PREFS_WHITELIST) {
      if (incoming && incoming[key] !== undefined) merged[key] = String(incoming[key]).slice(0, 50);
    }

    const updated = userRepository.updatePrefs(userId, merged);
    return userRepository.toSafeUser(updated);
  },

  /** Record terms/consent acceptance — idempotent, keeps the first date. */
  acceptTerms(userId) {
    const updated = userRepository.acceptTerms(userId);
    auditRepository.log({
      actorId: userId, action: 'TERMS_ACCEPTED', entity: 'users', entityId: userId
    });
    return userRepository.toSafeUser(updated);
  }
};

module.exports = profileService;
