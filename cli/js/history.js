// Command history for the Terminal Portfolio.
//
// Append-only list of submitted command lines with an index cursor for
// Up/Down arrow recall. Pure with respect to the DOM so it can be
// property-tested independently (see tasks 4.2 / 4.3 — ordering and
// navigation round-trip).
//
// Loaded as an ES module ("type": "module"). No DOM access.

/**
 * Tracks the ordered list of submitted, non-empty command lines for the
 * current session and a navigation cursor used by the Up/Down arrow keys.
 *
 * Cursor model: `_cursor` is an index into `_entries` in the range
 * `[0, _entries.length]`. A cursor equal to `_entries.length` means the user
 * is positioned past the newest entry (i.e. on a fresh/empty input line).
 *
 * - `previous()` (Up arrow) walks the cursor newest-to-oldest, clamping at the
 *   oldest entry.
 * - `next()` (Down arrow) walks the cursor oldest-to-newest; moving past the
 *   newest entry yields `''` to clear the input (Req 6.3).
 */
export class CommandHistory {
  constructor() {
    /** @type {string[]} Submitted non-empty lines in submission order. */
    this._entries = [];

    /**
     * @type {number} Navigation cursor in `[0, _entries.length]`.
     * Equal to `_entries.length` when positioned on a fresh input line.
     */
    this._cursor = 0;
  }

  /**
   * Append a command line to the history.
   *
   * Only non-empty lines are recorded (Req 6.4); empty or whitespace-only
   * lines are ignored. After any call the cursor is reset to point past the
   * newest entry so the next Up arrow returns the most recent entry.
   *
   * @param {string} line - The submitted command line.
   */
  push(line) {
    if (typeof line === 'string' && line.trim() !== '') {
      this._entries.push(line);
    }
    // Reset cursor to end (past newest) regardless of whether a line was
    // recorded, matching shell behavior where submitting resets recall.
    this._cursor = this._entries.length;
  }

  /**
   * Move to the previous (older) history entry (Up arrow).
   *
   * Walks the cursor newest-to-oldest. At the oldest entry the cursor stays
   * put and the oldest entry is returned again. Returns `null` when the
   * history is empty.
   *
   * @returns {string | null} The previous entry, or `null` if history is empty.
   */
  previous() {
    if (this._entries.length === 0) return null;
    if (this._cursor > 0) {
      this._cursor -= 1;
    }
    return this._entries[this._cursor];
  }

  /**
   * Move to the next (newer) history entry (Down arrow).
   *
   * Walks the cursor oldest-to-newest. Moving past the most recent entry
   * positions the cursor on a fresh input line and yields `''` to clear the
   * input (Req 6.3).
   *
   * @returns {string} The next entry, or `''` when past the newest entry.
   */
  next() {
    if (this._cursor < this._entries.length) {
      this._cursor += 1;
    }
    if (this._cursor >= this._entries.length) {
      this._cursor = this._entries.length;
      return '';
    }
    return this._entries[this._cursor];
  }

  /**
   * Get the recorded history entries in submission order.
   *
   * @returns {string[]} A copy of the entries, newest last.
   */
  entries() {
    return this._entries.slice();
  }
}
