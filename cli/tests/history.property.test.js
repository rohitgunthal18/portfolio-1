import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CommandHistory } from '../js/history.js';

// These property tests target the pure CommandHistory core. They align with the
// actual push() implementation: a line is recorded iff it is a string whose
// trimmed value is non-empty, and the ORIGINAL (untrimmed) line is stored.

// An arbitrary that intelligently exercises push()'s filter: a mix of empty
// strings, whitespace-only strings (trimmed-empty -> ignored), and strings that
// are guaranteed non-blank (-> recorded). This spans both sides of the filter.
const submittedLineArb = fc.oneof(
  fc.constant(''),
  fc.constantFrom(' ', '  ', '\t', '\n', ' \t \n '), // whitespace-only -> ignored
  fc.string(), // arbitrary; may be blank or not
  fc.string().filter((s) => s.trim() !== '') // guaranteed recorded
);

// A line that push() always records (trimmed value is non-empty).
const recordedLineArb = fc.string().filter((s) => s.trim() !== '');

// Feature: terminal-portfolio, Property 13: history equals the ordered list of submitted non-empty lines
//
// Property 13: For any sequence of submitted command lines (mix of empty and
// non-empty strings), history.entries() equals exactly the subsequence of
// non-empty (trimmed) submitted lines, in submission order.
// Validates: Requirements 5.4, 6.4
describe('CommandHistory ordering (Property 13)', () => {
  it('entries() equals the subsequence of submitted lines whose trimmed value is non-empty', () => {
    fc.assert(
      fc.property(fc.array(submittedLineArb, { maxLength: 50 }), (submitted) => {
        const history = new CommandHistory();
        for (const line of submitted) {
          history.push(line);
        }

        // Expected: keep, in order, exactly the lines push() records — those
        // whose trimmed value is non-empty — preserving their original value.
        const expected = submitted.filter((l) => l.trim() !== '');

        expect(history.entries()).toEqual(expected);
      }),
      { numRuns: 200 }
    );
  });
});

// Feature: terminal-portfolio, Property 14: history navigation is an inverse round-trip with boundary clearing
//
// Property 14: For any non-empty history, pressing Up (previous) then Down
// (next) returns to the prior input value; repeatedly pressing Up walks entries
// newest-to-oldest (clamping at the oldest); and pressing Down past the most
// recent entry yields '' (empty input).
// Validates: Requirements 6.1, 6.2, 6.3
describe('CommandHistory navigation round-trip (Property 14)', () => {
  it('Up then Down returns to the prior (fresh) input value', () => {
    fc.assert(
      fc.property(fc.array(recordedLineArb, { minLength: 1, maxLength: 30 }), (entries) => {
        const history = new CommandHistory();
        for (const line of entries) history.push(line);

        // After push() the cursor sits past the newest entry: the prior input
        // value is the fresh/empty line ''.
        const up = history.previous(); // Up: recall newest entry
        expect(up).toBe(entries[entries.length - 1]);

        const down = history.next(); // Down: step back past newest
        expect(down).toBe(''); // returns to the prior (empty) input value
      }),
      { numRuns: 200 }
    );
  });

  it('repeatedly pressing Up walks entries newest-to-oldest and clamps at the oldest', () => {
    fc.assert(
      fc.property(fc.array(recordedLineArb, { minLength: 1, maxLength: 30 }), (entries) => {
        const history = new CommandHistory();
        for (const line of entries) history.push(line);

        const n = entries.length;
        // Press Up n + 3 times; the i-th press (1-indexed) recalls
        // entries[max(n - i, 0)], clamping at the oldest entry.
        for (let i = 1; i <= n + 3; i++) {
          const value = history.previous();
          const expectedIndex = Math.max(n - i, 0);
          expect(value).toBe(entries[expectedIndex]);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('pressing Down past the most recent entry yields an empty input', () => {
    fc.assert(
      fc.property(fc.array(recordedLineArb, { minLength: 1, maxLength: 30 }), (entries) => {
        const history = new CommandHistory();
        for (const line of entries) history.push(line);

        // Recall the newest entry, then step Down past it.
        history.previous();
        expect(history.next()).toBe('');

        // Staying past the newest entry keeps yielding '' (idempotent boundary).
        expect(history.next()).toBe('');
      }),
      { numRuns: 200 }
    );
  });

  it('empty history: previous() yields null', () => {
    // Boundary sanity for the navigation contract on an empty history.
    const history = new CommandHistory();
    expect(history.previous()).toBe(null);
  });
});
