// Sound engine for the Terminal Portfolio.
//
// Synthesizes short "key click" sounds via the Web Audio API. The engine is
// disabled by default (Req 12.4) and exposes a toggle. The enabled/disabled
// state is kept simple and side-effect-free so it can be property-tested
// independently of audio playback (see task 8.2 — toggle parity).
//
// Loaded as an ES module ("type": "module"). No DOM access beyond feature-
// detecting the Web Audio API on `window`, which is guarded so it never throws
// in environments without Web Audio (e.g. jsdom test environments).

/**
 * Synthesizes typing "click" sounds using the Web Audio API and tracks whether
 * sound is enabled.
 *
 * Sound is disabled by default (Req 12.4). `playKeyClick` is a no-op while
 * disabled and only ever touches the Web Audio API when enabled, lazily
 * creating a single shared `AudioContext`.
 */
export class SoundEngine {
  /**
   * @param {object} [options]
   * @param {Window | object} [options.audioContextProvider] - Object to read
   *   `AudioContext` / `webkitAudioContext` from. Defaults to the global
   *   `window` when available. Injectable for testing.
   */
  constructor(options = {}) {
    /** @type {boolean} Whether sound playback is enabled (default false, Req 12.4). */
    this.enabled = false;

    /**
     * @type {Window | object | null} Source of the AudioContext constructor.
     * Falls back to the global `window` when present, otherwise null so the
     * engine degrades gracefully where Web Audio is unavailable.
     */
    this._provider =
      options.audioContextProvider ??
      (typeof window !== 'undefined' ? window : null);

    /** @type {AudioContext | null} Lazily created shared audio context. */
    this._ctx = null;
  }

  /**
   * Flip the enabled state.
   *
   * @returns {boolean} The new enabled state.
   */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /**
   * Play a short synthesized "click".
   *
   * No-op when disabled. When enabled, lazily creates an `AudioContext` and
   * plays a brief (~40ms) oscillator tone shaped by a fast gain envelope.
   * Guards against environments without Web Audio so it never throws.
   */
  playKeyClick() {
    if (!this.enabled) return;

    const ctx = this._getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = 0.04; // ~40ms click

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, now);

      // Short percussive envelope: quick attack, fast decay to silence.
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch {
      // Swallow audio errors — sound is a non-essential enhancement and must
      // never disrupt input handling.
    }
  }

  /**
   * Lazily resolve a shared AudioContext, feature-detecting Web Audio support.
   *
   * @returns {AudioContext | null} The context, or null when unavailable.
   * @private
   */
  _getContext() {
    if (this._ctx) return this._ctx;

    const provider = this._provider;
    if (!provider) return null;

    const Ctor = provider.AudioContext ?? provider.webkitAudioContext;
    if (typeof Ctor !== 'function') return null;

    try {
      this._ctx = new Ctor();
    } catch {
      this._ctx = null;
    }
    return this._ctx;
  }
}
