// TerminalRenderer — the DOM rendering shell for the Terminal Portfolio.
//
// This is the thin "IO shell" described in design.md ("TerminalRenderer (DOM
// shell)"). It owns the terminal's DOM output area and input element and:
//   - renders the prompt (visitor@portfolio:<cwd>$) from CONFIG + fs.cwdPath,
//   - echoes the entered line, then appends the interpreter's output lines,
//   - applies CommandResult effects (openUrl, clear, mailto, startMatrix),
//   - scrolls to the newest output,
//   - focuses the input when the terminal is clicked,
//   - routes Enter -> submit, Up/Down -> history, Tab -> completion,
//   - plays a key click via the SoundEngine on character keypress.
//
// The pure logic (interpreter, file system, history, completion) lives in other
// modules and is injected, so this class can be exercised under jsdom.
//
// IMPORTANT: importing this module must not touch the DOM. All DOM/window
// access happens inside methods that are only called after construction with
// real elements (or jsdom elements in tests).
//
// Loaded as an ES module ("type": "module").

import { complete as defaultComplete } from './completion.js';

/**
 * @typedef {import('./interpreter.js').CommandResult} CommandResult
 * @typedef {import('./interpreter.js').Line} Line
 */

/**
 * Renders the terminal and bridges DOM events to the pure logic core.
 */
export class TerminalRenderer {
  /**
   * @param {object} deps
   * @param {HTMLElement} deps.outputEl     - Container for rendered output lines (#terminal-output).
   * @param {HTMLInputElement} deps.inputEl  - The command text input (#terminal-input).
   * @param {HTMLElement} deps.promptEl      - Element showing the live prompt (#prompt).
   * @param {HTMLElement} [deps.container]   - Clickable terminal surface; clicking focuses input (#terminal).
   * @param {object} deps.interpreter        - CommandInterpreter with interpret(line, context).
   * @param {object} deps.fs                 - FileSystemModel (provides cwdPath, list()).
   * @param {object} deps.history            - CommandHistory (push/previous/next/entries).
   * @param {object} [deps.sound]            - SoundEngine (playKeyClick()); optional.
   * @param {(input: string, ctx: object) => object} [deps.completion] - complete() fn; defaults to completion.js.
   * @param {object} deps.config             - CONFIG (PROMPT_USER, PROMPT_HOST, ...).
   * @param {() => string[]} [deps.getCommandNames] - Returns the list of command names for tab completion.
   * @param {() => void} [deps.startMatrix]  - Callback invoked on a startMatrix effect (wired in 10.3/12.1).
   * @param {Window} [deps.windowRef]        - Window-like object for window.open / location (injectable for tests).
   * @param {Document} [deps.documentRef]    - Document for createElement (injectable for tests).
   */
  constructor({
    outputEl,
    inputEl,
    promptEl,
    container,
    interpreter,
    fs,
    history,
    sound,
    completion,
    config,
    getCommandNames,
    startMatrix,
    startHack,
    windowRef,
    documentRef,
    animate,
    streamDelayMs,
  } = {}) {
    this.outputEl = outputEl;
    this.inputEl = inputEl;
    this.promptEl = promptEl;
    this.container = container || outputEl;
    this.interpreter = interpreter;
    this.fs = fs;
    this.history = history;
    this.sound = sound || null;
    this.completion = completion || defaultComplete;
    this.config = config || {};
    this.getCommandNames =
      typeof getCommandNames === 'function' ? getCommandNames : () => [];
    this.startMatrix = typeof startMatrix === 'function' ? startMatrix : null;
    this.startHack = typeof startHack === 'function' ? startHack : null;

    // When enabled (real browser, wired in main.js), command output is streamed
    // line by line with a trailing cursor to mimic real-terminal text
    // generation. Defaults OFF so unit/integration tests render synchronously.
    this.animate = !!animate;
    this.streamDelayMs =
      typeof streamDelayMs === 'number' && streamDelayMs >= 0 ? streamDelayMs : 16;
    /** @private true while a streamed render is in flight. */
    this._streaming = false;

    // Resolve window/document lazily-but-safely so importing never crashes in
    // node. These are only dereferenced by methods invoked after construction.
    this._window =
      windowRef || (typeof window !== 'undefined' ? window : undefined);
    this._document =
      documentRef ||
      (outputEl && outputEl.ownerDocument) ||
      (typeof document !== 'undefined' ? document : undefined);

    /** @private bound handlers kept so they can be removed if needed. */
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onKeyPress = this._handleKeyPress.bind(this);
    this._onContainerClick = this._handleContainerClick.bind(this);
    this._onInput = this._autoResize.bind(this);

    this._attached = false;
  }

