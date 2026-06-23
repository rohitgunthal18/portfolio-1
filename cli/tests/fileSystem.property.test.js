// Property-based tests for FileSystemModel (Feature: terminal-portfolio).
//
// Each test below implements a single correctness property from design.md and
// uses fast-check with numRuns >= 100. Generators live in
// tests/helpers/generators.js. The home/root directory is always "Portfolio~".

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  FileSystemModel,
  NotFoundError,
  IsDirectoryError,
} from '../js/fileSystem.js';
import { PORTFOLIO_FS } from '../js/content.js';
import {
  fsTreeArbitrary,
  collectDirs,
  collectFiles,
  collectDescendants,
  missingNameArb,
  ROOT_NAME,
} from './helpers/generators.js';

const RUNS = { numRuns: 100 };

// Arbitrary: a tree paired with one of its reachable directories.
const treeWithDir = fsTreeArbitrary().chain((root) => {
  const dirs = collectDirs(root);
  return fc.record({
    root: fc.constant(root),
    dir: fc.constantFrom(...dirs),
  });
});

// Arbitrary: a tree that contains at least one file, paired with one such file.
const treeWithFile = fsTreeArbitrary()
  .filter((root) => collectFiles(root).length > 0)
  .chain((root) => {
    const files = collectFiles(root);
    return fc.record({
      root: fc.constant(root),
      fileEntry: fc.constantFrom(...files),
    });
  });

// Arbitrary: a tree containing a directory that has at least one child directory.
const treeWithParentChildDir = fsTreeArbitrary()
  .filter((root) =>
    collectDirs(root).some((d) =>
      Object.values(d.node.children).some((c) => c.type === 'dir')
    )
  )
  .chain((root) => {
    const parents = collectDirs(root).filter((d) =>
      Object.values(d.node.children).some((c) => c.type === 'dir')
    );
    return fc.record({ root: fc.constant(root), parent: fc.constantFrom(...parents) });
  });

// Feature: terminal-portfolio, Property 1: ls lists exactly the target directory's children. For any reachable directory, ls (no arg while positioned in it, or ls <path>) returns exactly that directory's child names and nothing else.
// Validates: Requirements 3.3, 3.4
describe('Property 1: ls lists exactly the target directory children', () => {
  it('returns exactly the child names via both ls (cwd) and ls <path>', () => {
    fc.assert(
      fc.property(treeWithDir, ({ root, dir }) => {
        const expected = Object.keys(dir.node.children).sort();

        // ls <path> from home.
        const fsA = new FileSystemModel(root);
        expect(fsA.list(dir.path)).toEqual(expected);

        // ls with no argument while positioned in the directory.
        const fsB = new FileSystemModel(root);
        fsB.changeDir(dir.path);
        expect(fsB.list()).toEqual(expected);
      }),
      RUNS
    );
  });
});

// Feature: terminal-portfolio, Property 2: cd into a reachable directory sets the working directory's absolute path to that directory's absolute path.
// Validates: Requirements 3.5
describe('Property 2: cd into a reachable directory sets the working directory', () => {
  it('cwdPath equals the target directory absolute path after cd', () => {
    fc.assert(
      fc.property(treeWithDir, ({ root, dir }) => {
        const fs = new FileSystemModel(root);
        fs.changeDir(dir.path);
        expect(fs.cwdPath).toBe(dir.path);
      }),
      RUNS
    );
  });
});

// Feature: terminal-portfolio, Property 3: cd <child> then cd .. restores the original directory's absolute path.
// Validates: Requirements 3.6
describe('Property 3: cd child then cd .. restores the original directory', () => {
  it('returns to the original absolute path after descending into a child and back', () => {
    fc.assert(
      fc.property(treeWithParentChildDir, ({ root, parent }) => {
        const childDirNames = Object.entries(parent.node.children)
          .filter(([, c]) => c.type === 'dir')
          .map(([name]) => name);

        const fs = new FileSystemModel(root);
        fs.changeDir(parent.path);
        const original = fs.cwdPath;
        expect(original).toBe(parent.path);

        // Descend into each child directory (single segment) and come back.
        for (const childName of childDirNames) {
          fs.changeDir(childName);
          expect(fs.cwdPath).toBe(`${original}/${childName}`);
          fs.changeDir('..');
          expect(fs.cwdPath).toBe(original);
        }
      }),
      RUNS
    );
  });
});

// Feature: terminal-portfolio, Property 4: cd with no argument resets to home 'Portfolio~' after any sequence of valid navigation.
// Validates: Requirements 3.7
describe('Property 4: cd with no argument resets to home', () => {
  it('resets cwd to Portfolio~ after any sequence of valid navigations', () => {
    const treeWithSequence = fsTreeArbitrary().chain((root) => {
      const dirs = collectDirs(root);
      return fc.record({
        root: fc.constant(root),
        // A sequence of valid (absolute) directory paths to navigate through.
        sequence: fc.array(fc.constantFrom(...dirs.map((d) => d.path)), { maxLength: 10 }),
      });
    });

    fc.assert(
      fc.property(treeWithSequence, ({ root, sequence }) => {
        const fs = new FileSystemModel(root);
        for (const p of sequence) {
          fs.changeDir(p); // every absolute path is a valid navigation
        }
        fs.changeDir(); // no argument
        expect(fs.cwdPath).toBe(ROOT_NAME);
      }),
      RUNS
    );
  });
});

