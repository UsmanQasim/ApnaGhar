/**
 * Tailwind v4 is a PostCSS plugin; there is no tailwind.config.js. The theme
 * lives in CSS — see app/globals.css, which pulls the @theme block generated
 * from @ghar/ui's design tokens.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
