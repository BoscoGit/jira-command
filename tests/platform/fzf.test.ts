import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JiraError } from '../../src/errors.js';
import { pickWithFzf, setSpawnImplForTests } from '../../src/platform/fzf.js';

interface FakeChild {
  stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
  stdout: { on: (event: 'data', listener: (chunk: Buffer) => void) => void };
  on: (
    event: 'close' | 'error',
    listener: ((code: number | null) => void) | ((err: NodeJS.ErrnoException) => void),
  ) => void;
  emitData?: (data: string) => void;
  emitClose?: (code: number | null) => void;
  emitError?: (err: NodeJS.ErrnoException) => void;
}

function makeChild(): FakeChild {
  const dataListeners: Array<(chunk: Buffer) => void> = [];
  let closeListener: ((code: number | null) => void) | undefined;
  let errorListener: ((err: NodeJS.ErrnoException) => void) | undefined;
  const child: FakeChild = {
    stdin: { write: vi.fn(), end: vi.fn() },
    stdout: {
      on(_event, listener) {
        dataListeners.push(listener);
      },
    },
    on(event, listener) {
      if (event === 'close') closeListener = listener as (code: number | null) => void;
      if (event === 'error') errorListener = listener as (err: NodeJS.ErrnoException) => void;
    },
    emitData(data: string) {
      for (const fn of dataListeners) fn(Buffer.from(data, 'utf8'));
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

beforeEach(() => {
  spawnSpy = vi.fn();
  setSpawnImplForTests(spawnSpy as unknown as Parameters<typeof setSpawnImplForTests>[0]);
});

afterEach(() => {
  setSpawnImplForTests(null);
});

describe('pickWithFzf', () => {
  it('escreve lines no stdin do fzf e retorna seleção em close 0', async () => {
    const child = makeChild();
    spawnSpy.mockReturnValueOnce(child);
    const promise = pickWithFzf(['ABC-1 [Open] x', 'ABC-2 [Done] y']);

    // Simula stdout do fzf + close 0
    setTimeout(() => {
      child.emitData?.('ABC-1 [Open] x\n');
      child.emitClose?.(0);
    }, 0);

    const sel = await promise;
    expect(sel).toBe('ABC-1 [Open] x');
    expect(child.stdin.write).toHaveBeenCalledWith('ABC-1 [Open] x\nABC-2 [Done] y');
    expect(child.stdin.end).toHaveBeenCalled();
  });

  it('retorna null quando fzf sai com 130 (ESC)', async () => {
    const child = makeChild();
    spawnSpy.mockReturnValueOnce(child);
    const promise = pickWithFzf(['x']);
    setTimeout(() => child.emitClose?.(130), 0);
    const sel = await promise;
    expect(sel).toBeNull();
  });

  it('retorna null quando fzf sai com 1 (sem match)', async () => {
    const child = makeChild();
    spawnSpy.mockReturnValueOnce(child);
    const promise = pickWithFzf(['x']);
    setTimeout(() => child.emitClose?.(1), 0);
    const sel = await promise;
    expect(sel).toBeNull();
  });

  it('retorna null quando close 0 mas stdout vazio', async () => {
    const child = makeChild();
    spawnSpy.mockReturnValueOnce(child);
    const promise = pickWithFzf(['x']);
    setTimeout(() => child.emitClose?.(0), 0);
    const sel = await promise;
    expect(sel).toBeNull();
  });

  it('spawn lança ENOENT → JiraError com URL de instalação', async () => {
    spawnSpy.mockImplementationOnce(() => {
      throw Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' });
    });
    try {
      await pickWithFzf(['x']);
      expect.fail();
    } catch (err) {
      expect(err).toBeInstanceOf(JiraError);
      expect((err as JiraError).exitCode).toBe(1);
      expect((err as JiraError).message).toMatch(/fzf não encontrado/);
      expect((err as JiraError).message).toMatch(/junegunn\/fzf/);
    }
  });

  it('emit error ENOENT pós-spawn → JiraError', async () => {
    const child = makeChild();
    spawnSpy.mockReturnValueOnce(child);
    const promise = pickWithFzf(['x']);
    setTimeout(() => {
      child.emitError?.(Object.assign(new Error('not found'), { code: 'ENOENT' }));
    }, 0);
    try {
      await promise;
      expect.fail();
    } catch (err) {
      expect(err).toBeInstanceOf(JiraError);
      expect((err as JiraError).exitCode).toBe(1);
    }
  });
});
