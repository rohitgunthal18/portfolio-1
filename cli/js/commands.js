// Command handlers and registry factory for the Terminal Portfolio.
//
// Each handler is a pure function `(args, context) => CommandResult`, where
//   context = { fs, history, config, registry }
//     fs       : FileSystemModel (js/fileSystem.js)
//     history  : CommandHistory  (js/history.js)
//     config   : CONFIG          (js/config.js)
//     registry : the command registry (used by `help`)
//
// Handlers contain NO DOM access. Side-effects (open URL, clear, mailto, start
// matrix) are returned as data in `CommandResult.effects` and applied later by
// the rendering shell. Lookup failures from the FileSystemModel surface as
// typed errors (NotFoundError / IsDirectoryError) which handlers convert into
// the standard shell-style messages.
//
// Loaded as an ES module ("type": "module").

import { makeResult, line } from './interpreter.js';
import { NotFoundError, IsDirectoryError } from './fileSystem.js';

// ---------------------------------------------------------------------------
// Command descriptions (used by `help`).
//
// Every command registered by `createCommandRegistry` MUST have an entry here
// so that help output contains every registered command name plus a
// description (Property 12 / Req 5.1).
// ---------------------------------------------------------------------------

/** @type {{ [name: string]: string }} */
export const COMMAND_DESCRIPTIONS = {
  ls: 'List the contents of the current or given directory',
  cd: 'Change the working directory (cd, cd .., cd <dir>)',
  pwd: 'Print the absolute path of the working directory',
  tree: 'Print the directory hierarchy as an indented tree',
  cat: 'Print the contents of a file',
  help: 'List all available commands with a short description',
  clear: 'Clear the terminal output',
  whoami: 'Print a short identity summary of the portfolio owner',
  history: 'Show the command history for this session',
  open: 'Open a URL in a new browser tab (open <url>)',
  cv: "Open Rohit's CV/resume in a new tab",
  resume: "Open Rohit's CV/resume in a new tab (alias of cv)",
  gui: "Open the full graphical portfolio website in a new tab — type 'gui'",
  contact: 'Email Rohit, optionally with a message (contact <message>)',
  matrix: 'Enter the matrix (falling-character animation)',
  sudo: 'Attempt a privileged action... if you dare',
  hack: 'Initiate a totally legit hacking sequence',
  permissions: 'Show your account access rights (what you can and cannot do)',
  perms: 'Show your account access rights (alias of permissions)',
};

// ===========================================================================
// Task 6.2 — Navigation and content command handlers (Req 3.3–3.10, 4.1–4.3)
// ===========================================================================

