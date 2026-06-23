// Property-based tests for CommandInterpreter and command handlers
// (Feature: terminal-portfolio).
//
// Each test below implements a single correctness property from design.md and
// uses fast-check with numRuns >= 100. Generators live in
// tests/helpers/generators.js (file-system trees) plus a few local generators
// for URLs, non-URL tokens, unknown command tokens, and contact messages.
//
// Context shape passed to interpret / handlers:
//   { fs: FileSystemModel, history: CommandHistory, config: CONFIG, registry }
// Note: `help` reads context.registry.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { CommandInterpreter } from '../js/interpreter.js';
import {
  createCommandRegistry,
  COMMAND_DESCRIPTIONS,
  open as openHandler,
  cv as cvHandler,
  resume as resumeHandler,
  contact as contactHandler,
  sudo as sudoHandler,
  help as helpHandler,
} from '../js/commands.js';
import { FileSystemModel } from '../js/fileSystem.js';
import { CommandHistory } from '../js/history.js';
import { CONFIG } from '../js/config.js';
import { fsTreeArbitrary, collectDirs, ROOT_NAME } from './helpers/generators.js';

const RUNS = { numRuns: 100 };

// Build a fresh interpreter context around a given file-system root.
function makeContext(root) {
  const registry = createCommandRegistry();
  return {
    fs: new FileSystemModel(root),
    history: new CommandHistory(),
    config: CONFIG,
    registry,
  };
}

// The set of command names the real registry recognizes.
const REGISTRY_NAMES = Object.keys(createCommandRegistry());

// Join all output line text from a CommandResult into a single string.
function joinText(result) {
  return result.lines.map((l) => l.text).join('\n');
}

