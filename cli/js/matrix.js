// MatrixAnimation — the "matrix" easter-egg falling-character animation.
//
// This is part of the DOM rendering shell (design.md: "Boot sequence and matrix
// animation use requestAnimationFrame/timers with a cancel hook"). It is started
// by the `startMatrix` effect (Req 11.1) and provides a stop mechanism so that
// ANY key press or click returns the visitor to the prompt (Req 11.2).
//
// Design constraints honored here:
//   - Importing this module must NOT touch the DOM. All window/document access
//     happens inside methods invoked after construction, and is guarded so the
//     module loads cleanly under node/jsdom.
//   - The animation holds a cancellation handle (rAF id or interval id) so
//     stop() reliably tears down the timer, the overlay element, and every
//     listener it attached — no timer or listener leaks (design "Animation
//     lifecycle").
//   - stop() is idempotent: calling it twice is safe and only fires `onStop`
//     once.
//
// Loaded as an ES module ("type": "module").

// Characters used for the falling "rain". A mix of katakana-like glyphs and
// alphanumerics gives the classic Matrix look while staying ASCII-friendly.
const MATRIX_CHARS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * A self-contained Matrix-style falling-character animation rendered onto a
 * canvas overlay. Any key press or click stops it and returns to the prompt.
 */
export class MatrixAnimation {
  /**
   * @param {object} deps
   * @param {HTMLElement} deps.container - Element the overlay is appended to.
   * @param {Document} [deps.documentRef] - Document used to create elements.
   *   Defaults to `container.ownerDocument` or the global `document`.
   * @param {Window} [deps.windowRef] - Window used for requestAnimationFrame /
   *   cancelAnimationFrame / setInterval / clearInterval. Defaults to the
   *   document's defaultView or the global `window`.
   * @param {() => void} [deps.onStop] - Invoked once when the animation stops
   *   (used to return focus to the prompt).
   * @param {string} [deps.charSet] - Override the glyph set (testing/customization).
   * @param {number} [deps.fontSize] - Glyph size in px (column width). Default 14.
   */
  constructor({
    container,
    documentRef,
    windowRef,
    onStop,
    charSet,
    fontSize,
  } = {}) {
    this.container = container || null;

    // Resolve document/window safely so importing/constructing never throws in
    // a non-DOM environment. These are only dereferenced inside start().
    this._document =
      documentRef ||
      (container && container.ownerDocument) ||
      (typeof document !== 'undefined' ? document : undefined);
    this._window =
      windowRef ||
      (this._document && this._document.defaultView) ||
      (typeof window !== 'undefined' ? window : undefined);

    this.onStop = typeof onStop === 'function' ? onStop : null;
    this.charSet = typeof charSet === 'string' && charSet.length > 0 ? charSet : MATRIX_CHARS;
    this.fontSize = typeof fontSize === 'number' && fontSize > 0 ? fontSize : 14;

    /** @private overlay element appended to the container while running. */
    this._overlay = null;
    /** @private canvas + 2d context (when canvas is supported). */
    this._canvas = null;
    this._ctx = null;
    /** @private per-column y-offsets (the "drops"). */
    this._drops = [];

    /** @private requestAnimationFrame handle (null when using interval). */
    this._rafId = null;
    /** @private setInterval handle (fallback when rAF is unavailable). */
    this._intervalId = null;

    /** @private running flag. */
    this._running = false;
    /** @private guards onStop so it only ever fires once per stop(). */
    this._stopped = false;

    // Bound listeners kept so they can be removed precisely in stop().
    this._onKey = this._handleStopEvent.bind(this);
    this._onClick = this._handleStopEvent.bind(this);
    this._onFrame = this._renderFrame.bind(this);
  }

  /**
   * @returns {boolean} Whether the animation is currently running.
   */
  isRunning() {
    return this._running;
  }

  /**
   * Begin the falling-character animation. Creates a full-container canvas
   * overlay, seeds the column drops, attaches one-time stop listeners (any key
   * or click), and drives frames via requestAnimationFrame (falling back to
   * setInterval). Calling start() while already running is a no-op.
   */
  start() {
    if (this._running) return;
    if (!this.container || !this._document) return;

    this._running = true;
    this._stopped = false;

    this._buildOverlay();
    this._attachStopListeners();
    this._startLoop();
  }

  /**
   * Stop the animation: cancel the rAF/interval, remove the overlay and all
   * listeners, and invoke `onStop` (once). Idempotent — safe to call multiple
   * times. This returns the visitor to the prompt.
   */
  stop() {
    // Always tear down listeners/timers even if start() partially ran, but only
    // fire onStop a single time.
    const wasStopped = this._stopped;
    this._stopped = true;
    this._running = false;

    this._cancelLoop();
    this._detachStopListeners();
    this._removeOverlay();

    if (!wasStopped && this.onStop) {
      this.onStop();
    }
  }

  // -------------------------------------------------------------------------
  // Overlay construction / teardown
  // -------------------------------------------------------------------------