/**
 * `ls [path]` — list the current working directory, or the directory at the
 * given path. Child names are joined (sorted by the model) into a single line.
 * (Req 3.3, 3.4)
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function ls(args, context) {
  const { fs } = context;
  const path = args[0];
  try {
    const names = fs.list(path);
    // An empty directory produces no output lines.
    if (names.length === 0) {
      return makeResult();
    }
    return makeResult({ lines: [line(names.join('  '))] });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return makeResult({
        lines: [line(`ls: ${path}: No such file or directory`, 'error')],
        error: true,
      });
    }
    throw err;
  }
}

/**
 * `cd [path]` — change the working directory. With no argument resets to home;
 * `cd ..` moves to the parent; `cd <dir>` enters a child/path. On an invalid
 * path the working directory is left unchanged and an error is reported.
 * (Req 3.5–3.8)
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function cd(args, context) {
  const { fs } = context;
  const path = args[0];
  try {
    fs.changeDir(path);
    return makeResult();
  } catch (err) {
    if (err instanceof NotFoundError) {
      return makeResult({
        lines: [line(`cd: ${path}: No such file or directory`, 'error')],
        error: true,
      });
    }
    throw err;
  }
}

/**
 * `pwd` — print the absolute path of the current working directory. (Req 3.9)
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function pwd(args, context) {
  const { fs } = context;
  return makeResult({ lines: [line(fs.cwdPath)] });
}

/**
 * `tree` — print the indented hierarchy of the current working directory.
 * (Req 3.10)
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function tree(args, context) {
  const { fs } = context;
  const rendered = fs.tree();
  const lines = rendered.split('\n').map((text) => line(text));
  return makeResult({ lines });
}

/**
 * `cat <file>` — print the textual content of a file in the current working
 * directory. Missing file / directory targets and a missing argument produce
 * the standard messages. (Req 4.1–4.3)
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function cat(args, context) {
  const { fs } = context;
  const name = args[0];

  if (name == null || name === '') {
    return makeResult({
      lines: [line('Usage: cat <file>', 'error')],
      error: true,
    });
  }

  try {
    const content = fs.readFile(name);
    const lines = content.split('\n').map((text) => line(text));
    return makeResult({ lines });
  } catch (err) {
    if (err instanceof IsDirectoryError) {
      return makeResult({
        lines: [line(`cat: ${name}: Is a directory`, 'error')],
        error: true,
      });
    }
    if (err instanceof NotFoundError) {
      return makeResult({
        lines: [line(`cat: ${name}: No such file or directory`, 'error')],
        error: true,
      });
    }
    throw err;
  }
}

// ===========================================================================
// Task 6.3 — Utility command handlers (Req 5.1–5.6)
// ===========================================================================

/**
 * `help` — list every registered command together with a one-line
 * description. Iterates the actual registry so every registered command name
 * appears in the output (Property 12 / Req 5.1).
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function help(args, context) {
  const registry = (context && context.registry) || {};
  // Only list commands that have a description. Read-only write commands
  // (mv, rm, ...) are registered to return permission-denied messages but are
  // intentionally hidden from help to keep it focused on what visitors can do.
  const names = Object.keys(registry)
    .filter((n) => COMMAND_DESCRIPTIONS[n])
    .sort();

  const lines = [line('Available commands:'), line('')];
  // Align descriptions in a column for readability.
  const width = names.reduce((max, n) => Math.max(max, n.length), 0);
  for (const name of names) {
    const desc = COMMAND_DESCRIPTIONS[name] || '';
    lines.push(line(`  ${name.padEnd(width)}  ${desc}`));
  }
  lines.push(line(''));
  lines.push(line("Tip: try 'ls', 'cat about/about.txt', or 'cv'."));
  lines.push(line("New to terminals? Type 'gui' to open the full graphical portfolio website."));
  lines.push(line("Curious what you can do? Type 'permissions'."));
  return makeResult({ lines });
}

/**
 * `clear` — emit a clear effect that the renderer uses to wipe prior output.
 * (Req 5.2)
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function clear(args, context) {
  return makeResult({ effects: [{ kind: 'clear' }] });
}

/**
 * `whoami` — print a short identity summary of the portfolio owner. (Req 5.3)
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function whoami(args, context) {
  return makeResult({
    lines: [
      line('Rohit Balasaheb Gunthal'),
      line('AI-Powered Full-Stack Developer — focused on Agentic AI,'),
      line('with a growing interest in Cybersecurity.'),
      line('2025 B.Sc Computer Science graduate · Top 3% global ChatGPT user (2025).'),
      line("Type 'cat about/about.txt' for more, or 'cv' to view my resume."),
    ],
  });
}

/**
 * `history` — print the session command history in entry order (numbered).
 * (Req 5.4)
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function history(args, context) {
  const hist = context && context.history;
  const entries = hist && typeof hist.entries === 'function' ? hist.entries() : [];
  if (entries.length === 0) {
    return makeResult();
  }
  const width = String(entries.length).length;
  const lines = entries.map((entry, i) =>
    line(`  ${String(i + 1).padStart(width)}  ${entry}`),
  );
  return makeResult({ lines });
}

/**
 * `open <url>` — validate a URL with the URL constructor and only permit
 * http/https schemes before emitting an openUrl effect. A missing argument or
 * an invalid / non-http(s) value produces a usage message and no effect.
 * (Req 5.5, 5.6)
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function open(args, context) {
  const usage = () =>
    makeResult({ lines: [line('Usage: open <url>', 'error')], error: true });

  const url = args[0];
  if (url == null || url === '') {
    return usage();
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return usage();
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return usage();
  }

  return makeResult({
    lines: [line(`Opening ${url} ...`)],
    effects: [{ kind: 'openUrl', url }],
  });
}

// ===========================================================================
// Task 6.4 — cv/resume, contact, and easter-egg handlers
// (Req 9.1–9.3, 10.2–10.3, 11.1, 11.3, 11.4)
// ===========================================================================

/**
 * `cv` / `resume` — open the configured CV link in a new tab and print a
 * confirmation line. Both aliases share this implementation so they produce
 * identical results (Property 23 / Req 9.1–9.3).
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function cv(args, context) {
  const { config } = context;
  const url = config.CV_LINK;
  return makeResult({
    lines: [line('Opening CV/resume in a new tab...')],
    effects: [{ kind: 'openUrl', url }],
  });
}

// `resume` is an exact alias of `cv` (identical behavior — Property 23).
export const resume = cv;

/**
 * `gui` — open the full graphical portfolio website in a new tab, for visitors
 * who prefer a traditional GUI site over the terminal. Opens CONFIG.GUI_LINK
 * and prints a confirmation line.
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function gui(args, context) {
  const { config } = context;
  const url = config.GUI_LINK;
  return makeResult({
    lines: [
      line('Opening the graphical portfolio website in a new tab...'),
      line(url),
    ],
    effects: [{ kind: 'openUrl', url }],
  });
}

/**
 * `contact [message...]` — emit a mailto effect addressed to the owner. When a
 * message is supplied (args joined by spaces) it is included as a `?body=`
 * query whose value is `encodeURIComponent(message)`, so the body decodes back
 * to exactly the original message (Property 24 / Req 10.2, 10.3).
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function contact(args, context) {
  const { config } = context;
  const email = config.OWNER_EMAIL;
  const message = args.join(' ');

  let href = `mailto:${email}`;
  if (message !== '') {
    href += `?body=${encodeURIComponent(message)}`;
  }

  const lines = [line(`Opening your mail client to email ${email} ...`)];
  if (message !== '') {
    lines.push(line(`Message: ${message}`));
  }

  return makeResult({ lines, effects: [{ kind: 'mailto', href }] });
}

/**
 * `matrix` — start the falling-character animation via a startMatrix effect.
 * (Req 11.1)
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function matrix(args, context) {
  return makeResult({
    lines: [line('Entering the matrix... (press any key to exit)')],
    effects: [{ kind: 'startMatrix' }],
  });
}

/**
 * `sudo ...` — humorous permission-denied response. Returns `error: true` and
 * produces NO effects other than output for any argument sequence (Property 25
 * / Req 11.3).
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function sudo(args, context) {
  const user =
    (context && context.config && context.config.PROMPT_USER) || 'visitor';
  return makeResult({
    lines: [
      line(`[sudo] password for ${user}: Permission denied. Nice try ;)`, 'error'),
    ],
    error: true,
  });
}

/**
 * `hack` — an additional easter egg beyond matrix and sudo (Req 11.4). Prints a
 * tongue-in-cheek "hacking" message; no effects.
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function hack(args, context) {
  // The real show is an interactive, timed simulation handled by the rendering
  // shell (js/hack.js) via the startHack effect. No output lines here so the
  // simulation owns the screen from the first frame.
  return makeResult({ effects: [{ kind: 'startHack', target: args[0] || '' }] });
}

// ===========================================================================
// Read-only file system: write/modify operations are recognised but denied.
//
// The `visitor` account has read-only access. Rather than emitting a generic
// "command not found" for common write commands (mv, cp, rm, mkdir, touch,
// editors, chmod, ...), we register them and return a realistic Linux-style
// permission-denied message. This both looks authentic and tells the visitor
// why the operation failed. (See also the `permissions` command below.)
// ===========================================================================

/**
 * Names of the write/modify commands that are recognised but denied for the
 * read-only `visitor` account, mapped to the canonical name shown in messages.
 */