// True iff `token` is a valid http/https URL (matches the open handler rule).
function isValidHttpUrl(token) {
  try {
    const u = new URL(token);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// ===========================================================================
// Task 6.5 / Property 6 — pwd / prompt consistency
// ===========================================================================

// Feature: terminal-portfolio, Property 6: Working-directory path reporting is consistent. For any navigation sequence, the output of `pwd` equals the model's current absolute working-directory path.
// Validates: Requirements 1.4, 3.9
describe('Property 6: pwd output equals the current working-directory path', () => {
  it('pwd output line equals fs.cwdPath after any navigation sequence', () => {
    const arb = fsTreeArbitrary().chain((root) => {
      const dirPaths = collectDirs(root).map((d) => d.path);
      return fc.record({
        root: fc.constant(root),
        // A sequence of valid absolute directory paths to cd through, with
        // occasional `cd ..` and `cd` (reset to home) operations mixed in.
        sequence: fc.array(
          fc.oneof(
            fc.constantFrom(...dirPaths),
            fc.constant('..'),
            fc.constant(''),
          ),
          { maxLength: 12 },
        ),
      });
    });

    fc.assert(
      fc.property(arb, ({ root, sequence }) => {
        const context = makeContext(root);
        const interp = new CommandInterpreter(context.registry);

        for (const step of sequence) {
          // `cd <path>` for a path, `cd` (reset) for the empty step.
          interp.interpret(step === '' ? 'cd' : `cd ${step}`, context);
        }

        const result = interp.interpret('pwd', context);
        expect(result.error).toBe(false);
        expect(result.lines).toHaveLength(1);
        expect(result.lines[0].text).toBe(context.fs.cwdPath);
      }),
      RUNS,
    );
  });
});

// ===========================================================================
// Task 6.6 / Property 12 — help lists every registered command
// ===========================================================================

// Feature: terminal-portfolio, Property 12: help lists every registered command. For any command registry, the output of `help` contains every registered command name together with a description.
// Validates: Requirements 5.1
describe('Property 12: help lists every registered command with a description', () => {
  it('help output contains every registered command name and its description', () => {
    // Generate sub-registries from the known command names (each of which has
    // a description) plus always exercise the full registry. Only commands with
    // a description are listed by help, so we restrict to those names.
    const describedNames = REGISTRY_NAMES.filter((n) => COMMAND_DESCRIPTIONS[n]);
    const arb = fc
      .subarray(describedNames, { minLength: 1 })
      .map((names) => {
        const full = createCommandRegistry();
        const sub = {};
        for (const n of names) sub[n] = full[n];
        return sub;
      });

    fc.assert(
      fc.property(arb, (registry) => {
        const result = helpHandler([], { registry });
        const text = joinText(result);

        for (const name of Object.keys(registry)) {
          expect(text).toContain(name);
          expect(text).toContain(COMMAND_DESCRIPTIONS[name]);
        }
      }),
      RUNS,
    );
  });
});

// ===========================================================================
// Task 6.7 / Property 15 — open emits an open-URL effect for valid URLs
// ===========================================================================

// Feature: terminal-portfolio, Property 15: open emits an open-URL effect for valid URLs. For any valid http/https URL, `open <url>` returns a result whose effect opens that exact URL.
// Validates: Requirements 5.5
describe('Property 15: open emits an openUrl effect for valid URLs', () => {
  // fc.webUrl generates syntactically valid http/https URLs.
  const urlArbitrary = fc.webUrl().filter((u) => isValidHttpUrl(u));

  it('returns an effect { kind: "openUrl", url } with the exact URL', () => {
    fc.assert(
      fc.property(urlArbitrary, (url) => {
        const result = openHandler([url], { config: CONFIG });
        expect(result.error).toBe(false);
        const openEffects = result.effects.filter((e) => e.kind === 'openUrl');
        expect(openEffects).toHaveLength(1);
        expect(openEffects[0].url).toBe(url);
      }),
      RUNS,
    );
  });
});

// ===========================================================================
// Task 6.8 / Property 16 — open with missing/invalid argument
// ===========================================================================

// Feature: terminal-portfolio, Property 16: open with a missing or invalid argument returns a usage message. For any token that is not a valid http/https URL (including empty), open returns a usage message and produces no open-URL effect.
// Validates: Requirements 5.6
describe('Property 16: open with an invalid/missing argument returns usage and no effect', () => {
  const nonUrlArbitrary = fc
    .oneof(
      fc.constant(''),
      fc.constantFrom(
        'ftp://example.com',
        'javascript:alert(1)',
        'mailto:a@b.com',
        'file:///etc/passwd',
        'notaurl',
        '://broken',
      ),
      // Random tokens with no whitespace (a single argument token).
      fc.string({ maxLength: 24 }).filter((s) => !/\s/.test(s)),
    )
    .filter((t) => !isValidHttpUrl(t));

  it('returns a usage message and no openUrl effect', () => {
    fc.assert(
      fc.property(nonUrlArbitrary, (token) => {
        // token === '' models the missing-argument case (args[0] is empty).
        const args = token === '' ? [] : [token];
        const result = openHandler(args, { config: CONFIG });
        expect(result.error).toBe(true);
        expect(joinText(result)).toContain('Usage: open <url>');
        expect(result.effects.some((e) => e.kind === 'openUrl')).toBe(false);
      }),
      RUNS,
    );
  });
});

// ===========================================================================
// Task 6.9 / Property 17 — unrecognized commands report not-found + suggest help
// ===========================================================================

// Feature: terminal-portfolio, Property 17: unrecognized commands report not-found and suggest help. For any command token not in the registry, the interpreter returns an error result whose text contains the token and suggests `help`.
// Validates: Requirements 5.7
describe('Property 17: unrecognized commands report not-found and suggest help', () => {
  const knownSet = new Set(REGISTRY_NAMES);
  // Non-empty tokens with no whitespace that are not registered commands.
  const unknownTokenArbitrary = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim() !== '' && !/\s/.test(s) && !knownSet.has(s));

  it('returns error result containing the token and suggesting help', () => {
    const interp = new CommandInterpreter(createCommandRegistry());
    fc.assert(
      fc.property(unknownTokenArbitrary, (token) => {
        const result = interp.interpret(token, {});
        expect(result.error).toBe(true);
        const text = joinText(result);
        expect(text).toContain(token);
        expect(text).toContain('help');
      }),
      RUNS,
    );
  });
});

// ===========================================================================
// Task 6.10 / Property 23 — cv and resume aliases
// ===========================================================================

// Feature: terminal-portfolio, Property 23: cv and resume both open the configured CV link with confirmation. Each returns an openUrl effect equal to CONFIG.CV_LINK with a confirmation line, and the two aliases produce identical results.
// Validates: Requirements 9.1, 9.2, 9.3
describe('Property 23: cv and resume open the configured CV link with confirmation', () => {
  it('both emit openUrl == CONFIG.CV_LINK with a confirmation line and identical results', () => {
    fc.assert(
      fc.property(fc.array(fc.string({ maxLength: 12 }), { maxLength: 4 }), (args) => {
        const context = { config: CONFIG };
        const cvResult = cvHandler(args, context);
        const resumeResult = resumeHandler(args, context);

        // Identical results for the two aliases.
        expect(resumeResult).toEqual(cvResult);

        // Exactly one openUrl effect pointing at the configured CV link.
        const openEffects = cvResult.effects.filter((e) => e.kind === 'openUrl');
        expect(openEffects).toHaveLength(1);
        expect(openEffects[0].url).toBe(CONFIG.CV_LINK);

        // A confirmation line is present.
        expect(cvResult.lines.length).toBeGreaterThan(0);
        expect(joinText(cvResult).toLowerCase()).toContain('cv');
      }),
      RUNS,
    );
  });
});

// ===========================================================================
// Task 6.11 / Property 24 — contact opens a mailto to the owner with the body
// ===========================================================================

// Feature: terminal-portfolio, Property 24: contact opens a mailto to the owner with the given body. For any message (including none), contact returns a mailto effect addressed to CONFIG.OWNER_EMAIL; when a message is provided, the decoded body equals exactly the message.
// Validates: Requirements 10.2, 10.3
describe('Property 24: contact opens a mailto to the owner with the given body', () => {
  // Use a single-string argument so args.join(' ') is the identity, letting the
  // message round-trip exactly (incl. spaces and special characters).
  const messageArbitrary = fc.string({ maxLength: 80 });

  it('emits a mailto to OWNER_EMAIL whose decoded body equals the message', () => {
    fc.assert(
      fc.property(messageArbitrary, (message) => {
        // Model the message as args; '' models the no-message case (args=[]).
        const args = message === '' ? [] : [message];
        const result = contactHandler(args, { config: CONFIG });

        const mailtoEffects = result.effects.filter((e) => e.kind === 'mailto');
        expect(mailtoEffects).toHaveLength(1);
        const href = mailtoEffects[0].href;

        // Addressed to the owner email.
        expect(href.startsWith(`mailto:${CONFIG.OWNER_EMAIL}`)).toBe(true);

        if (message === '') {
          // No body for the empty message.
          expect(href).toBe(`mailto:${CONFIG.OWNER_EMAIL}`);
        } else {
          const bodyPart = href.split('?body=')[1];
          expect(bodyPart).toBeTypeOf('string');
          expect(decodeURIComponent(bodyPart)).toBe(message);
        }
      }),
      RUNS,
    );
  });
});

// ===========================================================================
// Task 6.12 / Property 25 — sudo always denies without privileged effect
// ===========================================================================

// Feature: terminal-portfolio, Property 25: sudo always denies without privileged effect. For any args sequence to sudo, the result is error:true with a denial message and contains no effects.
// Validates: Requirements 11.3
describe('Property 25: sudo always denies without any effect', () => {
  it('returns error:true with a denial message and an empty effects array', () => {
    fc.assert(
      fc.property(fc.array(fc.string({ maxLength: 16 }), { maxLength: 6 }), (args) => {
        const result = sudoHandler(args, { config: CONFIG });
        expect(result.error).toBe(true);
        expect(result.effects).toEqual([]);
        expect(joinText(result)).toContain('Permission denied');
      }),
      RUNS,
    );
  });
});