  /**
   * Wire DOM event listeners and render the initial prompt. Safe to call once
   * after construction. No-op if required elements are missing.
   */
  init() {
    if (this._attached) return;
    if (this.inputEl) {
      this.inputEl.addEventListener('keydown', this._onKeyDown);
      this.inputEl.addEventListener('keypress', this._onKeyPress);
      this.inputEl.addEventListener('input', this._onInput);
    }
    if (this.container) {
      this.container.addEventListener('click', this._onContainerClick);
    }
    this._attached = true;
    this.renderPrompt();
    this._autoResize();
  }

  /**
   * Remove DOM event listeners (useful for teardown / tests).
   */
  destroy() {
    if (this.inputEl) {
      this.inputEl.removeEventListener('keydown', this._onKeyDown);
      this.inputEl.removeEventListener('keypress', this._onKeyPress);
      this.inputEl.removeEventListener('input', this._onInput);
    }
    if (this.container) {
      this.container.removeEventListener('click', this._onContainerClick);
    }
    this._attached = false;
  }

  // -------------------------------------------------------------------------
  // Prompt
  // -------------------------------------------------------------------------

  /**
   * Build the plain prompt text, e.g. `visitor@portfolio:Portfolio~$`.
   * Used for the echoed command line and history echoes.
   * @returns {string}
   */
  promptText() {
    const user = this.config.PROMPT_USER || 'visitor';
    const host = this.config.PROMPT_HOST || 'portfolio';
    const cwd = this.fs && typeof this.fs.cwdPath === 'string' ? this.fs.cwdPath : '';
    return `${user}@${host}:${cwd}$`;
  }

  /**
   * Render the live prompt into the prompt element using colourized role spans
   * (green user@host, grey separators, blue path), like a real shell. Falls
   * back to plain text when DOM helpers are unavailable.
   */
  renderPrompt() {
    if (!this.promptEl) return;
    const user = this.config.PROMPT_USER || 'visitor';
    const host = this.config.PROMPT_HOST || 'portfolio';
    const cwd = this.fs && typeof this.fs.cwdPath === 'string' ? this.fs.cwdPath : '';

    // During an interactive session show the custom session prompt instead of
    // the normal user@host:path$ prompt.
    if (this.sessionPrompt != null) {
      this.promptEl.textContent = this.sessionPrompt;
      this._applyPromptIndent();
      return;
    }

    if (!this._document || typeof this.promptEl.replaceChildren !== 'function') {
      this.promptEl.textContent = this.promptText() + ' ';
      return;
    }

    const span = (cls, text) => {
      const s = this._document.createElement('span');
      s.className = cls;
      s.textContent = text;
      return s;
    };

    this.promptEl.replaceChildren(
      span('prompt-user', `${user}@${host}`),
      span('prompt-sep', ':'),
      span('prompt-path', cwd),
      span('prompt-sep', '$\u00a0'),
    );

    // Align the textarea's first line after the prompt, while wrapped lines
    // begin at the left edge (true terminal wrapping). Measured after layout.
    this._applyPromptIndent();
  }

  /**
   * Set the input's first-line indent (and the idle cursor position) to the
   * rendered width of the prompt, so the command starts beside the prompt and
   * any wrapped lines return to the left edge — like a real Linux terminal.
   * @private
   */
  _applyPromptIndent() {
    if (!this.promptEl || !this.inputEl || !this.inputEl.style) return;
    const measure = () => {
      const width =
        typeof this.promptEl.getBoundingClientRect === 'function'
          ? this.promptEl.getBoundingClientRect().width
          : this.promptEl.offsetWidth || 0;
      if (width > 0) {
        this.inputEl.style.textIndent = width + 'px';
        const cursorEl = this._document
          ? this._document.getElementById('cursor')
          : null;
        if (cursorEl && cursorEl.style) {
          cursorEl.style.left = width + 'px';
        }
      }
    };
    // Measure now; also after a frame so web-font metrics are settled.
    measure();
    const w = this._window;
    if (w && typeof w.requestAnimationFrame === 'function') {
      w.requestAnimationFrame(measure);
    }
  }

  // -------------------------------------------------------------------------
  // Output rendering
  // -------------------------------------------------------------------------

