export const theme = {
  colors: {
    // Backgrounds
    bg: {
      primary: '#0A0E1A',
      secondary: '#0F1422',
      surface: '#141927',
      card: '#1C2333',
      border: '#252D3D',
      borderLight: '#2D3748',
    },
    // Severity
    severity: {
      critical: { bg: '#3D0A0F', border: '#FF2D55', text: '#FF2D55', light: '#FF4466' },
      high:     { bg: '#3D2200', border: '#FF9500', text: '#FF9500', light: '#FFAA33' },
      medium:   { bg: '#3D3000', border: '#FFCC00', text: '#FFCC00', light: '#FFD633' },
      low:      { bg: '#0D3D1E', border: '#34C759', text: '#34C759', light: '#4CD964' },
    },
    // Status
    status: {
      success: '#00D084',
      error: '#FF3B30',
      warning: '#FF9500',
      info: '#4A9EFF',
      pending: '#8892A4',
    },
    // Agent colors
    agents: {
      agent1: '#4A9EFF',  // blue
      agent2: '#BF5AF2',  // purple
      agent3: '#FF9500',  // orange
      agent4: '#00D084',  // green
    },
    // Text
    text: {
      primary: '#FFFFFF',
      secondary: '#C8D0E0',
      muted: '#8892A4',
      disabled: '#4A5568',
    }
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 6, md: 8, lg: 12, xl: 16, full: 999 },
  fonts: {
    sizes: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 28, display: 36 },
    weights: { regular: '400', medium: '500', semibold: '600', bold: '700' }
  }
};

// For backward compatibility with App.js and existing components
export const getColors = (mode = 'dark') => {
  // Currently the app is primarily dark-themed based on the request
  return {
    primary: theme.colors.severity.critical.text,
    background: theme.colors.bg.primary,
    card: theme.colors.bg.card,
    surface: theme.colors.bg.surface,
    border: theme.colors.bg.border,
    text: theme.colors.text.primary,
    textMuted: theme.colors.text.muted,
    ...theme.colors.status,
    ...theme.colors.bg,
  };
};

export default theme;
