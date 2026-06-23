// Entry point for the Terminal Portfolio.
//
// This module wires the pure logic core (FileSystemModel, CommandHistory,
// SoundEngine, command registry, CommandInterpreter) to the DOM rendering shell
// (TerminalRenderer, BootSequence, matrix animation) and the subordinate
// hybrid-GUI controls (suggestion chips, sound toggle, hint bar).
//
// End-to-end flow wired here (Req 1.1, 1.3, 2.1, 2.2, 2.3):
//   1. BootSequence plays the typed startup log, then renders the ASCII
//      "PORTFOLIO" banner + welcome message (input is gated/disabled while it
//      runs; any key/click skips it).
//   2. On boot completion, TerminalRenderer.init() renders the live prompt and
//      attaches input listeners, and the input is focused.
//   3. Typed commands (and suggestion chips) run through the interpreter; the
//      renderer applies effects (openUrl, clear, mailto, startMatrix).
//
// Static-deployment constraints honored (Req 15.1, 15.3): plain ES modules, no
// framework and no build step; nothing here requires a server runtime.
//
// IMPORTANT: importing this module must NOT touch the DOM. All DOM/window
// access happens inside `bootstrap()`, which auto-runs only when a real
// document is present (browser). This keeps the module importable under node
// for smoke checks/tests without crashing.

import { CONFIG } from './config.js';
import { PORTFOLIO_FS } from './content.js';
import { FileSystemModel } from './fileSystem.js';
import { CommandHistory } from './history.js';
import { SoundEngine } from './sound.js';
import { createCommandRegistry } from './commands.js';
import { CommandInterpreter } from './interpreter.js';
import { TerminalRenderer } from './terminal.js';
import { BootSequence } from './boot.js';
import { startMatrix as startMatrixAnimation } from './matrix.js';
import { complete } from './completion.js';

/**
 * Look up the terminal DOM elements by id from the given document.
 * @param {Document} doc
 * @returns {{
 *   terminalEl: HTMLElement | null,
 *   outputEl: HTMLElement | null,
 *   inputEl: HTMLInputElement | null,
 *   promptEl: HTMLElement | null,
 *   hintEl: HTMLElement | null,
 *   suggestionsEl: HTMLElement | null,
 *   soundToggleEl: HTMLElement | null
 * }}
 */
function lookupElements(doc) {
  return {
    terminalEl: doc.getElementById('terminal'),
    outputEl: doc.getElementById('terminal-output'),
    inputEl: doc.getElementById('terminal-input'),
    promptEl: doc.getElementById('prompt'),
  };
}

/**
 * Instantiate and wire every module, run the boot sequence, and expose the live
 * terminal. Safe to call once per document.
 *
 * @param {Document} [rootDocument] - The document to bootstrap against. Defaults
 *   to the global `document`. Accepting it as a parameter makes the function
 *   testable under jsdom without relying on globals.
 * @returns {object | undefined} A handle with the wired instances (useful for
 *   tests), or undefined when no document is available.
 */
export function bootstrap(rootDocument) {
  const doc =
    rootDocument || (typeof document !== 'undefined' ? document : undefined);
  if (!doc || typeof doc.getElementById !== 'function') {
    // No DOM (e.g. node import smoke check): do nothing.
    return undefined;
  }

  const {
    terminalEl,
    outputEl,
    inputEl,
    promptEl,
  } = lookupElements(doc);

  // --- Pure logic core -------------------------------------------------------
  const fs = new FileSystemModel(PORTFOLIO_FS);
  const history = new CommandHistory();
  const sound = new SoundEngine(); // default disabled (Req 12.4)
  const registry = createCommandRegistry();
  const interpreter = new CommandInterpreter(registry);

  // --- DOM rendering shell ---------------------------------------------------
  // The startMatrix callback launches the matrix overlay on the terminal
  // surface and refocuses the prompt when it stops (Req 11.1, 11.2).
  const renderer = new TerminalRenderer({
    outputEl,
    inputEl,
    promptEl,
    container: terminalEl,
    interpreter,
    fs,
    history,
    sound,
    completion: complete,
    config: CONFIG,
    getCommandNames: () => Object.keys(registry),
    startMatrix: () =>
      startMatrixAnimation({
        container: terminalEl,
        onStop: () => renderer.focusInput(),
      }),
    // Stream command output line-by-line with a trailing cursor for the
    // real-terminal text-generation feel (auto-scrolls as it renders).
    animate: true,
    streamDelayMs: 18,
    // Use the real browser window (default) so window.open / location work in
    // production; documentRef defaults to outputEl.ownerDocument.
  });

  // --- Boot sequence (runs first; gates input until complete/skipped) --------
  let removeSkip = () => {};

  const boot = new BootSequence({
    outputEl,
    inputEl,
    onComplete: () => {
      // Remove the one-shot skip listeners now that boot is done.
      removeSkip();
      // Render the prompt + attach input listeners after the banner/welcome so
      // the echoed boot output stays above the live prompt (Req 1.1).
      renderer.init();
      renderer.focusInput();
    },
  });

  // One-shot skip trigger: any keydown or click during boot jumps to the prompt
  // (Req 2.4). Listeners are removed in onComplete (also covers the skip path,
  // since skip() -> _finish() -> onComplete()).
  const skipHandler = () => {
    if (!boot.done) boot.skip();
  };
  if (typeof doc.addEventListener === 'function') {
    doc.addEventListener('keydown', skipHandler, { once: false });
    doc.addEventListener('click', skipHandler, { once: false });
    removeSkip = () => {
      doc.removeEventListener('keydown', skipHandler);
      doc.removeEventListener('click', skipHandler);
    };
  }

  boot.start();

  return {
    fs,
    history,
    sound,
    registry,
    interpreter,
    renderer,
    boot,
    teardown: () => {
      removeSkip();
      renderer.destroy();
    },
  };
}

// Auto-run in a browser environment. Guarded so importing in node (e.g. the
// smoke check or unit tests) does not execute any DOM code.
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bootstrap(document), {
      once: true,
    });
  } else {
    bootstrap(document);
  }
}
