// Matrix Delivery Design System Theme Configuration

export const theme = {
  colors: {
    primary: {
      green: '#00FF41',
      cyan: '#00F0FF',
      purple: '#B026FF',
      pink: '#FF2E97'
    },
    dark: {
      bg: '#0A0E14',
      surface: '#131820',
      elevated: '#1A1F2E',
      border: '#2A3142'
    },
    semantic: {
      success: '#00FF41',
      warning: '#FFB800',
      error: '#FF2E63',
      info: '#00F0FF'
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#A0AEC0',
      muted: '#64748B'
    }
  },
  typography: {
    fontFamily: {
      primary: 'Inter, system-ui, sans-serif',
      mono: 'JetBrains Mono, monospace'
    },
    sizes: {
      display: '3.75rem',
      h1: '3rem',
      h2: '2.25rem',
      h3: '1.875rem',
      h4: '1.5rem',
      bodyLarge: '1.125rem',
      body: '1rem',
      bodySmall: '0.875rem',
      caption: '0.75rem'
    },
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem'    // 64px
  },
  borderRadius: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(0, 255, 65, 0.3)',
    strong: '0 0 30px rgba(0, 255, 65, 0.4)'
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms'
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out'
    }
  }
};

export type Theme = typeof theme;