  /**
   * Create the overlay element (a canvas when supported) and append it to the
   * container.
   * @private
   */
  _buildOverlay() {
    const doc = this._document;
    const overlay = doc.createElement('div');
    overlay.className = 'matrix-overlay';
    // Inline styles keep the overlay self-contained (no CSS dependency) and
    // ensure it covers the terminal surface.
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = '#000';
    overlay.style.zIndex = '9999';
    overlay.style.overflow = 'hidden';

    const canvas = doc.createElement('canvas');
    canvas.className = 'matrix-canvas';
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    canvas.width = width;
    canvas.height = height;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    overlay.appendChild(canvas);
    this.container.appendChild(overlay);

    this._overlay = overlay;
    this._canvas = canvas;

    // getContext may be absent under jsdom; degrade gracefully (animation loop
    // still runs and tears down cleanly, just without painting).
    this._ctx =
      typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;

    // Seed one drop per column.
    const columns = Math.max(1, Math.floor(width / this.fontSize));
    this._drops = new Array(columns).fill(0).map(() => Math.floor(Math.random() * -20));
  }

  /**
   * Remove the overlay from the DOM and drop references.
   * @private
   */
  _removeOverlay() {
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;
    this._canvas = null;
    this._ctx = null;
    this._drops = [];
  }

  // -------------------------------------------------------------------------
  // Listeners
  // -------------------------------------------------------------------------

  /**
   * Attach one-time stop listeners so ANY key press or click ends the animation
   * (Req 11.2). Listeners are registered on the window (keydown) and the overlay
   * + window (click) and removed wholesale in stop().
   * @private
   */
  _attachStopListeners() {
    if (this._window && typeof this._window.addEventListener === 'function') {
      this._window.addEventListener('keydown', this._onKey, true);
      this._window.addEventListener('click', this._onClick, true);
    }
    if (this._overlay && typeof this._overlay.addEventListener === 'function') {
      this._overlay.addEventListener('click', this._onClick, true);
    }
  }

  /**
   * Remove every listener attached in _attachStopListeners.
   * @private
   */
  _detachStopListeners() {
    if (this._window && typeof this._window.removeEventListener === 'function') {
      this._window.removeEventListener('keydown', this._onKey, true);
      this._window.removeEventListener('click', this._onClick, true);
    }
    if (this._overlay && typeof this._overlay.removeEventListener === 'function') {
      this._overlay.removeEventListener('click', this._onClick, true);
    }
  }

  /**
   * Handle a stop-triggering event (key or click): swallow it and stop.
   * @param {Event} [event]
   * @private
   */
  _handleStopEvent(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    this.stop();
  }

  // -------------------------------------------------------------------------
  // Animation loop
  // -------------------------------------------------------------------------

  /**
   * Start the frame loop using requestAnimationFrame when available, otherwise
   * fall back to setInterval (~33ms ≈ 30fps).
   * @private
   */
  _startLoop() {
    const w = this._window;
    if (w && typeof w.requestAnimationFrame === 'function') {
      this._rafId = w.requestAnimationFrame(this._onFrame);
    } else if (w && typeof w.setInterval === 'function') {
      this._intervalId = w.setInterval(this._onFrame, 33);
    } else if (typeof setInterval === 'function') {
      this._intervalId = setInterval(this._onFrame, 33);
    }
  }

  /**
   * Cancel whichever loop mechanism is active.
   * @private
   */
  _cancelLoop() {
    const w = this._window;
    if (this._rafId != null) {
      if (w && typeof w.cancelAnimationFrame === 'function') {
        w.cancelAnimationFrame(this._rafId);
      }
      this._rafId = null;
    }
    if (this._intervalId != null) {
      if (w && typeof w.clearInterval === 'function') {
        w.clearInterval(this._intervalId);
      } else if (typeof clearInterval === 'function') {
        clearInterval(this._intervalId);
      }
      this._intervalId = null;
    }
  }

  /**
   * Render a single animation frame and schedule the next one (when driven by
   * requestAnimationFrame). Paints the translucent fade + falling glyphs when a
   * 2d context is available; otherwise it only advances the drops so the loop
   * still ticks (and tears down cleanly) in environments without canvas.
   * @private
   */
  _renderFrame() {
    if (!this._running) return;

    const ctx = this._ctx;
    const canvas = this._canvas;
    if (ctx && canvas) {
      // Translucent black fill creates the trailing fade effect.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00ff41'; // matrix green
      ctx.font = `${this.fontSize}px monospace`;

      for (let i = 0; i < this._drops.length; i++) {
        const ch = this.charSet.charAt(
          Math.floor(Math.random() * this.charSet.length)
        );
        const x = i * this.fontSize;
        const y = this._drops[i] * this.fontSize;
        ctx.fillText(ch, x, y);

        // Reset the drop to the top at random once it falls past the bottom.
        if (y > canvas.height && Math.random() > 0.975) {
          this._drops[i] = 0;
        } else {
          this._drops[i]++;
        }
      }
    } else {
      // No canvas context (e.g. jsdom): still advance drops to keep the loop
      // semantically alive.
      for (let i = 0; i < this._drops.length; i++) {
        this._drops[i]++;
      }
    }

    // Schedule the next frame only when using requestAnimationFrame.
    if (this._rafId != null) {
      const w = this._window;
      if (w && typeof w.requestAnimationFrame === 'function') {
        this._rafId = w.requestAnimationFrame(this._onFrame);
      }
    }
  }
}

/**
 * Convenience factory: construct a MatrixAnimation, start it, and return the
 * instance. Wiring (12.1) can use this from the TerminalRenderer's startMatrix
 * callback, then rely on the instance's onStop to refocus the prompt.
 *
 * @param {ConstructorParameters<typeof MatrixAnimation>[0]} opts
 * @returns {MatrixAnimation} The started animation instance.
 */
export function startMatrix(opts) {
  const animation = new MatrixAnimation(opts);
  animation.start();
  return animation;
}