export const WRITE_COMMANDS = [
  'mv',
  'cp',
  'rm',
  'rmdir',
  'mkdir',
  'touch',
  'edit',
  'nano',
  'vim',
  'vi',
  'emacs',
  'chmod',
  'chown',
  'ln',
  'echo',
  'tee',
  'write',
  'rename',
];

/**
 * Build a read-only permission-denied handler for a given write command name.
 * Returns a Linux-style "Permission denied" message and NO effects, since the
 * simulated file system is read-only for the visitor account.
 *
 * @param {string} name - The command name (e.g. "mv", "rm").
 * @returns {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function makeReadOnlyHandler(name) {
  return function readOnlyDenied(args, context) {
    const user =
      (context && context.config && context.config.PROMPT_USER) || 'visitor';
    const target = args.find((a) => a && !a.startsWith('-'));
    const where = target ? `: '${target}'` : '';
    return makeResult({
      lines: [
        line(`${name}: cannot ${name}${where}: Permission denied`, 'error'),
        line(
          `The '${user}' account has read-only access. Type 'permissions' to see what you can do.`,
          'error',
        ),
      ],
      error: true,
    });
  };
}

/**
 * `permissions` (alias `perms`) — list the current user's access rights, so a
 * visitor can see exactly what they are allowed to do. Read operations are
 * permitted; all write/modify operations are denied (read-only account).
 *
 * @type {(args: string[], context: object) => import('./interpreter.js').CommandResult}
 */
