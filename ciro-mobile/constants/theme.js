export const lightTheme = {
  colors: {
    bg: {
      primary: '#F5F7FA',
      secondary: '#EBEEF3',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      border: '#D1D9E6',
      borderLight: '#E2E8F0',
    },
    severity: {
      critical: { bg: '#FFE5E8', border: '#FF2D55', text: '#CC0022', light: '#FF4466' },
      high:     { bg: '#FFF3E0', border: '#FF9500', text: '#CC6600', light: '#FFAA33' },
      medium:   { bg: '#FFFDE7', border: '#F5C400', text: '#997A00', light: '#FFD633' },
      low:      { bg: '#E8F5E9', border: '#34C759', text: '#1B7A36', light: '#4CD964' },
    },
    status: {
      success: '#00A86B',
      error: '#FF3B30',
      warning: '#FF9500',
      info: '#0066CC',
      pending: '#6B7280',
    },
    agents: {
      agent1: '#0066CC',
      agent2: '#7B2FBE',
      agent3: '#CC6600',
      agent4: '#00A86B',
    },
    text: {
      primary: '#0A0E1A',
      secondary: '#374151',
      muted: '#6B7280',
      disabled: '#9CA3AF',
    }
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 6, md: 8, lg: 12, xl: 16, full: 999 },
  fonts: {
    sizes: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 28, display: 36 },
    weights: { regular: '400', medium: '500', semibold: '600', bold: '700' }
  }
};

export const darkTheme = {
  colors: {
    bg: {
      primary: '#0A0E1A',
      secondary: '#0F1422',
      surface: '#141927',
      card: '#1C2333',
      border: '#252D3D',
      borderLight: '#2D3748',
    },
    severity: {
      critical: { bg: '#3D0A0F', border: '#FF2D55', text: '#FF2D55', light: '#FF4466' },
      high:     { bg: '#3D2200', border: '#FF9500', text: '#FF9500', light: '#FFAA33' },
      medium:   { bg: '#3D3000', border: '#FFCC00', text: '#FFCC00', light: '#FFD633' },
      low:      { bg: '#0D3D1E', border: '#34C759', text: '#34C759', light: '#4CD964' },
    },
    status: {
      success: '#00D084',
      error: '#FF3B30',
      warning: '#FF9500',
      info: '#4A9EFF',
      pending: '#8892A4',
    },
    agents: {
      agent1: '#4A9EFF',
      agent2: '#BF5AF2',
      agent3: '#FF9500',
      agent4: '#00D084',
    },
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

export const theme = darkTheme; // Default export for compatibility if needed
export default theme;
