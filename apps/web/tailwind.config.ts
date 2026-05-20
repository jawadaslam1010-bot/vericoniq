import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Semantic surfaces (read CSS vars) ─────────────────────────────
        page:             'var(--page)',
        surface:          'var(--surface)',
        'border-soft':    'var(--border-soft)',
        hover:            'var(--hover)',
        'header-cell':    'var(--header-cell)',

        // ── Text ──────────────────────────────────────────────────────────
        ink: {
          DEFAULT: 'var(--ink)',
          soft:    'var(--ink-soft)',
        },
        muted:  'var(--muted)',
        faint:  'var(--faint)',

        // ── Status colours — use these everywhere, never ad-hoc colours ───
        'status-met': {
          bg:     '#ecfdf3',
          text:   '#0a6a3a',
          border: '#bdebcd',
          dot:    '#16a34a',
        },
        'status-risk': {
          bg:     '#fffaeb',
          text:   '#854d0e',
          border: '#fde68a',
          dot:    '#d97706',
        },
        'status-breach': {
          bg:     '#fef2f2',
          text:   '#9b1c1c',
          border: '#fecaca',
          dot:    '#dc2626',
        },
        'status-stale': {
          bg:     '#f4f2ed',
          text:   '#5a564f',
          border: '#e3dfd5',
          dot:    '#9c9789',
        },
        'status-info': {
          bg:     '#eff6ff',
          text:   '#1e40af',
          border: '#bfdbfe',
          dot:    '#3b82f6',
        },

        // ── Brand ─────────────────────────────────────────────────────────
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          hover:      'var(--primary-hover)',
          50:         'var(--primary-50)',
          100:        'var(--primary-100)',
          200:        'var(--primary-200)',
          soft:       'var(--primary-soft)',
          foreground: 'hsl(var(--primary-foreground))',
        },

        // ── shadcn tokens (keep for compatibility) ─────────────────────────
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },

      fontFamily: {
        sans:  ['var(--font-dm-sans)',  'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-dm-serif)', 'Georgia', 'serif'],
        mono:  ['var(--font-mono)',     'ui-monospace', 'JetBrains Mono', 'monospace'],
      },

      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm:      'var(--radius-sm)',
        md:      'var(--radius)',
        lg:      'var(--radius-lg)',
      },

      boxShadow: {
        sm:      'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        hero:    'var(--shadow-hero)',
      },

      letterSpacing: {
        eyebrow: '0.11em',
        wider2:  '0.14em',
      },

      transitionDuration: {
        180: '180ms',
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
