// Shared fast-check generators and tree helpers for FileSystemModel property tests.
//
// Pure ES module. These generators build *valid* simulated file-system trees
// (matching the node shapes in js/config.js) and helpers for enumerating the
// directories / files inside a generated tree, plus a generator for path
// strings that do NOT resolve in a given directory (for error-condition
// properties).
//
// Node shapes (see js/config.js):
//   file = { type: 'file', content }      // name is the key in parent's children
//   dir  = { type: 'dir', name, children } // children keyed by name
//
// The home/root directory is always named "Portfolio~" (CONFIG.HOME).

import fc from 'fast-check';
import { file, dir } from '../../js/config.js';

/** The home directory name, matching CONFIG.HOME. */
export const ROOT_NAME = 'Portfolio~';

// Path-segment-safe name characters: no '/', '.', whitespace or '~', so any
// generated name is a single valid path segment that never collides with the
// special segments '.', '..' or the absolute-path anchor "Portfolio~".
const NAME_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'.split('');

/** Arbitrary for a valid file/directory name (single path segment). */
export const nameArb = fc
  .array(fc.constantFrom(...NAME_CHARS), { minLength: 1, maxLength: 8 })
  .map((chars) => chars.join(''))
  .filter((s) => s !== '.' && s !== '..' && s !== ROOT_NAME);

/** Arbitrary for file content (may be empty for the general-purpose generator). */
export const fileContentArb = fc.string({ maxLength: 60 });

/**
 * Build an arbitrary that produces a children map for a directory.
 *
 * @param {number} depth - Remaining depth budget. At depth <= 1 only files are
 *   produced (no further nesting).
 * @param {number} maxChildren - Maximum number of children per directory.
 */
function childrenArb(depth, maxChildren) {
  return fc
    .uniqueArray(nameArb, { maxLength: maxChildren })
    .chain((names) => {
      if (names.length === 0) return fc.constant({});
      const entryArbs = names.map((name) =>
        nodeArb(name, depth).map((node) => [name, node])
      );
      return fc.tuple(...entryArbs).map((entries) => Object.fromEntries(entries));
    });
}

/**
 * Build an arbitrary for a single node (file or, when depth allows, directory).
 *
 * @param {string} name - The node's name (used for directory nodes).
 * @param {number} depth - Remaining depth budget.
 */
function nodeArb(name, depth) {
  const fileArb = fileContentArb.map((content) => file(content));
  if (depth <= 1) return fileArb;
  const dirArb = childrenArb(depth - 1, 4).map((children) => dir(name, children));
  return fc.oneof(fileArb, dirArb);
}

/**
 * Generator for a valid file-system tree rooted at the home directory.
 * Produces trees of varying depth, fan-out, names, and file contents.
 *
 * @param {{ maxDepth?: number, maxChildren?: number }} [opts]
 * @returns {fc.Arbitrary<object>} A directory node named "Portfolio~".
 */
export function fsTreeArbitrary({ maxDepth = 3, maxChildren = 3 } = {}) {
  return childrenArb(maxDepth, maxChildren).map((children) => dir(ROOT_NAME, children));
}

/**
 * Enumerate every directory in a tree, including the root.
 *
 * @param {object} root - The root directory node.
 * @returns {Array<{ path: string, parentPath: string|null, name: string, node: object }>}
 *   `path` is the absolute path (e.g. "Portfolio~/projects"); the root's
 *   `parentPath` is null.
 */
export function collectDirs(root) {
  const result = [];
  const walk = (node, parts, parentPath) => {
    const path = parts.join('/');
    result.push({ path, parentPath, name: parts[parts.length - 1], node });
    for (const [childName, child] of Object.entries(node.children)) {
      if (child.type === 'dir') walk(child, [...parts, childName], path);
    }
  };
  walk(root, [root.name], null);
  return result;
}

/**
 * Enumerate every file in a tree.
 *
 * @param {object} root - The root directory node.
 * @returns {Array<{ name: string, content: string, dirPath: string, path: string }>}
 *   `dirPath` is the absolute path of the containing directory; `path` is the
 *   absolute path of the file itself.
 */
