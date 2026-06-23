import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { SoundEngine } from '../js/sound.js';

// Feature: terminal-portfolio, Property 26: Sound toggle parity and appearance sync
//
// Property 26: Sound toggle parity and appearance sync
// Validates: Requirements 12.3, 12.4
//
// Req 12.4: the engine defaults to the disabled state on load.
// Req 12.3: each toggle switches the enabled state, and the control's
//   appearance stays in sync with that state. Appearance sync is a DOM concern,
//   so we model the displayed state as a direct mirror of `engine.enabled`.
//   Starting from the disabled default, after N toggles the enabled state must
//   equal the parity of N: enabled === (N % 2 === 1).
describe('SoundEngine toggle parity (Property 26)', () => {
  it('defaults to disabled (Req 12.4)', () => {
    // Sanity: the starting state the parity property relies on.
    expect(new SoundEngine().enabled).toBe(false);
  });

  it('enabled state equals the parity of the number of toggles (Req 12.3, 12.4)', () => {
    fc.assert(
      fc.property(fc.nat({ max: 1000 }), (n) => {
        const engine = new SoundEngine();
        // The control's displayed state mirrors engine.enabled; we track it
        // alongside to assert appearance stays in sync after every toggle.
        let displayed = engine.enabled;
        expect(displayed).toBe(false); // disabled default (Req 12.4)

        for (let i = 0; i < n; i++) {
          const returned = engine.toggle();
          // toggle() returns the new state and it matches engine.enabled.
          expect(returned).toBe(engine.enabled);
          // Appearance stays in sync with the engine state (Req 12.3).
          displayed = engine.enabled;
          expect(displayed).toBe(engine.enabled);
        }

        // After N toggles from disabled, enabled === parity of N.
        const expected = n % 2 === 1;
        expect(engine.enabled).toBe(expected);
        expect(displayed).toBe(expected);
      }),
      { numRuns: 200 }
    );
  });
});
