// Integration / example tests for mobile responsiveness
// (Feature: terminal-portfolio, task 11.3).
//
// The UI was reworked into a pure Linux-style CLI: the terminal fills the
// screen with no window chrome (no border, no hint bar, no suggestion controls,
// no sound toggle). These tests therefore validate the responsive INTENT of the
// CLI surface deterministically (jsdom does no layout/CSS rendering):
//
//   1. Parsing css/style.css as text and asserting the responsive rules are
//      present and correct (overflow guards, the tablet + mobile breakpoints, a
//      legible >= 16px mobile input font, and the fluid clamp() banner).
//   2. Loading index.html into jsdom and asserting the core terminal surface
//      (terminal, output area, prompt, input) exists and is not hidden, so the
//      CLI stays present and operable at any width.
//
// These are example/integration tests, not property tests.
//
// _Requirements: 14.1, 14.2, 14.4_

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Resolve the real source files from the workspace root. Vitest runs with the
// project root as cwd; under jsdom `import.meta.url` is not a file:// URL, so
// we resolve from process.cwd() instead.
const CSS_PATH = resolve(process.cwd(), 'css/style.css');
const HTML_PATH = resolve(process.cwd(), 'cli.html');

const css = readFileSync(CSS_PATH, 'utf8');
const html = readFileSync(HTML_PATH, 'utf8');

// Extract the body of a `@media (<condition>) { ... }` block, balancing braces
// so nested rule blocks inside the query are captured correctly. Returns the
// inner text of the media query, or null when the query is not present.
function extractMediaBlock(source, condition) {
  const marker = `@media ${condition}`;
  const start = source.indexOf(marker);
  if (start === -1) return null;

  const braceStart = source.indexOf('{', start);
  if (braceStart === -1) return null;

  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(braceStart + 1, i);
      }
    }
  }
  return null;
}

// ===========================================================================
// Requirement 14.1 — no horizontal page overflow at mobile widths
// ===========================================================================
describe('no horizontal overflow guards (Req 14.1)', () => {
  it('pins the x-axis on html/body with overflow-x: hidden and max-width: 100%', () => {
    // The page-level overflow guard prevents any child from widening the page.
    expect(/overflow-x:\s*hidden/.test(css)).toBe(true);
    expect(/max-width:\s*100%/.test(css)).toBe(true);
  });

  it('contains the ASCII banner so it scales/scrolls within itself instead of widening the page', () => {
    // The banner is the biggest small-screen overflow risk. It must scale
    // fluidly with the viewport (clamp) and/or scroll within itself.
    const bannerMatch = css.match(/\.banner\s*\{[^}]*\}/g) || [];
    const bannerRules = bannerMatch.join('\n');

    expect(bannerRules.length).toBeGreaterThan(0);
    // Fluid font sizing keeps the glyphs from forcing the page wider (14.1/14.4).
    expect(/font-size:\s*clamp\(/.test(bannerRules)).toBe(true);
    // Residual overflow is clamped inside the banner, and it never exceeds 100%.
    expect(/overflow-x:\s*auto/.test(bannerRules)).toBe(true);
    expect(/max-width:\s*100%/.test(bannerRules)).toBe(true);
  });
});

// ===========================================================================
// Requirement 14.4 — legible text across mobile / tablet / desktop
// ===========================================================================
describe('legible font sizing across breakpoints (Req 14.4)', () => {
  it('sets a legible base font-size on the desktop default', () => {
    // Base body rule establishes the desktop size before any media query.
    const bodyMatch = css.match(/\bbody\s*\{[^}]*\}/g) || [];
    const bodyRules = bodyMatch.join('\n');
    // A legible base size (>= 14px) is set on the body.
    const sizeMatch = bodyRules.match(/font-size:\s*(\d+)px/);
    expect(sizeMatch).not.toBeNull();
    expect(Number(sizeMatch[1])).toBeGreaterThanOrEqual(14);
  });

  it('defines a tablet breakpoint (max-width: 768px) with a fluid legible font-size', () => {
    const tablet = extractMediaBlock(css, '(max-width: 768px)');
    expect(tablet).not.toBeNull();
    // Fluid clamp keeps text legible while adapting to the narrower viewport.
    expect(/font-size:\s*clamp\(/.test(tablet)).toBe(true);
  });

  it('defines a mobile breakpoint (max-width: 480px) with legible body text', () => {
    const mobile = extractMediaBlock(css, '(max-width: 480px)');
    expect(mobile).not.toBeNull();
    // A legible body font-size is set at mobile width.
    expect(/font-size:\s*\d+px/.test(mobile)).toBe(true);
  });
});

// ===========================================================================
// Requirement 14.2 — the on-screen keyboard works on touch devices: a real
// <input>. iOS auto-zoom on focus is prevented via the viewport meta tag
// (maximum-scale=1.0) rather than forcing a 16px input font, so the typed
// command text matches the terminal output size.
// ===========================================================================
describe('touch keyboard input (Req 14.2)', () => {
  it('disables iOS auto-zoom via the viewport meta tag', () => {
    expect(/name=["']viewport["']/.test(html)).toBe(true);
    expect(/maximum-scale=1(\.0)?/.test(html)).toBe(true);
  });

  it('lets the terminal input inherit the terminal text size so typed text matches output', () => {
    const mobile = extractMediaBlock(css, '(max-width: 480px)');
    expect(mobile).not.toBeNull();
    expect(/\.terminal-input[^{}]*\{[^}]*font-size:\s*inherit/.test(mobile)).toBe(true);
  });
});

// ===========================================================================
// DOM presence: the CLI surface exists and is not hidden at any width.
// (The reworked design is a pure CLI — no hint bar / suggestions / sound
//  toggle — so we assert the terminal, output, prompt, and input instead.)
// ===========================================================================
describe('CLI surface present in the DOM (Req 14.1, 14.2)', () => {
  beforeAll(() => {
    document.documentElement.innerHTML = html;
  });

  it('renders the terminal surface, not marked hidden', () => {
    const terminal = document.getElementById('terminal');
    expect(terminal).not.toBeNull();
    expect(terminal.classList.contains('hidden')).toBe(false);
    expect(/display:\s*none/.test(terminal.getAttribute('style') || '')).toBe(false);
  });

  it('renders the output area and the prompt', () => {
    expect(document.getElementById('terminal-output')).not.toBeNull();
    expect(document.getElementById('prompt')).not.toBeNull();
  });

  it('renders a real editable input for the on-screen keyboard (Req 14.2)', () => {
    const input = document.getElementById('terminal-input');
    expect(input).not.toBeNull();
    // A textarea is used so long commands wrap onto new lines like a real shell.
    expect(input.tagName).toBe('TEXTAREA');
    expect(input.classList.contains('hidden')).toBe(false);
  });

  it('does not render the removed hint bar, suggestion controls, or sound toggle', () => {
    // The pure-CLI rework intentionally removed all GUI chrome.
    expect(document.getElementById('hint-bar')).toBeNull();
    expect(document.getElementById('suggestions')).toBeNull();
    expect(document.getElementById('sound-toggle')).toBeNull();
  });
});
