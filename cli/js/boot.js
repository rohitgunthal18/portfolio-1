// BootSequence — the animated startup for the Terminal Portfolio.
//
// This is part of the DOM rendering shell described in design.md
// ("BootSequence"). It plays startup lines with a sequential typing animation,
// renders the ASCII-art "PORTFOLIO" banner, then a welcome message directing
// the visitor to type `help`, and finally signals readiness so the interactive
// prompt can be enabled (Req 2.1–2.4).
//
// While the animation plays, command input is gated (disabled) so commands
// cannot interleave with boot output (design.md "Boot input gating"). A skip()
// hook — invoked by any key/click/button during boot — immediately renders the
// remaining output, ungates input, and signals readiness. skip() is idempotent
// and clears any pending timers, so there are no leaks or stuck states
// (design.md "Animation lifecycle").
//
// IMPORTANT: importing this module must NOT touch the DOM or schedule timers.
// All DOM/timer access happens inside start()/skip(), which are only called
// after construction with real elements (or jsdom elements/timers in tests).
//
// Loaded as an ES module ("type": "module").

/**
 * ASCII-art banner spelling "PORTFOLIO" (Req 2.2). Kept as a multi-line string
 * constant that renders cleanly in a monospaced font.
 */
export const BANNER = String.raw`
 ____   ___  ____ _____ _____ ___  _     ___ ___
|  _ \ / _ \|  _ \_   _|  ___/ _ \| |   |_ _/ _ \
| |_) | | | | |_) || | | |_ | | | | |    | | | | |
|  __/| |_| |  _ < | | |  _|| |_| | |___ | | |_| |
|_|    \___/|_| \_\|_| |_|   \___/|_____|___\___/
`;

/**
 * Default startup lines played before the banner (Req 2.1). These mimic a
 * Linux-style boot log to set the cybersecurity/terminal tone.
 */
export const DEFAULT_BOOT_LINES = [
  'Booting portfolio.os v1.0.0 ...',
  'Initializing kernel modules ............ [ OK ]',
  'Mounting /Portfolio~ filesystem ........ [ OK ]',
  'Starting command interpreter ........... [ OK ]',
  'Loading portfolio content .............. [ OK ]',
  'Establishing secure session ............ [ OK ]',
  'Boot complete.',
];

/**
 * The welcome message lines shown after the banner (Req 2.3). Directs the
 * visitor to type `help`.
 */
export const WELCOME_LINES = [
  '',
  "Welcome to Rohit Gunthal's interactive terminal portfolio.",
  "Type 'help' to see the list of available commands.",
  "New to terminals? Type 'gui' (or use the GUI Portfolio button) for the full website.",
  '',
];

/**
 * Plays the typed startup animation, renders the ASCII banner and welcome
 * message, gates command input until done, and exposes a skip() hook.
 */
export class BootSequence {
  /**
   * @param {object} deps
   * @param {HTMLElement} deps.outputEl      - Container the boot lines + banner are appended to (e.g. #terminal-output).
   * @param {HTMLInputElement} [deps.inputEl] - The command input to gate (disabled until boot completes/skips).
   * @param {Document} [deps.documentRef]     - Document for createElement (defaults to outputEl.ownerDocument or global).
   * @param {Window | object} [deps.windowRef]- Timer source (setTimeout/clearTimeout); defaults to global.
   * @param {() => void} [deps.onComplete]    - Invoked once when boot finishes or is skipped (enables the prompt).
   * @param {number} [deps.typingDelayMs]     - Per-line delay in ms (default 60; 0 for instant in tests).
   * @param {string[]} [deps.bootLines]       - Override of the startup lines.
   * @param {string} [deps.banner]            - Override of the ASCII banner.
   * @param {string[]} [deps.welcomeLines]    - Override of the welcome message lines.
   */
  constructor({
    outputEl,
    inputEl,
    documentRef,
    windowRef,
    onComplete,
    typingDelayMs,
    bootLines,
    banner,
    welcomeLines,
  } = {}) {
    this.outputEl = outputEl || null;
    this.inputEl = inputEl || null;

    // Resolve document/window safely so importing never crashes in node. These
    // are only dereferenced inside start()/skip(), called after construction.
    this._document =
      documentRef ||
      (outputEl && outputEl.ownerDocument) ||
      (typeof document !== 'undefined' ? document : undefined);
    this._window =
      windowRef || (typeof window !== 'undefined' ? window : undefined);

    this.onComplete = typeof onComplete === 'function' ? onComplete : null;
    this.typingDelayMs =
      typeof typingDelayMs === 'number' && typingDelayMs >= 0 ? typingDelayMs : 60;

    this.bootLines = Array.isArray(bootLines) ? bootLines.slice() : DEFAULT_BOOT_LINES.slice();
    this.banner = typeof banner === 'string' ? banner : BANNER;
    this.welcomeLines = Array.isArray(welcomeLines) ? welcomeLines.slice() : WELCOME_LINES.slice();

    /** @private Index of the next boot line to render. */
    this._lineIndex = 0;
    /** @private Pending timer handle (so it can be cleared on skip/complete). */
    this._timer = null;
    /** @private True once start() has been called. */
    this._started = false;
    /** @private True once boot has finished or been skipped (idempotency guard). */
    this._done = false;
  }

  /**
   * Whether the boot sequence has finished (completed or skipped).
   * @returns {boolean}
   */
  get done() {
    return this._done;
  }

