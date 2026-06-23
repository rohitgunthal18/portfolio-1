import { describe, it, expect } from 'vitest';

// Smoke test confirming the dev test tooling (Vitest + jsdom) is wired up.
// This file lives under tests/ and is excluded from the deployed static site.
describe('test tooling setup', () => {
  it('runs with jsdom environment available', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
  });

  it('can perform a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });
});