  /**
   * Append a single output line to the output area. URLs found in the text are
   * rendered as clickable links (Ctrl/Cmd + click to open in a new tab).
   * @param {string} text
   * @param {string} [className] - optional CSS class hint (e.g. "error").
   * @returns {HTMLElement | undefined} the created line element.
   */
  appendLine(text, className) {
    if (!this.outputEl || !this._document) return undefined;
    const div = this._document.createElement('div');
    div.className = 'line' + (className ? ' ' + className : '');
    this._fillLine(div, text == null ? '' : String(text));
    this.outputEl.appendChild(div);
    return div;
  }

  /**
   * Populate a line element with text, converting any http(s) URLs into
   * clickable `.term-link` spans. Uses textContent for non-URL segments so
   * command output can never inject markup.
   * @param {HTMLElement} el
   * @param {string} text
   * @private
   */
  _fillLine(el, text) {
    el.textContent = '';
    const urlRe = /(https?:\/\/[^\s]+)/g;
    let lastIndex = 0;
    let match;
    while ((match = urlRe.exec(text)) !== null) {
      if (match.index > lastIndex) {
        el.appendChild(this._document.createTextNode(text.slice(lastIndex, match.index)));
      }
      // Trim common trailing punctuation so it stays outside the link.
      let url = match[0];
      let trailing = '';
      const trail = url.match(/[).,;:]+$/);
      if (trail) {
        trailing = trail[0];
        url = url.slice(0, -trailing.length);
      }
      const link = this._document.createElement('span');
      link.className = 'term-link';
      link.textContent = url;
      link.dataset.href = url;
      link.setAttribute('role', 'link');
      link.setAttribute('title', 'Ctrl/Cmd + click to open');
      el.appendChild(link);
      if (trailing) {
        el.appendChild(this._document.createTextNode(trailing));
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      el.appendChild(this._document.createTextNode(text.slice(lastIndex)));
    }
  }

  /**
   * Append the echoed prompt + typed command as a single history line, e.g.
   * `visitor@portfolio:Portfolio~$ ls projects`.
   * @param {string} commandText
   */
  echoCommand(commandText) {
    this.appendLine(`${this.promptText()} ${commandText}`, 'echo');
  }

  /**
   * Append all output lines from a CommandResult.
   * @param {Line[]} lines
   */
  appendResultLines(lines) {
    if (!Array.isArray(lines)) return;
    for (const ln of lines) {
      if (ln == null) continue;
      this.appendLine(ln.text, ln.className);
    }
  }

  /**
   * Clear all rendered output.
   */
  clearOutput() {
    if (this.outputEl) {
      this.outputEl.textContent = '';
    }
  }

  /**
   * Scroll the terminal so the newest output and the active prompt are visible.
   */
  scrollToNewest() {
    const el = this.container || this.outputEl;
    if (el && typeof el.scrollHeight === 'number') {
      el.scrollTop = el.scrollHeight;
    }
  }

  // -------------------------------------------------------------------------
  // Submit / interpret
  // -------------------------------------------------------------------------

  /**
   * Build the handler context passed to the interpreter.
   * @returns {object}
   */
  context() {
    return {
      fs: this.fs,
      history: this.history,
      config: this.config,
      registry: this.interpreter ? this.interpreter.registry : undefined,
    };
  }

  /**
   * Submit a command line: echo it, record history, interpret, render output,
   * apply effects, refresh the prompt, and scroll to the newest output.
   *
   * When animation is enabled, the output lines are streamed in one-by-one
   * (each with a trailing cursor) to mimic real-terminal text generation, and
   * the view auto-scrolls as each line appears. Effects are applied after the
   * last line is rendered.
   *
   * @param {string} line - The raw input line.
   * @returns {CommandResult | undefined} The interpreter result (for tests).
   */
  submit(line) {
    const text = line == null ? '' : String(line);

    // Echo the prompt + typed command (even when empty, like a real shell).
    this.echoCommand(text);

    // Record non-empty submissions in history (history.push ignores empties).
    if (text.trim() !== '' && this.history && typeof this.history.push === 'function') {
      this.history.push(text);
    }

    let result;
    if (this.interpreter && typeof this.interpreter.interpret === 'function') {
      result = this.interpreter.interpret(text, this.context());
    }

    if (result) {
      if (this.animate) {
        // Stream the output, then apply effects and refresh the prompt.
        this._streamResult(result);
        return result;
      }
      this.appendResultLines(result.lines);
      this.applyEffects(result.effects);
    }

    // The working directory may have changed (cd); refresh the prompt.
    this.renderPrompt();
    this.scrollToNewest();
    return result;
  }