  /**
   * Begin the typed animation. Gates command input, then appends the startup
   * lines sequentially. When the last line is rendered, finishes by appending
   * the banner + welcome message, ungating input, and calling onComplete.
   *
   * Safe to call once; subsequent calls are no-ops.
   *
   * @returns {Promise<void>} Resolves when boot finishes or is skipped.
   */
  start() {
    if (this._started) return this._completion || Promise.resolve();
    this._started = true;

    // Gate command input until boot completes or is skipped (Req 2.1 / 2.4).
    this._gateInput(true);

    this._completion = new Promise((resolve) => {
      this._resolve = resolve;
    });

    this._tick();
    return this._completion;
  }

  /**
   * Render the next startup line, then schedule the following one. After the
   * final startup line, finish the sequence.
   * @private
   */
  _tick() {
    if (this._done) return;

    if (this._lineIndex < this.bootLines.length) {
      this._appendLine(this.bootLines[this._lineIndex]);
      this._lineIndex += 1;

      if (this._lineIndex < this.bootLines.length) {
        this._timer = this._setTimeout(() => {
          this._timer = null;
          this._tick();
        }, this.typingDelayMs);
      } else {
        // All startup lines rendered; render banner + welcome after one delay.
        this._timer = this._setTimeout(() => {
          this._timer = null;
          this._finish(false);
        }, this.typingDelayMs);
      }
    } else {
      this._finish(false);
    }
  }

  /**
   * Immediately cancel the animation, render the full remaining output (any
   * un-rendered startup lines + banner + welcome), ungate input, and signal
   * readiness. Idempotent: calling skip() after the sequence is done is a
   * no-op. Clears any pending timer.
   */
  skip() {
    if (this._done) return;
    // skip() may be invoked before start(); ensure input gating is consistent.
    this._started = true;
    this._clearTimer();

    // Render any startup lines that haven't been shown yet.
    while (this._lineIndex < this.bootLines.length) {
      this._appendLine(this.bootLines[this._lineIndex]);
      this._lineIndex += 1;
    }

    this._finish(true);

    // If skip() was called before start(), there is no completion promise to
    // resolve; create a resolved one so callers awaiting start() still settle.
    if (!this._completion) {
      this._completion = Promise.resolve();
    }
  }

  /**
   * Finish the sequence: render the banner + welcome message, ungate input,
   * mark done, resolve the completion promise, and invoke onComplete once.
   *
   * @param {boolean} _skipped - Whether finishing via skip() (reserved for future use).
   * @private
   */
  _finish(_skipped) {
    if (this._done) return;
    this._clearTimer();

    this._renderBanner();
    this._renderWelcome();

    this._done = true;
    this._gateInput(false);

    if (typeof this._resolve === 'function') {
      this._resolve();
      this._resolve = null;
    }
    if (this.onComplete) {
      this.onComplete();
    }
  }

  // -------------------------------------------------------------------------
  // Rendering helpers
  // -------------------------------------------------------------------------

  /**
   * Append a single text line to the output area.
   * @param {string} text
   * @param {string} [className]
   * @private
   */
  _appendLine(text, className) {
    if (!this.outputEl || !this._document) return;
    const div = this._document.createElement('div');
    div.className = 'line boot-line' + (className ? ' ' + className : '');
    div.textContent = text == null ? '' : String(text);
    this.outputEl.appendChild(div);
  }

  /**
   * Render the multi-line ASCII banner as a preformatted block (Req 2.2).
   * @private
   */
  _renderBanner() {
    if (!this.outputEl || !this._document) return;
    const pre = this._document.createElement('pre');
    pre.className = 'banner';
    pre.setAttribute('aria-label', 'PORTFOLIO');
    pre.textContent = this.banner;
    this.outputEl.appendChild(pre);
  }

  /**
   * Render the welcome message lines directing the visitor to type `help`
   * (Req 2.3).
   * @private
   */
  _renderWelcome() {
    for (const line of this.welcomeLines) {
      this._appendLine(line, 'welcome');
    }
  }

  // -------------------------------------------------------------------------
  // Input gating
  // -------------------------------------------------------------------------

  /**
   * Enable/disable the gated command input (design.md "Boot input gating").
   * @param {boolean} gated - true => disable input; false => enable input.
   * @private
   */
  _gateInput(gated) {
    if (this.inputEl) {
      this.inputEl.disabled = !!gated;
    }
  }

  // -------------------------------------------------------------------------
  // Timer helpers (tracked so they can be cleared on skip/complete)
  // -------------------------------------------------------------------------

  /**
   * Schedule a timer via the injected window or the global setTimeout.
   * @param {() => void} fn
   * @param {number} ms
   * @returns {*} timer handle
   * @private
   */
  _setTimeout(fn, ms) {
    const w = this._window;
    if (w && typeof w.setTimeout === 'function') {
      return w.setTimeout(fn, ms);
    }
    if (typeof setTimeout === 'function') {
      return setTimeout(fn, ms);
    }
    // No timer facility available: run synchronously as a last resort.
    fn();
    return null;
  }

  /**
   * Clear the pending timer (if any).
   * @private
   */
  _clearTimer() {
    if (this._timer == null) return;
    const w = this._window;
    if (w && typeof w.clearTimeout === 'function') {
      w.clearTimeout(this._timer);
    } else if (typeof clearTimeout === 'function') {
      clearTimeout(this._timer);
    }
    this._timer = null;
  }
}
