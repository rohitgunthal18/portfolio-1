// Property-based test for suggestion-control parity (Feature: terminal-portfolio).
//
// This test implements a single correctness property from design.md (Property 22)
// using fast-check with numRuns >= 100. It exercises the DOM rendering shell
// under jsdom: a TerminalRenderer wired to a fixture mirroring index.html, and
// the suggestion-control wiring from js/controls.js.
//
// Property 22 (design.md): Suggestion controls behave identically to typed
// commands. For any suggestion control (a [data-command] string), activating it
// produces the same command RESULT as interpreting its associated command line
// as if typed and entered.
//
// Approach: for each generated command line, build two fresh, equivalent setups.
//   - Setup A ("typed"): call renderer.submit(cmd) directly, exactly as the
//     Enter-key handler does.
//   - Setup B ("suggestion"): create a [data-command]=cmd chip, wire it with
//     wireSuggestions, and dispatch a real click — the path the renderer uses
//     when a suggestion is activated.
// Both setups start fresh at the home directory, so the echoed prompt matches.
// We then assert the rendered output text is identical and that any side-effects
// (window.open / mailto navigation) are identical.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { TerminalRenderer } from '../js/terminal.js';
import { CommandInterpreter } from '../js/interpreter.js';
import { createCommandRegistry } from '../js/commands.js';
import { FileSystemModel } from '../js/fileSystem.js';
import { CommandHistory } from '../js/history.js';
import { SoundEngine } from '../js/sound.js';
import { PORTFOLIO_FS } from '../js/content.js';
import { CONFIG } from '../js/config.js';
import { wireSuggestions } from '../js/controls.js';

const RUNS = { numRuns: 100 };

// Build a fresh DOM fixture mirroring index.html and a fully wired
// TerminalRenderer over real pure-logic modules. Returns the renderer plus the
// elements and a window stub that records effects (open / mailto navigation).
function makeSetup() {
  document.body.innerHTML = `
    <main id="app">
      <div id="terminal" class="terminal">
        <div id="terminal-output" class="terminal-output"></div>
        <div id="input-line" class="input-line">
          <label id="prompt" class="prompt" for="terminal-input"></label>
          <span class="input-wrap">
            <input id="terminal-input" class="terminal-input" type="text" />
            <span id="cursor" class="cursor"></span>
          </span>
        </div>
      </div>
      <div id="controls" class="controls">
        <p id="hint-bar" class="hint-bar">Type help to get started.</p>
        <div id="suggestions" class="suggestions"></div>
        <button id="sound-toggle" type="button" class="sound-toggle" aria-pressed="false">sound: off</button>
      </div>
    </main>
  `;

  const outputEl = document.getElementById('terminal-output');
  const inputEl = document.getElementById('terminal-input');
  const promptEl = document.getElementById('prompt');
  const container = document.getElementById('terminal');
  const suggestionsEl = document.getElementById('suggestions');

  // Window stub: records open() calls and mailto navigations so the two setups'
  // side-effects can be compared without touching the real jsdom window.
  const openCalls = [];
  const windowStub = {
    open: (url, target, features) => {
      openCalls.push({ url, target, features });
    },
    location: { href: '' },
  };

  const fs = new FileSystemModel(PORTFOLIO_FS);
  const history = new CommandHistory();
  const sound = new SoundEngine({ audioContextProvider: null });
  const registry = createCommandRegistry();
  const interpreter = new CommandInterpreter(registry);

  const renderer = new TerminalRenderer({
    outputEl,
    inputEl,
    promptEl,
    container,
    interpreter,
    fs,
    history,
    sound,
    config: CONFIG,
    getCommandNames: () => Object.keys(registry),
    startMatrix: () => {},
    windowRef: windowStub,
    documentRef: document,
  });
  renderer.init();

  return { renderer, outputEl, suggestionsEl, windowStub, openCalls };
}

// Capture the full rendered output text of a setup.
function outputText(outputEl) {
  return outputEl.textContent;
}

// A representative set of command lines plus a few arbitrary tokens. Each is a
// single data-command string a suggestion chip could carry.
const commandLineArbitrary = fc.oneof(
  fc.constantFrom(
    'help',
    'ls',
    'ls projects',
    'cat about/about.txt',
    'cat contact/contact.txt',
    'pwd',
    'whoami',
    'tree',
    'cv',
    'resume',
    'history',
    'contact hi there',
    'open https://example.com',
    'matrix',
    'sudo rm -rf /',
    'hack',
    'cd projects',
    'clear',
    'boguscmd',
  ),
  // Arbitrary single-token commands (mostly unknown) to broaden the space.
  fc.string({ minLength: 1, maxLength: 12 }).filter((s) => !/\s/.test(s)),
);

// Feature: terminal-portfolio, Property 22: Suggestion controls behave identically to typed commands.
// Validates: Requirements 8.3
describe('Property 22: suggestion controls behave identically to typed commands', () => {
  it('activating a suggestion produces the same output and effects as typing the command', () => {
    fc.assert(
      fc.property(commandLineArbitrary, (cmd) => {
        // Setup A — typed: submit the command exactly as the Enter handler does.
        const a = makeSetup();
        a.renderer.submit(cmd);
        const typedOutput = outputText(a.outputEl);
        const typedOpens = a.openCalls;
        const typedMailto = a.windowStub.location.href;

        // Setup B — suggestion: create a [data-command]=cmd chip, wire it, click.
        const b = makeSetup();
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.setAttribute('data-command', cmd);
        chip.textContent = 'suggestion';
        b.suggestionsEl.appendChild(chip);
        wireSuggestions({ container: b.suggestionsEl, renderer: b.renderer });
        chip.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
        const suggestionOutput = outputText(b.outputEl);
        const suggestionOpens = b.openCalls;
        const suggestionMailto = b.windowStub.location.href;

        // Identical rendered output.
        expect(suggestionOutput).toBe(typedOutput);
        // Identical openUrl side-effects.
        expect(suggestionOpens).toEqual(typedOpens);
        // Identical mailto navigation side-effects.
        expect(suggestionMailto).toBe(typedMailto);
      }),
      RUNS,
    );
  });
});