// Feature: terminal-portfolio, Property 5: cd to an invalid path returns/throws an error containing that path and leaves cwd unchanged.
// Validates: Requirements 3.8
describe('Property 5: cd to an invalid path errors and leaves cwd unchanged', () => {
  it('throws NotFoundError naming the path and does not change cwd', () => {
    const arb = treeWithDir.chain(({ root, dir }) =>
      fc.record({
        root: fc.constant(root),
        dir: fc.constant(dir),
        missing: missingNameArb(dir.node),
      })
    );

    fc.assert(
      fc.property(arb, ({ root, dir, missing }) => {
        const fs = new FileSystemModel(root);
        fs.changeDir(dir.path);
        const before = fs.cwdPath;

        let thrown = null;
        try {
          fs.changeDir(missing);
        } catch (e) {
          thrown = e;
        }

        expect(thrown).toBeInstanceOf(NotFoundError);
        expect(thrown.message).toContain(missing);
        expect(thrown.path).toBe(missing);
        // cwd unchanged.
        expect(fs.cwdPath).toBe(before);
      }),
      RUNS
    );
  });
});

// Feature: terminal-portfolio, Property 7: tree contains every descendant's name, with indentation depth increasing monotonically with hierarchy depth.
// Validates: Requirements 3.10
describe('Property 7: tree contains every descendant with depth-proportional indentation', () => {
  it('lists every descendant at an indentation that is a strictly increasing function of depth', () => {
    fc.assert(
      fc.property(treeWithDir, ({ root, dir }) => {
        const fs = new FileSystemModel(root);
        const output = fs.tree(dir.path);
        const lines = output.split('\n');

        // First line is the starting directory name (no indentation).
        expect(lines[0]).toBe(dir.name);

        // Parse remaining lines into { name, indent } pairs.
        const parsed = lines.slice(1).map((line) => {
          const indent = line.length - line.trimStart().length;
          return { name: line.trimStart(), indent };
        });

        // Indentation must always be even (2 spaces per level) so depth = indent/2.
        for (const p of parsed) {
          expect(p.indent % 2).toBe(0);
        }

        // Build the expected (depth, name) multiset directly from the tree and
        // compare with the parsed (indent/2, name) multiset. Equality proves
        // every descendant appears AND that indentation == 2 * depth, i.e. the
        // indentation increases monotonically (strictly) with hierarchy depth.
        const expected = collectDescendants(dir.node)
          .map((d) => `${d.depth}:${d.name}`)
          .sort();
        const actual = parsed.map((p) => `${p.indent / 2}:${p.name}`).sort();
        expect(actual).toEqual(expected);
      }),
      RUNS
    );
  });
});

// Feature: terminal-portfolio, Property 8: cat (readFile) returns exactly the stored content of any file in cwd.
// Validates: Requirements 4.1
describe('Property 8: cat returns the stored content of any file', () => {
  it('readFile in the containing directory returns the exact stored content', () => {
    fc.assert(
      fc.property(treeWithFile, ({ root, fileEntry }) => {
        const fs = new FileSystemModel(root);
        fs.changeDir(fileEntry.dirPath);
        expect(fs.readFile(fileEntry.name)).toBe(fileEntry.content);
      }),
      RUNS
    );
  });
});

// Feature: terminal-portfolio, Property 9: every file in the model (PORTFOLIO_FS) is readable after navigating to its directory and returns non-empty content.
// Validates: Requirements 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
describe('Property 9: every section file is readable and non-empty', () => {
  const portfolioFiles = collectFiles(PORTFOLIO_FS);

  it('reads non-empty content for every file in PORTFOLIO_FS', () => {
    fc.assert(
      fc.property(fc.constantFrom(...portfolioFiles), (fileEntry) => {
        const fs = new FileSystemModel(PORTFOLIO_FS);
        fs.changeDir(fileEntry.dirPath);
        const content = fs.readFile(fileEntry.name);
        expect(typeof content).toBe('string');
        expect(content.trim().length).toBeGreaterThan(0);
        expect(content).toBe(fileEntry.content);
      }),
      RUNS
    );
  });
});

// Feature: terminal-portfolio, Property 10: cat on a missing name errors with a message containing that name.
// Validates: Requirements 4.2
describe('Property 10: cat on a missing file errors naming the file', () => {
  it('throws NotFoundError whose message contains the missing name', () => {
    const arb = treeWithDir.chain(({ root, dir }) =>
      fc.record({
        root: fc.constant(root),
        dir: fc.constant(dir),
        missing: missingNameArb(dir.node),
      })
    );

    fc.assert(
      fc.property(arb, ({ root, dir, missing }) => {
        const fs = new FileSystemModel(root);
        fs.changeDir(dir.path);

        let thrown = null;
        try {
          fs.readFile(missing);
        } catch (e) {
          thrown = e;
        }

        expect(thrown).toBeInstanceOf(NotFoundError);
        expect(thrown.message).toContain(missing);
        expect(thrown.path).toBe(missing);
      }),
      RUNS
    );
  });
});

// Feature: terminal-portfolio, Property 11: cat on a directory child reports it is a directory.
// Validates: Requirements 4.3
describe('Property 11: cat on a directory reports it is a directory', () => {
  it('throws IsDirectoryError naming the directory child', () => {
    const arb = treeWithParentChildDir.chain(({ root, parent }) => {
      const childDirNames = Object.entries(parent.node.children)
        .filter(([, c]) => c.type === 'dir')
        .map(([name]) => name);
      return fc.record({
        root: fc.constant(root),
        parent: fc.constant(parent),
        childDir: fc.constantFrom(...childDirNames),
      });
    });

    fc.assert(
      fc.property(arb, ({ root, parent, childDir }) => {
        const fs = new FileSystemModel(root);
        fs.changeDir(parent.path);

        let thrown = null;
        try {
          fs.readFile(childDir);
        } catch (e) {
          thrown = e;
        }

        expect(thrown).toBeInstanceOf(IsDirectoryError);
        expect(thrown.message.toLowerCase()).toContain('directory');
        expect(thrown.path).toBe(childDir);
      }),
      RUNS
    );
  });
});
