// Hybrid-GUI control wiring for the Terminal Portfolio.
//
// These helpers wire the *subordinate* GUI elements described in design.md
// ("SuggestionControls / HintBar" and the "SoundEngine" toggle) to the pure
// logic core and the TerminalRenderer:
//
//   - Suggestion chips ([data-command]) feed commands into the interpreter as
//     if the visitor had typed them and pressed Enter (Req 8.3, Property 22).
//   - The sound toggle flips the SoundEngine and keeps its displayed state in
//     sync with `SoundEngine.enabled` (Req 12.2, 12.3).
//   - The hint bar shows guidance text directing visitors to type `help`
//     (Req 8.1).
//
// Design constraints honored here:
//   - Pure-ish DOM helpers: every function takes its elements as arguments;
//     there are NO global `document.getElementById` lookups. This lets the
//     helpers run under jsdom in tests.
//   - Importing this module must NOT touch the DOM. All DOM access happens
//     inside the exported functions, which are only called after the page (or
//     a jsdom fixture) provides real elements.
//   - Each wiring function guards against missing elements and returns a
//     teardown function that removes any listeners it attached.
//
// main.js (task 12.1) is responsible for looking up the actual DOM elements
// and calling these helpers; this module deliberately does not do that.
//
// Loaded as an ES module ("type": "module").

/**
 * Attach click listeners to every `[data-command]` element inside `container`.
 *
 * When a suggestion control is activated, its `data-command` string is passed
 * to `renderer.submit(...)`, which runs the command exactly as if the visitor
 * had typed it and pressed Enter (echo prompt + command, interpret, render,
 * apply effects). This guarantees suggestion-control parity with typed input
 * (Req 8.3 / Property 22). After running, keyboard focus is returned to the
 * terminal input so the visitor can keep typing.
 *
 * @param {object} deps
 * @param {HTMLElement} deps.container - Element containing the suggestion
 *   chips (e.g. #suggestions). Each chip carries a `data-command` attribute.
 * @param {{ submit: (line: string) => unknown, focusInput?: () => void }} deps.renderer
 *   - The TerminalRenderer (or any object exposing `submit`).
 * @returns {() => void} A teardown function that removes the attached
 *   listeners. Safe to call multiple times.
 */
export function wireSuggestions({ container, renderer } = {}) {
  // Guard: nothing to wire without a container or a usable renderer.
  if (!container || typeof container.querySelectorAll !== 'function') {
    return () => {};
  }
  if (!renderer || typeof renderer.submit !== 'function') {
    return () => {};
  }

  /** @type {Array<{ el: Element, handler: (e: Event) => void }>} */
  const bound = [];

  const chips = container.querySelectorAll('[data-command]');
  chips.forEach((el) => {
    const handler = (event) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      const command = el.dataset ? el.dataset.command : el.getAttribute('data-command');
      if (command == null) return;
      // Run the command exactly as if typed and entered (Req 8.3 / Property 22).
      renderer.submit(command);
      // Return focus to the input so the visitor can continue typing.
      if (typeof renderer.focusInput === 'function') {
        renderer.focusInput();
      }
    };
    el.addEventListener('click', handler);
    bound.push({ el, handler });
  });

  return () => {
    while (bound.length) {
      const { el, handler } = bound.pop();
      el.removeEventListener('click', handler);
    }
  };
}

/**
 * Wire the sound toggle control to the SoundEngine, keeping the control's
 * appearance in sync with `sound.enabled` at all times (Req 12.2, 12.3).
 *
 * The toggle's appearance is initialized from the current `sound.enabled`
 * state on wiring, then updated after every click so the displayed state never
 * drifts from the engine state. Synced surfaces:
 *   - `textContent` -> "sound: on" / "sound: off"
 *   - `aria-pressed` -> "true" / "false"
 *   - the `on` CSS class is toggled to match
 *
 * @param {object} deps
 * @param {HTMLElement} deps.toggleEl - The toggle button (e.g. #sound-toggle).
 * @param {{ toggle: () => boolean, enabled: boolean }} deps.sound - SoundEngine.
 * @param {Document} [deps.documentRef] - Unused for now but accepted for
 *   symmetry/testability; appearance updates operate only on `toggleEl`.
 * @returns {() => void} A teardown function that removes the click listener.
 */
export function wireSoundToggle({ toggleEl, sound /*, documentRef */ } = {}) {
  // Guard: need both a toggle element and a sound engine to wire anything.
  if (!toggleEl || typeof toggleEl.addEventListener !== 'function') {
    return () => {};
  }
  if (!sound || typeof sound.toggle !== 'function') {
    return () => {};
  }

  // Initialize appearance from the current engine state (default disabled).
  syncSoundToggleAppearance(toggleEl, !!sound.enabled);

  const handler = (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    // Flip engine state, then reflect the *new* state in the control so the
    // displayed state always matches `sound.enabled` (Req 12.3).
    const enabled = sound.toggle();
    syncSoundToggleAppearance(toggleEl, !!enabled);
  };

  toggleEl.addEventListener('click', handler);

  return () => {
    toggleEl.removeEventListener('click', handler);
  };
}

/**
 * Update a sound-toggle element's appearance to reflect the given enabled
 * state. Exported so tests (and other callers) can assert/reuse the exact
 * sync logic used by {@link wireSoundToggle}.
 *
 * @param {HTMLElement} toggleEl - The toggle button.
 * @param {boolean} enabled - The current SoundEngine enabled state.
 */
export function syncSoundToggleAppearance(toggleEl, enabled) {
  if (!toggleEl) return;
  const on = !!enabled;
  toggleEl.textContent = on ? 'sound: on' : 'sound: off';
  if (typeof toggleEl.setAttribute === 'function') {
    toggleEl.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  if (toggleEl.classList && typeof toggleEl.classList.toggle === 'function') {
    toggleEl.classList.toggle('on', on);
  }
}

/**
 * Set the hint bar's guidance text (Req 8.1). Provided for completeness so the
 * hint text can be set/ensured from JS; the default text already lives in
 * index.html.
 *
 * The text is applied via `textContent`, so any inline markup in the default
 * hint (e.g. a `<code>` element) is replaced by plain text. Callers that want
 * to preserve markup should leave the hint bar untouched.
 *
 * @param {object} deps
 * @param {HTMLElement} deps.hintEl - The hint bar element (e.g. #hint-bar).
 * @param {string} [deps.text] - Hint text to display. Defaults to a message
 *   directing the visitor to type `help`.
 * @returns {void}
 */
export function setHintBar({ hintEl, text } = {}) {
  if (!hintEl) return;
  const message =
    typeof text === 'string' && text.length > 0
      ? text
      : 'Type help to get started.';
  hintEl.textContent = message;
}
