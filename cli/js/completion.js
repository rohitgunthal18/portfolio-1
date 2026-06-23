// TabCompletion for the Terminal Portfolio.
//
// Pure with respect to the DOM: given a partial input line and a completion
// context, returns a completion result describing whether/how the input should
// change. The rendering shell (TerminalRenderer) calls this on the Tab key and
// either replaces the input (unique match) or prints the candidate list
// (ambiguous match), leaving the input unchanged when there is no match.
//
// Loaded as an ES module ("type": "module"). No DOM access.
//
// Context shape:
//   {
//     commandNames: string[],   // available command names (command position)
//     fs: FileSystemModel,      // provides list()/resolve() for path arguments
//   }
//
// `commandNames` may also be supplied as a registry object whose keys are the
// command names (e.g. the CommandInterpreter registry); the keys are used in
// that case. This keeps callers flexible.

/**
 * @typedef {{ completed: string, candidates: string[], changed: boolean }} CompletionResult
 *   - completed:  the (possibly unchanged) input line after completion.
 *   - candidates: matches to display when ambiguous (sorted); [] otherwise,
 *                 or the single match for a unique completion.
 *   - changed:    true only when `completed` differs from the input.
 */

/**
 * Extract the list of command names from the context. Accepts either an array
 * of names or a registry object whose keys are the command names.
 *
 * @param {string[] | { [name: string]: unknown } | undefined | null} commandNames
 * @returns {string[]}
 */
function resolveCommandNames(commandNames) {
  if (Array.isArray(commandNames)) return commandNames;
  if (commandNames && typeof commandNames === 'object') {
    return Object.keys(commandNames);
  }
  return [];
}

/**
 * List the entry names of the directory that holds the final segment of a path
 * token, plus the prefix used to match within it. For a plain token like
 * "pro" the relevant directory is the current working directory and the prefix
 * is "pro". For a slash path like "projects/pi" the relevant directory is
 * "projects" and the prefix is "pi". The directory portion (everything up to
 * and including the last slash) is preserved so it can be re-attached to the
 * completed entry.
 *
 * @param {string} token - The partial path token being completed.
 * @param {object} fs - A FileSystemModel exposing list()/resolve().
 * @returns {{ entries: string[], prefix: string, dirPrefix: string }}
 */
function listPathEntries(token, fs) {
  const slashIndex = token.lastIndexOf('/');

  // No slash: match within the current working directory.
  if (slashIndex === -1) {
    const entries = fs && typeof fs.list === 'function' ? safeList(fs) : [];
    return { entries, prefix: token, dirPrefix: '' };
  }

  // Slash path: resolve the directory portion and match within it.
  const dirPath = token.slice(0, slashIndex); // may be '' for a leading '/'
  const prefix = token.slice(slashIndex + 1);
  const dirPrefix = token.slice(0, slashIndex + 1); // includes the trailing '/'
  const entries =
    fs && typeof fs.list === 'function' ? safeListPath(fs, dirPath) : [];
  return { entries, prefix, dirPrefix };
}

/**
 * fs.list() with no argument, swallowing lookup errors into an empty list.
 * @param {object} fs
 * @returns {string[]}
 */
function safeList(fs) {
  try {
    return fs.list();
  } catch {
    return [];
  }
}

/**
 * fs.list(path), swallowing lookup errors into an empty list.
 * @param {object} fs
 * @param {string} path
 * @returns {string[]}
 */
function safeListPath(fs, path) {
  try {
    return fs.list(path);
  } catch {
    return [];
  }
}

/**
 * Complete a partial terminal input line.
 *
 * Behavior:
 *   - Command position (no space typed yet): match `context.commandNames` by
 *     prefix.
 *   - Path position (a command plus a partial argument): match entries in the
 *     relevant directory by prefix of the last path segment.
 *   - Unique match  -> the input with the partial token replaced by the match
 *     (changed=true, candidates=[match]).
 *   - Ambiguous     -> the sorted list of all matches (changed=false, input
 *     unchanged).
 *   - No match      -> input unchanged (changed=false, candidates=[]).
 *
 * @param {string} input - The raw partial input line.
 * @param {{ commandNames?: string[] | object, fs?: object }} [context]
 * @returns {CompletionResult}
 */
export function complete(input, context = {}) {
  const original = input == null ? '' : String(input);
  const unchanged = { completed: original, candidates: [], changed: false };

  // Determine whether we are in the command position or a path-argument
  // position. We are in the command position only while typing the first
  // token (no whitespace yet). A trailing space means the first token is
  // complete, so we are completing an argument (the empty path token).
  const hasSpace = /\s/.test(original);

  if (!hasSpace) {
    // ---- Command position ----
    const prefix = original;
    const names = resolveCommandNames(context.commandNames);
    const matches = names.filter((name) => name.startsWith(prefix)).sort();
    return finish(original, '', prefix, matches);
  }

  // ---- Path-argument position ----
  // Preserve everything up to (and including) the last run of whitespace so the
  // completed token can be re-attached to the command and any preceding args.
  const match = original.match(/^(.*\s)(\S*)$/s);
  // `head` includes the trailing whitespace; `token` is the partial argument.
  const head = match ? match[1] : original;
  const token = match ? match[2] : '';

  const { fs } = context;
  const { entries, prefix, dirPrefix } = listPathEntries(token, fs);
  const matches = entries.filter((name) => name.startsWith(prefix)).sort();

  return finish(original, head + dirPrefix, prefix, matches);
}

/**
 * Assemble the CompletionResult from the matched candidates.
 *
 *   - 0 matches   -> unchanged.
 *   - 1 match     -> replace the partial token, changed=true.
 *   - >1 matches  -> candidate list for display, input unchanged.
 *
 * @param {string} original - The original full input line.
 * @param {string} head     - Everything before the partial token (command +
 *                             preceding args + any directory prefix).
 * @param {string} prefix   - The partial token being completed.
 * @param {string[]} matches - Sorted matching candidate names.
 * @returns {CompletionResult}
 */
function finish(original, head, prefix, matches) {
  if (matches.length === 0) {
    return { completed: original, candidates: [], changed: false };
  }
  if (matches.length === 1) {
    const completed = head + matches[0];
    return {
      completed,
      candidates: [matches[0]],
      changed: completed !== original,
    };
  }
  // Ambiguous: list candidates, leave the input unchanged.
  return { completed: original, candidates: matches, changed: false };
}
