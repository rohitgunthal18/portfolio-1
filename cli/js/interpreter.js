// CommandInterpreter for the Terminal Portfolio.
//
// Pure with respect to the DOM: tokenizes an input line, resolves the command
// against a registry of handlers, dispatches, and returns a structured
// CommandResult. Side-effects (open URL, clear, mailto, start matrix, set cwd)
// are expressed as data in `effects` and applied later by the rendering shell.
//
// The interpreter itself contains no command behavior beyond generic dispatch.
// The individual command handlers (ls, cd, cat, help, open, sudo, ...) are
// implemented in js/commands.js (tasks 6.2–6.4) and registered via the
// constructor. A `sudo` handler registered like any other command is supported
// by the generic dispatch here.
//
// Loaded as an ES module ("type": "module"). No DOM access.

/**
 * @typedef {{ text: string, className?: string }} Line
 *   A single rendered output line. `className` is an optional CSS class hint
 *   for the renderer (e.g. "error").
 */

/**
 * @typedef {(
 *   { kind: 'openUrl', url: string }
 *   | { kind: 'clear' }
 *   | { kind: 'mailto', href: string }
 *   | { kind: 'startMatrix' }
 *   | { kind: 'setCwd', path: string }
 * )} Effect
 *   A side-effect request produced by a command, applied by the rendering shell.
 */

/**
 * @typedef {{ lines: Line[], effects: Effect[], error: boolean }} CommandResult
 *   The structured result of interpreting a command line.
 */

/**
 * @typedef {(args: string[], context: object) => CommandResult} CommandHandler
 *   A pure command handler. Receives parsed arguments and the shared context
 *   ({ fs, history, config, ... }) and returns a CommandResult.
 */

/**
 * Build a CommandResult, filling in sensible defaults. Useful for handlers and
 * for the interpreter's own not-found result.
 *
 * @param {Partial<CommandResult>} [result]
 * @returns {CommandResult}
 */
export function makeResult({ lines = [], effects = [], error = false } = {}) {
  return { lines, effects, error };
}

/**
 * Convenience helper to build a single output line.
 *
 * @param {string} text
 * @param {string} [className]
 * @returns {Line}
 */
export function line(text, className) {
  return className == null ? { text } : { text, className };
}

/**
 * Tokenizes input, resolves commands against a registry, and dispatches.
 * Pure: never touches the DOM.
 */
export class CommandInterpreter {
  /**
   * @param {{ [name: string]: CommandHandler }} [registry]
   *   Map of command name -> handler. Handlers are implemented in
   *   js/commands.js and supplied here.
   */
  constructor(registry = {}) {
    /** @private @type {{ [name: string]: CommandHandler }} */
    this.registry = registry || {};
  }

  /**
   * Split a raw input line into a command token and its argument tokens.
   *
   * Leading/trailing whitespace is trimmed and runs of internal whitespace are
   * collapsed, so `"  ls   projects  "` tokenizes to
   * `{ command: 'ls', args: ['projects'] }`. An empty (or whitespace-only)
   * line yields `{ command: '', args: [] }`.
   *
   * @param {string} line - The raw input line.
   * @returns {{ command: string, args: string[] }}
   */
  tokenize(line) {
    const raw = line == null ? '' : String(line).trim();
    if (raw === '') {
      return { command: '', args: [] };
    }
    const tokens = raw.split(/\s+/);
    return { command: tokens[0], args: tokens.slice(1) };
  }

  /**
   * Interpret a single input line.
   *
   *   - Empty line          -> empty no-op result (no lines, no effects, no error).
   *   - Recognized command  -> the handler's CommandResult.
   *   - Unknown command     -> error result naming the command and suggesting `help`.
   *
   * @param {string} input - The raw input line.
   * @param {object} [context] - Shared handler context ({ fs, history, config, ... }).
   * @returns {CommandResult}
   */
  interpret(input, context = {}) {
    const { command, args } = this.tokenize(input);

    // Empty line: no-op, no error (Req: interpret of empty line is a no-op).
    if (command === '') {
      return makeResult();
    }

    // Only dispatch to commands that are own properties of the registry, so
    // inherited Object.prototype members (valueOf, toString, constructor,
    // hasOwnProperty, ...) are treated as unknown commands rather than being
    // invoked as handlers.
    const handler = Object.prototype.hasOwnProperty.call(this.registry, command)
      ? this.registry[command]
      : undefined;
    if (typeof handler === 'function') {
      return handler(args, context);
    }

    // Unknown command (Req 5.7): not-found message that suggests `help`.
    return makeResult({
      lines: [
        line(
          `${command}: command not found. Type 'help' for a list of commands.`,
          'error',
        ),
      ],
      effects: [],
      error: true,
    });
  }
}