  /**
   * Stream a CommandResult's output lines one at a time with a trailing cursor,
   * auto-scrolling as each appears, then apply effects and refresh the prompt.
   * Gracefully degrades to synchronous rendering when no timer is available.
   * @param {CommandResult} result
   * @private
   */
  _streamResult(result) {
    const lines = Array.isArray(result.lines) ? result.lines : [];
    const win = this._window;
    const canSchedule =
      win && typeof win.setTimeout === 'function' && this.streamDelayMs > 0;

    // Hide the live input line while streaming so the cursor lives at the end of
    // the generating text, like a real shell.
    this._setInputLineVisible(false);
    this._streaming = true;

    const finish = () => {
      this._streaming = false;
      this._setInputLineVisible(true);
      this.applyEffects(result.effects);
      this.renderPrompt();
      this.scrollToNewest();
      this.focusInput();
    };

    if (!canSchedule) {
      // No timer (tests/node) — render synchronously.
      this.appendResultLines(lines);
      finish();
      return;
    }

    let i = 0;
    let prev = null;
    const step = () => {
      if (prev) prev.classList.remove('streaming');
      if (i >= lines.length) {
        finish();
        return;
      }
      const ln = lines[i];
      i += 1;
      if (ln == null) {
        win.setTimeout(step, 0);
        return;
      }
      const el = this.appendLine(ln.text, ln.className);
      if (el) el.classList.add('streaming');
      prev = el;
      this.scrollToNewest();
      win.setTimeout(step, this.streamDelayMs);
    };
    step();
  }

