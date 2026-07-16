import type { Config } from 'tailwindcss'

/**
 * Design tokens — migrated to the Stitch "Modern Professional" system.
 *
 * Strategy: the LEGACY brand token NAMES (`primary`, `dark`, `accent`,
 * `primary-subtle`, `offWhite`) are kept but their VALUES are remapped to the
 * new deep-forest-green palette. This way every existing `bg-primary`,
 * `text-dark`, `bg-offWhite` etc. across all ~27 pages instantly adopts the new
 * look WITHOUT touching each component.
 *
 * The Material-3 semantic tokens (`brand`, `surface`, `on-surface`, …) used by
 * the redesigned landing page live alongside and are unchanged.
 */
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ---- Legacy names, remapped to the new forest-green palette ---- */
        primary: {
          DEFAULT: '#064e3b', // deep forest green — primary buttons / actions / links
          light: '#0b6e52', // lighter forest — hover lifts, gradients
          subtle: '#e6f3ed', // soft mint tint — chips, info notes, badges bg
        },
        dark: {
          DEFAULT: '#003527', // deepest green — sidebars, button hover, headings
          mid: '#064e3b', // mid forest — badge text on subtle bg
        },
        accent: {
          DEFAULT: '#b45309', // amber-700 — legible as text (verified/featured)
          light: '#f59e0b', // amber-500 — design tertiary accent
          subtle: '#fffbeb', // amber-50 — soft amber backgrounds
        },
        // Crisp cool off-white page background (DESIGN.md: #F8FAFC)
        offWhite: '#f8fafc',

        /* ------------------------------------------------------------------ *
         * Material-3 semantic tokens — used by the redesigned landing page and
         * available for new Stitch-styled pages.
         * `brand` is the design's near-black forest "primary" (#003527).
         * ------------------------------------------------------------------ */
        brand: {
          DEFAULT: '#003527', // design: primary
          container: '#064e3b', // design: primary-container
          fg: '#80bea6', // design: on-primary-container
        },
        surface: '#f8f9ff',
        'on-surface': '#0b1c30',
        'on-surface-variant': '#404944',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#eff4ff',
        'surface-container': '#e5eeff',
        'surface-container-high': '#dce9ff',
        'secondary-container': '#d9e6dd',
        outline: '#707974',
        'outline-variant': '#bfc9c3',
        tertiary: '#442800',
        'on-tertiary': '#ffffff',
        'tertiary-gold': '#f69f0d', // design: on-tertiary-container
        error: '#ba1a1a',
      },
      fontFamily: {
        // Whole app now uses Hanken Grotesk (DESIGN.md: "across all roles").
        // `display`, `body`, and `hanken` all resolve to the same family so no
        // component needs to change its `font-display` / `font-body` class.
        display: ['var(--font-hanken)', 'sans-serif'],
        body: ['var(--font-hanken)', 'sans-serif'],
        hanken: ['var(--font-hanken)', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        // "Ambient depth" — soft, diffused shadows per the design system.
        sm: '0 1px 2px rgba(11,28,48,.05), 0 1px 3px rgba(11,28,48,.04)',
        md: '0 4px 12px rgba(11,28,48,.06), 0 2px 4px rgba(11,28,48,.04)',
        lg: '0 12px 32px rgba(11,28,48,.10), 0 4px 12px rgba(11,28,48,.05)',
        card: '0 4px 20px rgba(11,28,48,.06), 0 1px 2px rgba(11,28,48,.04)',
      },
      maxWidth: {
        container: '1280px',
        'container-max': '1280px',
      },
    },
  },
  plugins: [],
}

export default config
