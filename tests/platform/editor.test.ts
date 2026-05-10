import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JiraError } from '../../src/errors.js';
import { commandFor, openEditor, setSpawnImplForTests } from '../../src/platform/editor.js';

interface FakeChild {
  on: (
    event: 'close' | 'error',
    listener: ((code: number | null) => void) | ((err: NodeJS.ErrnoException) => void),
  ) => void;
  emitClose?: (code: number | null) => void;
  emitError?: (err: NodeJS.ErrnoException) => void;
}

function makeChild(): FakeChild {
  let closeListener: ((code: number | null) => void) | undefined;
  let errorListener: ((err: NodeJS.ErrnoException) => void) | undefined;
  const child: FakeChild = {
    on(event, listener) {
      if (event === 'close') closeListener = listener as (code: number | null) => void;
      if (event === 'error') errorListener = listener as (err: NodeJS.ErrnoException) => void;
    },
    emitClose(code) {
      closeListener?.(code);
    },
    emitError(err) {
      errorListener?.(err);
    },
  };
  return child;
}

let spawnSpy: ReturnType<typeof vi.fn>;
const originalPlatform = process.platform;

function setPlatform(p: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: p, configurable: true });
}

const savedEditor = process.env.EDITOR;
const savedVisual = process.env.VISUAL;

beforeEach(() => {
  spawnSpy = vi.fn();
  setSpawnImplForTests(spawnSpy as unknown as Parameters<typeof setSpawnImplForTests>[0]);
  delete process.env.EDITOR;
  delete process.env.VISUAL;
});

afterEach(() => {
  setSpawnImplForTests(null);
  Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  if (savedEditor === undefined) delete process.env.EDITOR;
  else process.env.EDITOR = savedEditor;
  if (savedVisual === undefined) delete process.env.VISUAL;
  else process.env.VISUAL = savedVisual;
});

describe('commandFor (puro)', () => {
  it('EDITOR=vim → cmd vim args [filePath]', () => {
    const out = commandFor('/tmp/x.md', { EDITOR: 'vim' } as NodeJS.ProcessEnv, 'linux');
    expect(out).toEqual({ cmd: 'vim', args: ['/tmp/x.md'] });
  });

  it('EDITOR="code -w" → split em tokens', () => {
    const out = commandFor('/tmp/x.md', { EDITOR: 'code -w' } as NodeJS.ProcessEnv, 'linux');
    expect(out).toEqual({ cmd: 'code', args: ['-w', '/tmp/x.md'] });
  });

  it('VISUAL quando EDITOR ausente', () => {
    const out = commandFor('/tmp/x.md', { VISUAL: 'nano' } as NodeJS.ProcessEnv, 'linux');
    expect(out).toEqual({ cmd: 'nano', args: ['/tmp/x.md'] });
  });

  it('EDITOR vence VISUAL', () => {
    const out = commandFor(
      '/tmp/x.md',
      { EDITOR: 'vim', VISUAL: 'nano' } as NodeJS.ProcessEnv,
      'linux',
    );
    expect(out.cmd).toBe('vim');
  });

  it('EDITOR vazio cai pro default do SO', () => {
    const out = commandFor('/tmp/x.md', { EDITOR: '   ' } as NodeJS.ProcessEnv, 'linux');
    expect(out.cmd).toBe('nano');
  });

  it('win32 default → notepad.exe', () => {
    const out = commandFor('C:\\tmp\\x.md', {} as NodeJS.ProcessEnv, 'win32');
    expect(out).toEqual({ cmd: 'notepad.exe', args: ['C:\\tmp\\x.md'] });
  });

  it('linux default → nano', () => {
    const out = commandFor('/tmp/x.md', {} as NodeJS.ProcessEnv, 'linux');
    expect(out.cmd).toBe('nano');
  });

  it('darwin default → nano', () => {
    const out = commandFor('/tmp/x.md', {} as NodeJS.ProcessEnv, 'darwin');
    expect(out.cmd).toBe('nano');
  });
});

describe('openEditor', () => {
  it('close 0 resolve', async () => {
    setPlatform('linux');
    const child = makeChild();
    spawnSpy.mockReturnValueOnce(child);
    const promise = openEditor('/tmp/x.md');
    setTimeout(() => child.emitClose?.(0), 0);
    await expect(promise).resolves.toBeUndefined();
  });

  it('close 1 → JiraError exitCode 1', async () => {
    setPlatform('linux');
    const child = makeChild();
    spawnSpy.mockReturnValueOnce(child);
    const promise = openEditor('/tmp/x.md');
    setTimeout(() => child.emitClose?.(1), 0);
    try {
      await promise;
      expect.fail();
    } catch (err) {
      expect(err).toBeInstanceOf(JiraError);
      expect((err as JiraError).exitCode).toBe(1);
      expect((err as JiraError).message).toMatch(/Editor saiu com erro/);
    }
  });

  it('ENOENT em nano → tenta vi (spawn chamado 2×)', async () => {
    setPlatform('linux');
    const child1 = makeChild();
    const child2 = makeChild();
    spawnSpy.mockReturnValueOnce(child1).mockReturnValueOnce(child2);
    const promise = openEditor('/tmp/x.md');
    setTimeout(() => {
      child1.emitError?.(Object.assign(new Error('not found'), { code: 'ENOENT' }));
      // não esperar — segundo spawn deveria ter sido chamado
      setTimeout(() => child2.emitClose?.(0), 0);
    }, 0);
    await expect(promise).resolves.toBeUndefined();
    expect(spawnSpy).toHaveBeenCalledTimes(2);
    expect(spawnSpy.mock.calls[1]?.[0]).toBe('vi');
  });

  it('ENOENT em editor não-nano → JiraError exitCode 1 (sem fallback)', async () => {
    setPlatform('linux');
    process.env.EDITOR = 'lixo-inexistente';
    const child = makeChild();
    spawnSpy.mockReturnValueOnce(child);
    const promise = openEditor('/tmp/x.md');
    setTimeout(() => {
      child.emitError?.(Object.assign(new Error('not found'), { code: 'ENOENT' }));
    }, 0);
    try {
      await promise;
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(1);
    }
    expect(spawnSpy).toHaveBeenCalledTimes(1);
    delete process.env.EDITOR;
  });
});
