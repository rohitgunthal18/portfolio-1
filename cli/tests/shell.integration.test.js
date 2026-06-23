// Integration / example tests for the DOM rendering shell
// (Feature: terminal-portfolio, task 10.6).
//
// These tests exercise the rendering shell under jsdom against a fixture that
// mirrors index.html: TerminalRenderer, BootSequence, MatrixAnimation, and the
// hybrid-GUI control wiring (suggestions + sound toggle). They use the real
// pure-logic modules (FileSystemModel, CommandInterpreter, CommandHistory,
// SoundEngine) — no mocks — and inject window/document so window.open /
// location effects are observable.
//
// Covers: boot gating + skip, focus-on-click, echo of entered line,
// scroll-to-newest, suggestion controls present for about/projects/contact,
// matrix start/stop, and the sound toggle control.
//
// _Requirements: 1.1, 1.5, 1.6, 2.4, 8.2, 11.2, 12.2_

import { describe, it, expect, beforeEach } from 'vitest';

import { TerminalRenderer } from '../js/terminal.js';
import { BootSequence } from '../js/boot.js';
import { MatrixAnimation, startMatrix } from '../js/matrix.js';
import { CommandInterpreter } from '../js/interpreter.js';
import { createCommandRegistry } from '../js/commands.js';
import { FileSystemModel } from '../js/fileSystem.js';
import { CommandHistory } from '../js/history.js';
import { SoundEngine } from '../js/sound.js';
import { PORTFOLIO_FS } from '../js/content.js';
import { CONFIG } from '../js/config.js';
import { wireSuggestions, wireSoundToggle } from '../js/controls.js';

