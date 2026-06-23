// Property-based tests for TabCompletion (Feature: terminal-portfolio).
//
// Each test below implements a single correctness property from design.md
// (Properties 18–21) and uses fast-check with numRuns >= 100. The module under
// test is js/completion.js `complete(input, context)`, which returns
// { completed, candidates, changed }. Shared generators and prefix helpers live
// in tests/helpers/generators.js.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { complete } from '../js/completion.js';
import { createCommandRegistry } from '../js/commands.js';
import { FileSystemModel } from '../js/fileSystem.js';
import { dir, file } from '../js/config.js';
import {
  fsTreeArbitrary,
  collectDirs,
  nameArb,
  properUniquePrefixesOf,
  ambiguousNamesArb,
  nonMatchingPrefixArb,
  ROOT_NAME,
} from './helpers/generators.js';

const RUNS = { numRuns: 100 };

// The real registered command names (Req 7.1 is about registered commands).
const REGISTRY_NAMES = Object.keys(createCommandRegistry());

// ---------------------------------------------------------------------------
// Shared arbitraries
// ---------------------------------------------------------------------------

// A candidate command-name set (either the real registry or a generated unique
// set) paired with one target name that has at least one *proper* uniquely
// identifying prefix, plus one such prefix. Used by Property 18.
const commandSetWithUniquePrefix = fc
  .oneof(
    fc.constant(REGISTRY_NAMES),
    fc.uniqueArray(nameArb, { minLength: 2, maxLength: 8 }),
  )
  .map((names) => ({
    names,
    targets: names.filter((t) => properUniquePrefixesOf(t, names).length > 0),
  }))
  .filter(({ targets }) => targets.length > 0)
  .chain(({ names, targets }) =>
    fc
      .constantFrom(...targets)
      .chain((target) =>
        fc.record({
          names: fc.constant(names),
          target: fc.constant(target),
          prefix: fc.constantFrom(...properUniquePrefixesOf(target, names)),
        }),
      ),
  );

// A tree positioned at a directory that has a child whose name has a proper
// unique prefix among its siblings, paired with that child + prefix. Used by
// Property 19.
const treeDirWithUniqueChildPrefix = fsTreeArbitrary()
  .map((root) => {
    const dirs = collectDirs(root).filter((d) => {
      const siblings = Object.keys(d.node.children);
      return siblings.some(
        (name) => properUniquePrefixesOf(name, siblings).length > 0,
      );
    });
    return { root, dirs };
  })
  .filter(({ dirs }) => dirs.length > 0)
  .chain(({ root, dirs }) =>
    fc.constantFrom(...dirs).chain((d) => {
      const siblings = Object.keys(d.node.children);
      const children = siblings.filter(
        (name) => properUniquePrefixesOf(name, siblings).length > 0,
      );
      return fc.constantFrom(...children).chain((child) =>
        fc.record({
          root: fc.constant(root),
          dirPath: fc.constant(d.path),
          siblings: fc.constant(siblings),
          child: fc.constant(child),
          prefix: fc.constantFrom(...properUniquePrefixesOf(child, siblings)),
        }),
      );
    }),
  );

// Build a FileSystemModel whose root directory's children are exactly `names`
// (as files), so directory-entry completion can be exercised over arbitrary
// candidate sets.
function fsWithEntries(names) {
  const children = Object.fromEntries(names.map((n) => [n, file('x')]));
  return new FileSystemModel(dir(ROOT_NAME, children));
}

// ---------------------------------------------------------------------------
// Property 18
// ---------------------------------------------------------------------------

// Feature: terminal-portfolio, Property 18: Unique prefix completes to the matching command. For any registered command, any prefix of its name that uniquely identifies it (no other command shares that prefix) completes the input to that command name.
// Validates: Requirements 7.1
describe('Property 18: unique prefix completes to the matching command', () => {
  it('completes a uniquely-identifying command prefix to the command name', () => {
    fc.assert(
      fc.property(commandSetWithUniquePrefix, ({ names, target, prefix }) => {
        const result = complete(prefix, { commandNames: names });
        expect(result.completed).toBe(target);
        expect(result.changed).toBe(true);
        expect(result.candidates).toEqual([target]);
      }),
      RUNS,
    );
  });
});