export function permissions(args, context) {
  const user =
    (context && context.config && context.config.PROMPT_USER) || 'visitor';
  const host =
    (context && context.config && context.config.PROMPT_HOST) || 'portfolio';
  return makeResult({
    lines: [
      line(`Permissions for ${user}@${host}:`),
      line(''),
      line('  ACCESS LEVEL : read-only (guest)'),
      line(''),
      line('  ALLOWED:'),
      line('    r  ls       list directory contents'),
      line('    r  cd       change directory'),
      line('    r  pwd      print working directory'),
      line('    r  cat      read file contents'),
      line('    r  tree     view the directory hierarchy'),
      line('    r  open     open an external URL'),
      line(''),
      line('  DENIED (read-only account):'),
      line('    x  mv, cp, rm, rmdir, mkdir, touch   modify the file system'),
      line('    x  nano, vim, vi, edit, emacs        edit files'),
      line('    x  chmod, chown                      change permissions/ownership'),
      line('    x  sudo                              run privileged commands'),
      line(''),
      line("Tip: this is a portfolio — feel free to look around with 'ls' and 'cat'."),
    ],
  });
}

// ===========================================================================
// Registry factory
// ===========================================================================

/**
 * Build the command registry mapping command names to their pure handlers.
 * `cv` and `resume` map to the same function so the aliases behave identically.
 * Every command here has a matching entry in COMMAND_DESCRIPTIONS so `help`
 * reflects all of them.
 *
 * @returns {{ [name: string]: import('./interpreter.js').CommandHandler }}
 */
export function createCommandRegistry() {
  const registry = {
    // Navigation & content (6.2)
    ls,
    cd,
    pwd,
    tree,
    cat,
    // Utilities (6.3)
    help,
    clear,
    whoami,
    history,
    open,
    // CV / contact / easter eggs (6.4)
    cv,
    resume,
    gui,
    contact,
    matrix,
    sudo,
    hack,
    // Account access (read-only)
    permissions,
    perms: permissions,
  };

  // Register read-only write/modify commands so they return a realistic
  // permission-denied message instead of "command not found".
  for (const name of WRITE_COMMANDS) {
    registry[name] = makeReadOnlyHandler(name);
  }

  return registry;
}