  /**
   * Show/hide the live input line (used while streaming output).
   * @param {boolean} visible
   * @private
   */
  _setInputLineVisible(visible) {
    const lineEl =
      this.inputEl && this.inputEl.closest
        ? this.inputEl.closest('.input-line')
        : null;
    const el = lineEl || this.inputEl;
    if (el && el.style) {
      el.style.visibility = visible ? '' : 'hidden';
    }
  }

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  /**
   * Apply a CommandResult's side-effects.
   *   - openUrl     -> window.open(url, '_blank', 'noopener,noreferrer')
   *   - clear       -> empty the output area
   *   - mailto      -> navigate window.location to the mailto href
   *   - startMatrix -> invoke the injected startMatrix callback (if present)
   *
   * @param {import('./interpreter.js').Effect[]} effects
   */
  applyEffects(effects) {
    if (!Array.isArray(effects)) return;
    for (const effect of effects) {
      if (!effect || typeof effect.kind !== 'string') continue;
      switch (effect.kind) {
        case 'openUrl':
          if (this._window && typeof this._window.open === 'function') {
            this._window.open(effect.url, '_blank', 'noopener,noreferrer');
          }
          break;
        case 'clear':
          this.clearOutput();
          break;
        case 'mailto':
          if (this._window && this._window.location) {
            this._window.location.href = effect.href;
          }
          break;
        case 'startMatrix':
          if (this.startMatrix) {
            this.startMatrix();
          }
          break;
        case 'startHack':
          if (this.startHack) {
            this.startHack(effect.target || '');
          }
          break;
        case 'setCwd':
          // Working directory mutation is performed by the cd handler against
          // the shared FileSystemModel; the renderer only refreshes the prompt.
          this.renderPrompt();
          break;
        default:
          break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Input helpers
  // -------------------------------------------------------------------------

  /** @returns {string} current input value. */
  getInput() {
    return this.inputEl ? this.inputEl.value : '';
  }

  /** @param {string} value - set the input value (clamps caret to the end). */
  setInput(value) {
    if (!this.inputEl) return;
    this.inputEl.value = value == null ? '' : String(value);
    // Move the caret to the end after a programmatic change.
    const len = this.inputEl.value.length;
    if (typeof this.inputEl.setSelectionRange === 'function') {
      try {
        this.inputEl.setSelectionRange(len, len);
      } catch {
        /* some input types disallow selection range; ignore */
      }
    }
    this._autoResize();
  }

  /**
   * Auto-grow the textarea input so wrapped commands push the height down line
   * by line (real-terminal feel) instead of scrolling within a fixed box.
   * No-op for non-textarea inputs or when no element/height metrics exist.
   * @private
   */
  _autoResize() {
    const el = this.inputEl;
    if (!el || el.tagName !== 'TEXTAREA' || !el.style) return;
    // Reset to a single row, then grow to fit the content's scroll height.
    el.style.height = 'auto';
    if (typeof el.scrollHeight === 'number' && el.scrollHeight > 0) {
      el.style.height = el.scrollHeight + 'px';
    }
  }

  /** Focus the command input. */
  focusInput() {
    if (this.inputEl && typeof this.inputEl.focus === 'function') {
      this.inputEl.focus();
    }
  }

  // -------------------------------------------------------------------------
  // Interactive sessions (used by the hack simulation, js/hack.js)
  // -------------------------------------------------------------------------

  /**
   * Enable/disable the command input (gating during automated output).
   * @param {boolean} enabled
   */
  setInputGated(enabled) {
    if (this.inputEl) this.inputEl.disabled = !enabled;
    this._setInputLineVisible(!!enabled);
  }

  /**
   * Read one line of input interactively, showing a custom prompt label. The
   * returned promise resolves with the visitor's next submitted line (the line
   * is echoed under the custom prompt). Used by interactive simulations to ask
   * for e.g. a target URL or an attack choice.
   *
   * @param {string} promptLabel - The prompt text to show (e.g. "target> ").
   * @returns {Promise<string>}
   */
  readLine(promptLabel) {
    this.sessionPrompt = promptLabel == null ? '' : String(promptLabel);
    this.renderPrompt();
    this.setInputGated(true);
    this.focusInput();
    this.scrollToNewest();
    return new Promise((resolve) => {
      this._lineResolver = resolve;
    });
  }

  /**
   * End any interactive session: clear the custom prompt label and resolver and
   * restore the normal prompt.
   */
  endSession() {
    this.sessionPrompt = null;
    this._lineResolver = null;
    this.renderPrompt();
  }

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  /**
   * Focus the input when the visitor clicks anywhere in the terminal (Req 1.6),
   * unless they clicked an interactive control or are selecting text.
   * @param {MouseEvent} event
   * @private
   */
  _handleContainerClick(event) {
    const target = event && event.target;

    // Ctrl/Cmd + click on a rendered link opens it in a new tab (like VS Code /
    // modern terminals). A plain click selects text without navigating.
    if (target && typeof target.closest === 'function') {
      const link = target.closest('.term-link');
      if (link) {
        const href = link.dataset ? link.dataset.href : link.getAttribute('data-href');
        if (href && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          if (this._window && typeof this._window.open === 'function') {
            this._window.open(href, '_blank', 'noopener,noreferrer');
          }
          return;
        }
        // Plain click on a link: let the user select; don't steal focus.
        return;
      }
      // Don't steal focus from other interactive controls.
      if (target.closest('button, a, input, [data-command]') && target !== this.inputEl) {
        return;
      }
    }
    this.focusInput();
  }

  /**
   * Handle non-character keys: Enter (submit), Up/Down (history), Tab
   * (completion).
   * @param {KeyboardEvent} event
   * @private
   */
  _handleKeyDown(event) {
    switch (event.key) {
      case 'Enter': {
        event.preventDefault();
        const value = this.getInput();
        this.setInput('');
        // If an interactive session is awaiting a line, route it there instead
        // of interpreting it as a command.
        if (typeof this._lineResolver === 'function') {
          const resolve = this._lineResolver;
          this._lineResolver = null;
          // Echo the entered line under the session prompt.
          this.appendLine(`${this.sessionPrompt || ''}${value}`, 'echo');
          this.scrollToNewest();
          resolve(value);
          break;
        }
        this.submit(value);
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        if (this.history && typeof this.history.previous === 'function') {
          const prev = this.history.previous();
          if (prev != null) this.setInput(prev);
        }
        break;
      }
      case 'ArrowDown': {
        event.preventDefault();
        if (this.history && typeof this.history.next === 'function') {
          const nxt = this.history.next();
          this.setInput(nxt == null ? '' : nxt);
        }
        break;
      }
      case 'Tab': {
        event.preventDefault();
        this._handleTab();
        break;
      }
      default:
        break;
    }
  }

  /**
   * Tab-completion: complete the input, or print candidates when ambiguous.
   * @private
   */
  _handleTab() {
    const input = this.getInput();
    const ctx = {
      commandNames: this.getCommandNames(),
      fs: this.fs,
    };
    const res = this.completion(input, ctx);
    if (!res) return;
    if (res.changed) {
      this.setInput(res.completed);
    } else if (Array.isArray(res.candidates) && res.candidates.length > 1) {
      // Echo the current prompt + input, then list candidates (shell-like).
      this.echoCommand(input);
      this.appendLine(res.candidates.join('  '));
      this.scrollToNewest();
    }
  }

  /**
   * Play a key click on character keypress when sound is enabled.
   * @param {KeyboardEvent} event
   * @private
   */
  _handleKeyPress(event) {
    // keypress fires for character-producing keys; play a click for each.
    if (this.sound && typeof this.sound.playKeyClick === 'function') {
      this.sound.playKeyClick();
    }
  }
}