export function collectFiles(root) {
  const result = [];
  const walk = (node, parts) => {
    for (const [childName, child] of Object.entries(node.children)) {
      if (child.type === 'file') {
        result.push({
          name: childName,
          content: child.content,
          dirPath: parts.join('/'),
          path: [...parts, childName].join('/'),
        });
      } else {
        walk(child, [...parts, childName]);
      }
    }
  };
  walk(root, [root.name]);
  return result;
}

/**
 * Enumerate every descendant node (files and directories) below the root,
 * tagged with its depth relative to the root (root's direct children = depth 1).
 *
 * @param {object} root - The root directory node.
 * @returns {Array<{ name: string, depth: number, type: string }>}
 */
export function collectDescendants(root) {
  const result = [];
  const walk = (node, depth) => {
    for (const [childName, child] of Object.entries(node.children)) {
      result.push({ name: childName, depth, type: child.type });
      if (child.type === 'dir') walk(child, depth + 1);
    }
  };
  walk(root, 1);
  return result;
}

/**
 * Arbitrary that yields a single-segment name guaranteed NOT to exist as a
 * child of the given directory node (for "missing path" error properties).
 *
 * @param {object} dirNode - The directory node whose children must be avoided.
 */
export function missingNameArb(dirNode) {
  const existing = new Set(Object.keys(dirNode.children));
  return nameArb.filter((name) => !existing.has(name));
}

// ---------------------------------------------------------------------------
// Tab-completion prefix helpers (Properties 18–21).
//
// These derive *unique*, *ambiguous*, and *non-matching* prefixes from a
// candidate set (command names or directory entry names) so the completion
// properties can be exercised across many generated inputs.
// ---------------------------------------------------------------------------

/**
 * All prefixes of `target` (lengths 1..target.length) that are matched by
 * exactly one candidate — namely `target` itself — so the prefix uniquely
 * identifies the target within `candidates`.
 *
 * @param {string} target
 * @param {string[]} candidates - The full candidate set (must include target).
 * @returns {string[]} Uniquely-identifying prefixes of target.
 */
export function uniquePrefixesOf(target, candidates) {
  const result = [];
  for (let len = 1; len <= target.length; len++) {
    const p = target.slice(0, len);
    const matches = candidates.filter((c) => c.startsWith(p));
    if (matches.length === 1 && matches[0] === target) result.push(p);
  }
  return result;
}

/**
 * Uniquely-identifying prefixes that are strictly shorter than `target` (i.e.
 * a genuine *partial* input whose completion actually changes the line).
 *
 * @param {string} target
 * @param {string[]} candidates
 * @returns {string[]}
 */
export function properUniquePrefixesOf(target, candidates) {
  return uniquePrefixesOf(target, candidates).filter((p) => p.length < target.length);
}

/**
 * Arbitrary producing a candidate set guaranteed to contain an *ambiguous*
 * prefix: two distinct names sharing the same non-empty leading `prefix`, plus
 * optional unrelated names. The yielded `prefix` is matched by at least two of
 * the names.
 *
 * @returns {fc.Arbitrary<{ prefix: string, names: string[] }>}
 */
export const ambiguousNamesArb = fc
  .record({
    prefix: nameArb,
    suffixA: nameArb,
    suffixB: nameArb,
    extra: fc.uniqueArray(nameArb, { maxLength: 4 }),
  })
  .map(({ prefix, suffixA, suffixB, extra }) => {
    const names = Array.from(
      new Set([prefix + suffixA, prefix + suffixB, ...extra])
    );
    return { prefix, names };
  })
  .filter(({ prefix, names }) => names.filter((n) => n.startsWith(prefix)).length >= 2);

/**
 * Arbitrary yielding a non-empty prefix that is NOT a prefix of any name in
 * `candidates` (so completion finds no match and must leave the input alone).
 *
 * @param {string[]} candidates
 * @returns {fc.Arbitrary<string>}
 */
export function nonMatchingPrefixArb(candidates) {
  return nameArb.filter((p) => !candidates.some((c) => c.startsWith(p)));
}
