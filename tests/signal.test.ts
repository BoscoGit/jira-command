import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getSignal,
  handleSigint,
  registerTmpFile,
  resetSignalForTests,
  unregisterTmpFile,
} from '../src/signal.js';

beforeEach(() => {
  resetSignalForTests();
});

afterEach(() => {
  resetSignalForTests();
});

describe('handleSigint', () => {
  it('aborta o controller global', () => {
    expect(getSignal().aborted).toBe(false);
    handleSigint();
    expect(getSignal().aborted).toBe(true);
  });

  it('retorna exatamente 130 (POSIX 128 + SIGINT)', () => {
    expect(handleSigint()).toBe(130);
  });

  it('remove tmp files registrados', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jira-cli-test-'));
    const a = join(dir, 'a.txt');
    const b = join(dir, 'b.txt');
    writeFileSync(a, 'x');
    writeFileSync(b, 'y');
    registerTmpFile(a);
    registerTmpFile(b);

    handleSigint();

    expect(existsSync(a)).toBe(false);
    expect(existsSync(b)).toBe(false);
  });

  it('ignora silenciosamente arquivos já removidos (force:true)', () => {
    const ghost = join(tmpdir(), `jira-cli-ghost-${Date.now()}.txt`);
    registerTmpFile(ghost);
    expect(existsSync(ghost)).toBe(false);
    expect(() => handleSigint()).not.toThrow();
  });

  it('unregisterTmpFile remove path do set', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jira-cli-test-'));
    const f = join(dir, 'keep.txt');
    writeFileSync(f, 'k');
    registerTmpFile(f);
    unregisterTmpFile(f);

    handleSigint();

    // arquivo não deveria ser deletado pois foi des-registrado
    expect(existsSync(f)).toBe(true);
  });
});