// ---------------------------------------------------------------------------
// Property 19
// ---------------------------------------------------------------------------

// Feature: terminal-portfolio, Property 19: Unique prefix completes to the matching path entry. For any directory and any child whose name prefix is unique among its siblings, tab-completing a path argument ("<cmd> <prefix>") with that prefix completes the input to that child's name.
// Validates: Requirements 7.2
describe('Property 19: unique prefix completes to the matching path entry', () => {
  it("completes a unique path-argument prefix to the child's name", () => {
    fc.assert(
      fc.property(
        treeDirWithUniqueChildPrefix,
        fc.constantFrom('ls', 'cd', 'cat'),
        ({ root, dirPath, child, prefix }, cmd) => {
          const fs = new FileSystemModel(root);
          fs.changeDir(dirPath);
          const input = `${cmd} ${prefix}`;
          const result = complete(input, { fs });

          const lastToken = result.completed.split(/\s+/).pop();
          expect(lastToken).toBe(child);
          expect(result.changed).toBe(true);
          expect(result.completed).toBe(`${cmd} ${child}`);
        },
      ),
      RUNS,
    );
  });
});

// ---------------------------------------------------------------------------
// Property 20
// ---------------------------------------------------------------------------

// Feature: terminal-portfolio, Property 20: Ambiguous prefix lists all candidates without changing input. For any prefix shared by more than one command or directory entry, complete returns exactly the set of all entries sharing that prefix (sorted) as candidates and leaves the input unchanged.
// Validates: Requirements 7.3
describe('Property 20: ambiguous prefix lists all candidates without changing input', () => {
  it('returns all matching candidates (sorted) and leaves the input unchanged', () => {
    fc.assert(
      fc.property(ambiguousNamesArb, ({ prefix, names }) => {
        const expected = names.filter((n) => n.startsWith(prefix)).sort();

        // Command position: "<prefix>" with no whitespace.
        const cmdResult = complete(prefix, { commandNames: names });
        expect(cmdResult.candidates).toEqual(expected);
        expect(cmdResult.changed).toBe(false);
        expect(cmdResult.completed).toBe(prefix);

        // Path-argument position: "ls <prefix>" against a matching directory.
        const fs = fsWithEntries(names);
        const input = `ls ${prefix}`;
        const pathResult = complete(input, { fs });
        expect(pathResult.candidates).toEqual(expected);
        expect(pathResult.changed).toBe(false);
        expect(pathResult.completed).toBe(input);
      }),
      RUNS,
    );
  });
});

// ---------------------------------------------------------------------------
// Property 21
// ---------------------------------------------------------------------------

// Feature: terminal-portfolio, Property 21: Non-matching prefix leaves input unchanged. For any prefix that matches no command or directory entry, complete leaves the input unchanged (changed=false, candidates=[]).
// Validates: Requirements 7.4
describe('Property 21: non-matching prefix leaves input unchanged', () => {
  it('leaves the input unchanged with no candidates when nothing matches', () => {
    const candidateSetArb = fc.oneof(
      fc.constant(REGISTRY_NAMES),
      fc.uniqueArray(nameArb, { minLength: 1, maxLength: 8 }),
    );

    fc.assert(
      fc.property(
        candidateSetArb.chain((names) =>
          fc.record({
            names: fc.constant(names),
            prefix: nonMatchingPrefixArb(names),
          }),
        ),
        ({ names, prefix }) => {
          // Command position.
          const cmdResult = complete(prefix, { commandNames: names });
          expect(cmdResult.changed).toBe(false);
          expect(cmdResult.candidates).toEqual([]);
          expect(cmdResult.completed).toBe(prefix);

          // Path-argument position against a directory holding the same names.
          const fs = fsWithEntries(names);
          const input = `ls ${prefix}`;
          const pathResult = complete(input, { fs });
          expect(pathResult.changed).toBe(false);
          expect(pathResult.candidates).toEqual([]);
          expect(pathResult.completed).toBe(input);
        },
      ),
      RUNS,
    );
  });
});
