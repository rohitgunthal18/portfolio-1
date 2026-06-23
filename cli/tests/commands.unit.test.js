// Example-based unit tests for command handlers (Feature: terminal-portfolio).
//
// Task 6.13 — whoami summary, per-command usage messages, the clear effect, and
// help descriptions, plus a recognized command with bad args yielding a
// usage/error message.
//
// Context shape: { fs, history, config, registry }.

import { describe, it, expect } from 'vitest';

import { CommandInterpreter } from '../js/interpreter.js';
import {
  createCommandRegistry,
  COMMAND_DESCRIPTIONS,
  whoami as whoamiHandler,
  clear as clearHandler,
  cat as catHandler,
  open as openHandler,
  help as helpHandler,
} from '../js/commands.js';
import { FileSystemModel } from '../js/fileSystem.js';
import { CommandHistory } from '../js/history.js';
import { CONFIG } from '../js/config.js';
import { PORTFOLIO_FS } from '../js/content.js';

function makeContext() {
  const registry = createCommandRegistry();
  return {
    fs: new FileSystemModel(PORTFOLIO_FS),
    history: new CommandHistory(),
    config: CONFIG,
    registry,
  };
}

function joinText(result) {
  return result.lines.map((l) => l.text).join('\n');
}

describe('whoami summary (Req 5.3)', () => {
  it('includes the owner name "Rohit"', () => {
    const result = whoamiHandler([], makeContext());
    expect(result.error).toBe(false);
    expect(joinText(result)).toContain('Rohit');
  });
});

describe('clear effect (Req 5.2)', () => {
  it('emits a single { kind: "clear" } effect and no output lines', () => {
    const result = clearHandler([], makeContext());
    expect(result.effects).toEqual([{ kind: 'clear' }]);
    expect(result.error).toBe(false);
  });
});

describe('per-command usage messages (Req 5.6, 5.8)', () => {
  it('cat with no argument returns "Usage: cat <file>"', () => {
    const result = catHandler([], makeContext());
    expect(result.error).toBe(true);
    expect(joinText(result)).toContain('Usage: cat <file>');
  });

  it('open with no argument returns "Usage: open <url>"', () => {
    const result = openHandler([], makeContext());
    expect(result.error).toBe(true);
    expect(joinText(result)).toContain('Usage: open <url>');
  });
});

describe('help descriptions (Req 5.1)', () => {
  it('lists every described command with its description', () => {
    const context = makeContext();
    const result = helpHandler([], context);
    const text = joinText(result);
    // Read-only write commands are registered but intentionally hidden from
    // help (no description), so only assert the described commands appear.
    for (const name of Object.keys(context.registry)) {
      if (!COMMAND_DESCRIPTIONS[name]) continue;
      expect(text).toContain(name);
      expect(text).toContain(COMMAND_DESCRIPTIONS[name]);
    }
  });

  it('does not list read-only write commands (mv, rm, mkdir, ...)', () => {
    const context = makeContext();
    const text = joinText(helpHandler([], context));
    // These are denied, not advertised; they should not clutter help.
    for (const denied of ['mv', 'cp', 'rm', 'mkdir', 'nano', 'vim']) {
      // The whole-word command should not appear as a help entry line.
      const entry = new RegExp(`^\\s*${denied}\\s`, 'm');
      expect(entry.test(text)).toBe(false);
    }
  });
});

describe('read-only permission handling (write commands denied)', () => {
  const writeCommands = ['mv', 'cp', 'rm', 'rmdir', 'mkdir', 'touch', 'nano', 'vim', 'chmod'];

  it('recognises write commands and returns a permission-denied error (not "command not found")', () => {
    const context = makeContext();
    const interp = new CommandInterpreter(context.registry);
    for (const cmd of writeCommands) {
      const result = interp.interpret(`${cmd} something`, context);
      const text = joinText(result);
      expect(result.error).toBe(true);
      expect(text).toContain('Permission denied');
      expect(text).not.toContain('command not found');
    }
  });

  it('names the target in the denial message when one is given', () => {
    const context = makeContext();
    const interp = new CommandInterpreter(context.registry);
    const result = interp.interpret('rm about.txt', context);
    expect(joinText(result)).toContain("about.txt");
  });
});

describe('permissions command', () => {
  it('lists allowed read commands and denied write commands', () => {
    const context = makeContext();
    const interp = new CommandInterpreter(context.registry);
    const text = joinText(interp.interpret('permissions', context));
    expect(text).toContain('read-only');
    expect(text).toContain('ALLOWED');
    expect(text).toContain('DENIED');
    expect(text).toContain('ls');
    expect(text).toContain('cat');
    expect(text).toContain('mv');
  });

  it('perms is an alias of permissions', () => {
    const context = makeContext();
    const interp = new CommandInterpreter(context.registry);
    const a = joinText(interp.interpret('permissions', context));
    const b = joinText(interp.interpret('perms', context));
    expect(b).toBe(a);
  });
});

describe('recognized command with bad args yields a usage/error message (Req 5.8)', () => {
  it('cat on a directory reports it is a directory', () => {
    // In PORTFOLIO_FS home, `about` is a directory.
    const context = makeContext();
    const interp = new CommandInterpreter(context.registry);
    const result = interp.interpret('cat about', context);
    expect(result.error).toBe(true);
    expect(joinText(result)).toContain('Is a directory');
  });

  it('open with a non-URL argument reports usage', () => {
    const context = makeContext();
    const interp = new CommandInterpreter(context.registry);
    const result = interp.interpret('open notaurl', context);
    expect(result.error).toBe(true);
    expect(joinText(result)).toContain('Usage: open <url>');
  });
});