// Build the DOM fixture mirroring index.html. Includes suggestion chips for
// about/projects/contact (plus cv/help) and a sound toggle.
function buildFixture() {
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
        <div id="suggestions" class="suggestions" role="group">
          <button type="button" class="chip" data-command="cat about/about.txt">about</button>
          <button type="button" class="chip" data-command="ls projects">projects</button>
          <button type="button" class="chip" data-command="cat contact/contact.txt">contact</button>
          <button type="button" class="chip" data-command="cv">cv</button>
          <button type="button" class="chip" data-command="help">help</button>
        </div>
        <button id="sound-toggle" type="button" class="sound-toggle" aria-pressed="false">sound: off</button>
      </div>
    </main>
  `;
  return {
    outputEl: document.getElementById('terminal-output'),
    inputEl: document.getElementById('terminal-input'),
    promptEl: document.getElementById('prompt'),
    container: document.getElementById('terminal'),
    suggestionsEl: document.getElementById('suggestions'),
    toggleEl: document.getElementById('sound-toggle'),
  };
}

// Build a fully wired TerminalRenderer over real pure-logic modules. A window
// stub records open() calls and mailto navigations.
function makeRenderer(els) {
  const openCalls = [];
  const windowStub = {
    open: (url, target, features) => openCalls.push({ url, target, features }),
    location: { href: '' },
  };

  const fs = new FileSystemModel(PORTFOLIO_FS);
  const history = new CommandHistory();
  const sound = new SoundEngine({ audioContextProvider: null });
  const registry = createCommandRegistry();
  const interpreter = new CommandInterpreter(registry);

  let matrixStarted = false;
  const renderer = new TerminalRenderer({
    outputEl: els.outputEl,
    inputEl: els.inputEl,
    promptEl: els.promptEl,
    container: els.container,
    interpreter,
    fs,
    history,
    sound,
    config: CONFIG,
    getCommandNames: () => Object.keys(registry),
    startMatrix: () => {
      matrixStarted = true;
    },
    windowRef: windowStub,
    documentRef: document,
  });
  renderer.init();

  return { renderer, fs, history, sound, openCalls, windowStub, isMatrixStarted: () => matrixStarted };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

// ===========================================================================
// Boot gating + skip (Req 2.4)
// ===========================================================================
describe('BootSequence gating and skip', () => {
  it('disables input during boot and re-enables it on completion', async () => {
    const els = buildFixture();
    let completed = false;
    const boot = new BootSequence({
      outputEl: els.outputEl,
      inputEl: els.inputEl,
      typingDelayMs: 0,
      windowRef: window,
      documentRef: document,
      onComplete: () => {
        completed = true;
      },
    });

    const promise = boot.start();
    // Input is gated (disabled) while the boot animation is playing.
    expect(els.inputEl.disabled).toBe(true);

    await promise;

    // After completion: input ungated, onComplete fired, banner + welcome shown.
    expect(els.inputEl.disabled).toBe(false);
    expect(completed).toBe(true);
    expect(boot.done).toBe(true);
    // The ASCII banner spells "PORTFOLIO" (carried as the <pre> aria-label).
    const banner = els.outputEl.querySelector('pre.banner');
    expect(banner).not.toBeNull();
    expect(banner.getAttribute('aria-label')).toBe('PORTFOLIO');
    expect(els.outputEl.textContent).toContain("Type 'help'");
  });

  it('skip() immediately renders banner + welcome and ungates input', () => {
    const els = buildFixture();
    // Use a long delay so nothing completes on its own; skip() must drive it.
    const boot = new BootSequence({
      outputEl: els.outputEl,
      inputEl: els.inputEl,
      typingDelayMs: 100000,
      windowRef: window,
      documentRef: document,
    });

    boot.start();
    expect(els.inputEl.disabled).toBe(true);

    boot.skip();

    expect(boot.done).toBe(true);
    expect(els.inputEl.disabled).toBe(false);
    const banner = els.outputEl.querySelector('pre.banner');
    expect(banner).not.toBeNull();
    expect(banner.getAttribute('aria-label')).toBe('PORTFOLIO');
    expect(els.outputEl.textContent).toContain("Type 'help'");
  });
});

// ===========================================================================
// Focus-on-click (Req 1.6)
// ===========================================================================
describe('focus-on-click', () => {
  it('clicking the terminal focuses the command input', () => {
    const els = buildFixture();
    makeRenderer(els);

    // Ensure focus is not already on the input.
    els.inputEl.blur();
    expect(document.activeElement).not.toBe(els.inputEl);

    els.container.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(document.activeElement).toBe(els.inputEl);
  });
});

// ===========================================================================
// Echo of entered line (Req 1.1 / shell behavior)
// ===========================================================================
describe('command echo', () => {
  it('submit() appends a line containing the prompt and the typed command', () => {
    const els = buildFixture();
    const { renderer } = makeRenderer(els);

    const prompt = renderer.promptText();
    renderer.submit('help');

    const echoLine = els.outputEl.querySelector('.line.echo');
    expect(echoLine).not.toBeNull();
    expect(echoLine.textContent).toContain(prompt);
    expect(echoLine.textContent).toContain('help');
  });
});

// ===========================================================================
// Scroll-to-newest (Req 1.5)
// ===========================================================================
describe('scroll-to-newest', () => {
  it('submitting a command updates scrollTop to a number without throwing', () => {
    const els = buildFixture();
    const { renderer } = makeRenderer(els);

    expect(() => renderer.submit('ls')).not.toThrow();
    // jsdom reports scrollHeight as 0, but scrollTop must be set to a number.
    expect(typeof els.container.scrollTop).toBe('number');
    expect(els.container.scrollTop).toBe(els.container.scrollHeight);
  });
});

// ===========================================================================
// Suggestion controls present for about/projects/contact (Req 8.2, 8.3)
// ===========================================================================
describe('suggestion controls', () => {
  it('provides suggestion chips for about, projects, and contact', () => {
    const els = buildFixture();
    const commands = Array.from(els.suggestionsEl.querySelectorAll('[data-command]')).map(
      (el) => el.getAttribute('data-command'),
    );
    // At least the required sections are represented.
    expect(commands.some((c) => c.includes('about'))).toBe(true);
    expect(commands.some((c) => c.includes('projects'))).toBe(true);
    expect(commands.some((c) => c.includes('contact'))).toBe(true);
  });

  it('clicking the about chip runs its command and renders about content', () => {
    const els = buildFixture();
    const { renderer } = makeRenderer(els);
    wireSuggestions({ container: els.suggestionsEl, renderer });

    const aboutChip = els.suggestionsEl.querySelector('[data-command="cat about/about.txt"]');
    expect(aboutChip).not.toBeNull();

    aboutChip.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const text = els.outputEl.textContent;
    // The echoed command is present...
    expect(text).toContain('cat about/about.txt');
    // ...and the about content was rendered.
    expect(text).toContain('Rohit Balasaheb Gunthal');
  });
});

// ===========================================================================
// Matrix start/stop (Req 11.1, 11.2)
// ===========================================================================
describe('matrix animation start/stop', () => {
  it('startMatrix sets isRunning true; a keydown stops it, fires onStop, removes overlay', () => {
    const els = buildFixture();
    let stopped = false;
    const animation = startMatrix({
      container: els.container,
      windowRef: window,
      documentRef: document,
      onStop: () => {
        stopped = true;
      },
    });

    expect(animation.isRunning()).toBe(true);
    expect(els.container.querySelector('.matrix-overlay')).not.toBeNull();

    // Any key press stops the animation and returns to the prompt.
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a' }));

    expect(animation.isRunning()).toBe(false);
    expect(stopped).toBe(true);
    expect(els.container.querySelector('.matrix-overlay')).toBeNull();
  });

  it('the matrix command emits a startMatrix effect handled by the renderer', () => {
    const els = buildFixture();
    const { renderer, isMatrixStarted } = makeRenderer(els);
    renderer.submit('matrix');
    expect(isMatrixStarted()).toBe(true);
  });
});

// ===========================================================================
// Sound toggle control (Req 12.2, 12.3)
// ===========================================================================
describe('sound toggle control', () => {
  it('starts off, toggles on, then back off, keeping appearance in sync', () => {
    const els = buildFixture();
    const sound = new SoundEngine({ audioContextProvider: null });
    wireSoundToggle({ toggleEl: els.toggleEl, sound });

    // Initial appearance reflects the default disabled state (Req 12.4).
    expect(sound.enabled).toBe(false);
    expect(els.toggleEl.textContent).toBe('sound: off');
    expect(els.toggleEl.getAttribute('aria-pressed')).toBe('false');

    // First click enables sound and updates the control.
    els.toggleEl.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(sound.enabled).toBe(true);
    expect(els.toggleEl.textContent).toBe('sound: on');
    expect(els.toggleEl.getAttribute('aria-pressed')).toBe('true');

    // Second click disables sound again.
    els.toggleEl.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(sound.enabled).toBe(false);
    expect(els.toggleEl.textContent).toBe('sound: off');
    expect(els.toggleEl.getAttribute('aria-pressed')).toBe('false');
  });
});
