// Integration tests for the hack simulation easter egg (js/hack.js).
//
// The simulation is timed theatre, so these tests inject a windowRef whose
// setTimeout fires immediately (0-delay) to run the whole flow synchronously,
// and a lightweight fake renderer that records output lines and feeds scripted
// answers to readLine() prompts. We assert the high-level shape: it installs
// tools, asks for a target, scans, asks for an attack, prints a report, and
// always ends with the "simulation" disclaimer and a restored session.

import { describe, it, expect } from 'vitest';
import { runHack } from '../js/hack.js';

// A fake renderer capturing the simulation's output and answering prompts from
// a scripted queue of lines.
function makeFakeRenderer(answers = []) {
  const lines = [];
  const queue = answers.slice();
  let gatedHistory = [];
  let endSessionCalls = 0;
  return {
    lines,
    gatedHistory,
    appendLine(text, className) {
      const el = { textContent: text == null ? '' : String(text), className };
      lines.push(el);
      return el;
    },
    clearOutput() {
      lines.length = 0;
    },
    scrollToNewest() {},
    setInputGated(enabled) {
      gatedHistory.push(!!enabled);
    },
    readLine() {
      // Resolve immediately with the next scripted answer (or empty string).
      return Promise.resolve(queue.length ? queue.shift() : '');
    },
    endSession() {
      endSessionCalls += 1;
    },
    focusInput() {},
    get endSessionCalls() {
      return endSessionCalls;
    },
  };
}

// A window whose setTimeout runs the callback immediately, so timed stages
// complete without real delays.
const immediateWindow = {
  setTimeout: (fn) => {
    fn();
    return 0;
  },
};

function joinText(renderer) {
  return renderer.lines.map((l) => l.textContent).join('\n');
}

describe('hack simulation', () => {
  it('runs the full flow: installs tools, scans, attacks, and prints a report', async () => {
    const renderer = makeFakeRenderer(['example.com', '1']);
    await runHack({ renderer, windowRef: immediateWindow });

    const text = joinText(renderer);
    // Tool installation stage.
    expect(text).toContain('nmap');
    expect(text).toContain('metasploit-framework');
    // Target recon.
    expect(text).toContain('example.com');
    expect(text).toContain('Nmap');
    // Report + disclaimer.
    expect(text).toContain('ENGAGEMENT REPORT');
    expect(text.toLowerCase()).toContain('simulation');
    // Session restored at the end.
    expect(renderer.endSessionCalls).toBe(1);
  });

  it('aborts cleanly when the target is "abort"', async () => {
    const renderer = makeFakeRenderer(['abort']);
    await runHack({ renderer, windowRef: immediateWindow });

    const text = joinText(renderer);
    expect(text).toContain('aborted');
    // No engagement report is produced on abort.
    expect(text).not.toContain('ENGAGEMENT REPORT');
    expect(renderer.endSessionCalls).toBe(1);
  });

  it('uses a pre-supplied target and skips the first prompt', async () => {
    // Only one answer needed (attack choice) since target is supplied.
    const renderer = makeFakeRenderer(['2']);
    await runHack({ renderer, target: 'victim.io', windowRef: immediateWindow });

    const text = joinText(renderer);
    expect(text).toContain('victim.io');
    expect(text).toContain('ENGAGEMENT REPORT');
  });

  it('defaults to the full exploit chain on an unknown attack choice', async () => {
    const renderer = makeFakeRenderer(['example.com', 'banana']);
    await runHack({ renderer, windowRef: immediateWindow });

    const text = joinText(renderer);
    expect(text).toContain('Full Exploit Chain');
  });

  it('is a no-op when given no usable renderer', async () => {
    await expect(runHack({ renderer: null })).resolves.toBeUndefined();
  });
});
