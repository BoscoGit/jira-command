import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  colorsEnabled,
  humanError,
  humanLog,
  jsonOut,
  quietOut,
  setOutputMode,
} from '../src/output.js';

let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  stdoutSpy.mockRestore();
  stderrSpy.mockRestore();
  vi.unstubAllEnvs();
  setOutputMode({ json: false, quiet: false, noColor: false });
});

function stdoutText(): string {
  return stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
}
function stderrText(): string {
  return stderrSpy.mock.calls.map((c) => String(c[0])).join('');
}

describe('colorsEnabled', () => {
  it('false quando --no-color (mode.noColor=true)', () => {
    setOutputMode({ noColor: true });
    expect(colorsEnabled()).toBe(false);
  });

  it('false quando NO_COLOR env definido', () => {
    setOutputMode({ noColor: false });
    vi.stubEnv('NO_COLOR', '1');
    // mock TTY=true para isolar a regra do NO_COLOR
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    expect(colorsEnabled()).toBe(false);
  });

  it('false quando stdout não é TTY', () => {
    setOutputMode({ noColor: false });
    vi.stubEnv('NO_COLOR', '');
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
    expect(colorsEnabled()).toBe(false);
  });

  it('true quando TTY+sem NO_COLOR+sem --no-color', () => {
    setOutputMode({ noColor: false });
    vi.stubEnv('NO_COLOR', '');
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    expect(colorsEnabled()).toBe(true);
  });
});

describe('jsonOut', () => {
  it('emite JSON com newline final em stdout', () => {
    jsonOut({ ok: true, key: 'ABC-1' });
    const out = stdoutText();
    expect(out).toBe('{"ok":true,"key":"ABC-1"}\n');
    expect(stderrText()).toBe('');
  });
});

describe('quietOut', () => {
  it('emite apenas a Key+\\n em stdout', () => {
    quietOut('ABC-123');
    expect(stdoutText()).toBe('ABC-123\n');
    expect(stderrText()).toBe('');
  });
});

describe('humanLog / humanError', () => {
  it('humanLog escreve no stream alvo', () => {
    setOutputMode({ noColor: true });
    humanLog(process.stdout, 'oi');
    expect(stdoutText()).toBe('oi\n');
  });

  it('humanError sempre vai para stderr', () => {
    humanError('boom');
    expect(stderrText()).toMatch(/boom/);
    expect(stdoutText()).toBe('');
  });
});
