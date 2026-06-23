// FileSystemModel for the Terminal Portfolio.
//
// Pure with respect to the DOM: holds the simulated directory/file tree,
// resolves paths, lists directories, reads file contents, and computes the
// current working-directory path. Lookup failures raise typed errors
// (NotFoundError / IsDirectoryError) that command handlers convert into the
// standard shell-style messages.
//
// Node shapes (see js/config.js):
//   file = { type: 'file', content }      // name is the key in the parent's children map
//   dir  = { type: 'dir', name, children } // children keyed by name
//
// The home directory (root) is the directory named "Portfolio~".
// Loaded as an ES module ("type": "module").

/**
 * Raised when a path does not resolve to an existing node (or does not resolve
 * to a directory where a directory is required). Carries the offending `path`
 * so handlers can build messages like `cd: <path>: No such file or directory`.
 */
export class NotFoundError extends Error {
  /** @param {string} path - The path segment/string that failed to resolve. */
  constructor(path) {
    super(`No such file or directory: ${path}`);
    this.name = 'NotFoundError';
    this.code = 'ENOENT';
    this.path = path;
  }
}

/**
 * Raised when a file operation (e.g. `cat`) targets a directory. Carries the
 * offending `path` so handlers can build `cat: <name>: Is a directory`.
 */
export class IsDirectoryError extends Error {
  /** @param {string} path - The name/path that resolved to a directory. */
  constructor(path) {
    super(`Is a directory: ${path}`);
    this.name = 'IsDirectoryError';
    this.code = 'EISDIR';
    this.path = path;
  }
}

/**
 * Models the simulated file system and all navigation/lookup logic.
 *
 * The current working directory is tracked as a stack of directory nodes from
 * the root to the cwd, which makes `cd ..` and absolute-path reporting trivial.
 */
export class FileSystemModel {
  /**
   * @param {{ type: 'dir', name: string, children: object }} rootTree
   *   The home directory ("Portfolio~").
   */
  constructor(rootTree) {
    if (!rootTree || rootTree.type !== 'dir') {
      throw new Error('FileSystemModel requires a directory node as its root');
    }
    /** @private The home/root directory node. */
    this.root = rootTree;
    /** @private Chain of directory nodes from root (index 0) to cwd (last). */
    this._stack = [rootTree];
  }

  /**
   * The current working directory node (always a directory).
   * @returns {{ type: 'dir', name: string, children: object }}
   */
  get cwd() {
    return this._stack[this._stack.length - 1];
  }

  /**
   * Absolute path of the current working directory, e.g. "Portfolio~/projects".
   * @returns {string}
   */
  get cwdPath() {
    return this._stack.map((node) => node.name).join('/');
  }

  /**
   * @param {object} node - Any node.
   * @returns {boolean} True if the node is a directory node.
   */
  isDirectory(node) {
    return !!node && node.type === 'dir';
  }

  /**
   * Walk a path and return the resulting chain of nodes from the root, or null
   * if any segment fails to resolve. Supports:
   *   - empty/undefined  -> the current working directory
   *   - absolute paths   -> when the first segment equals the home name
   *   - relative paths   -> resolved from the current working directory
   *   - "." (no-op) and ".." (parent; no-op at home)
   *   - single segments and slash-separated paths
   *
   * @private
   * @param {string|undefined|null} path
   * @returns {object[]|null} The node chain ending at the resolved node, or null.
   */
  _walk(path) {
    const raw = path == null ? '' : String(path).trim();
    let segments = raw.split('/').filter((s) => s.length > 0);

    let stack;
    if (segments.length > 0 && segments[0] === this.root.name) {
      // Absolute path anchored at the home directory.
      stack = [this.root];
      segments = segments.slice(1);
    } else {
      // Relative to the current working directory.
      stack = this._stack.slice();
    }

    for (const seg of segments) {
      if (seg === '.') continue;
      if (seg === '..') {
        // Move to parent; at home (only the root on the stack) this is a no-op.
        if (stack.length > 1) stack.pop();
        continue;
      }
      const current = stack[stack.length - 1];
      // Cannot descend into a file.
      if (current.type !== 'dir') return null;
      const child = current.children[seg];
      if (!child) return null;
      stack.push(child);
    }

    return stack;
  }

  /**
   * Resolve a path to a node, relative to the cwd or absolute.
   * @param {string} [path]
   * @returns {object|null} The resolved node, or null if it does not exist.
   */
  resolve(path) {
    const stack = this._walk(path);
    return stack ? stack[stack.length - 1] : null;
  }

  /**
   * List the child names of a directory (sorted). With no argument, lists the
   * current working directory.
   * @param {string} [path]
   * @returns {string[]} Sorted child names.
   * @throws {NotFoundError} If the path does not resolve to a directory.
   */
  list(path) {
    let node;
    if (path == null || String(path).trim() === '') {
      node = this.cwd;
    } else {
      node = this.resolve(path);
    }
    if (!this.isDirectory(node)) {
      throw new NotFoundError(path == null ? '' : String(path));
    }
    return Object.keys(node.children).sort();
  }

  /**
   * Change the working directory.
   *   - empty/undefined argument -> reset to the home directory "Portfolio~"
   *   - ".."                      -> parent (no-op at home)
   *   - a name or slash path      -> the target directory
   *
   * @param {string} [arg]
   * @throws {NotFoundError} If the argument does not resolve to a directory.
   *   The working directory is left unchanged when an error is raised.
   */
  changeDir(arg) {
    const trimmed = arg == null ? '' : String(arg).trim();

    // `cd` with no argument resets to home.
    if (trimmed === '') {
      this._stack = [this.root];
      return;
    }

    const stack = this._walk(trimmed);
    if (stack === null) {
      throw new NotFoundError(trimmed);
    }
    const target = stack[stack.length - 1];
    if (target.type !== 'dir') {
      // Target exists but is a file: it is not a directory we can enter.
      throw new NotFoundError(trimmed);
    }
    this._stack = stack;
  }

  /**
   * Read the textual content of a file.
   * @param {string} name - A file name in the cwd, or a path to a file.
   * @returns {string} The file's stored content.
   * @throws {NotFoundError} If the name does not resolve to any node.
   * @throws {IsDirectoryError} If the name resolves to a directory.
   */
  readFile(name) {
    const target = name == null ? '' : String(name);
    const node = this.resolve(target);
    if (node == null) {
      throw new NotFoundError(target);
    }
    if (node.type === 'dir') {
      throw new IsDirectoryError(target);
    }
    return node.content;
  }

  /**
   * Render an indented hierarchy of a directory and all its descendants. With
   * no argument, renders the current working directory. The starting directory
   * name appears on the first line; each descendant is indented two spaces per
   * level of depth, so indentation increases monotonically with depth.
   *
   * @param {string} [path]
   * @returns {string} The indented tree, lines joined by "\n".
   * @throws {NotFoundError} If the path does not resolve to a directory.
   */
  tree(path) {
    let node;
    if (path == null || String(path).trim() === '') {
      node = this.cwd;
    } else {
      node = this.resolve(path);
    }
    if (!this.isDirectory(node)) {
      throw new NotFoundError(path == null ? '' : String(path));
    }

    const lines = [node.name];
    const indent = (depth) => '  '.repeat(depth);
    const walk = (dirNode, depth) => {
      const names = Object.keys(dirNode.children).sort();
      for (const name of names) {
        const child = dirNode.children[name];
        lines.push(indent(depth) + name);
        if (child.type === 'dir') {
          walk(child, depth + 1);
        }
      }
    };
    walk(node, 1);
    return lines.join('\n');
  }
}
