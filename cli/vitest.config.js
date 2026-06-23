import { defineConfig } from 'vitest/config';

// Dev-only test configuration. This file (and the tests/ directory) are not part
// of the deployed static site — the deployed surface remains plain HTML/CSS/JS
// with no build step (Requirement 15).
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.{test,spec}.{js,mjs}'],
    globals: true,
  },
});
