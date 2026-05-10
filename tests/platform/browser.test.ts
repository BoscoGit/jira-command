import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JiraError } from '../../src/errors.js';
import { commandFor, openInBrowser, setSpawnImplForTests } from '../../src/platform/browser.js';

interface FakeChild {
  unref: ReturnType<typeof vi.fn>;
  on: (event: 'error', listener: (err: NodeJS.ErrnoException) => void) => void;
  triggerError?: (err: NodeJS.ErrnoException) => void;
}

function makeChild(): FakeChild {
  const child: FakeChild = {
    unref: vi.fn(),
    on(event, listener) {
      if (event === 'error') {
        child.triggerError = listener;
      }
    },
  };
  return child;
}

let spawnSpy: ReturnType<typeof vi.fn>;
const originalPlatform = process.platform;

function setPlatform(p: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: p, configurable: true });
}

beforeEach(() => {
  spawnSpy = vi.fn();
  setSpawnImplForTests(spawnSpy as unknown as Parameters<typeof setSpawnImplForTests>[0]);
});

afterEach(() => {
  setSpawnImplForTests(null);
  Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
});

describe('commandFor (puro)', () => {
  it('Windows → cmd /c start "" <url>', () => {
    const out = commandFor('https://x', 'win32');
    expect(out.cmd).toBe('cmd');
    expect(out.args).toEqual(['/c', 'start', '""', 'https://x']);
  });

  it('macOS → open <url>', () => {
    const out = commandFor('https://x', 'darwin');
    expect(out.cmd).toBe('open');
    expect(out.args).toEqual(['https://x']);
  });

  it.each(['linux', 'freebsd', 'openbsd'] as NodeJS.Platform[])('%s → xdg-open <url>', (plat) => {
    const out = commandFor('https://x', plat);
    expect(out.cmd).toBe('xdg-open');
    expect(out.args).toEqual(['https://x']);
  });
});

describe('openInBrowser', () => {
  it('Windows usa cmd /c start "" <url>', async () => {
    setPlatform('win32');
    spawnSpy.mockReturnValueOnce(makeChild());
    await openInBrowser('https://x/browse/ABC-1');
    expect(spawnSpy).toHaveBeenCalledTimes(1);
    expect(spawnSpy.mock.calls[0]?.[0]).toBe('cmd');
    expect(spawnSpy.mock.calls[0]?.[1]).toEqual(['/c', 'start', '""', 'https://x/browse/ABC-1']);
  });

  it('macOS usa open <url>', async () => {
    setPlatform('darwin');
    spawnSpy.mockReturnValueOnce(makeChild());
    await openInBrowser('https://x/browse/ABC-1');
    expect(spawnSpy.mock.calls[0]?.[0]).toBe('open');
  });

  it('Linux usa xdg-open <url>', async () => {
    setPlatform('linux');
    spawnSpy.mockReturnValueOnce(makeChild());
    await openInBrowser('https://x/browse/ABC-1');
    expect(spawnSpy.mock.calls[0]?.[0]).toBe('xdg-open');
  });

  it('chama child.unref() para fire-and-forget', async () => {
    setPlatform('linux');
    const child = makeChild();
    spawnSpy.mockReturnValueOnce(child);
    await openInBrowser('https://x/browse/ABC-1');
    expect(child.unref).toHaveBeenCalledTimes(1);
  });

  it('spawn que LANÇA síncrono → JiraError exitCode 6', async () => {
    setPlatform('linux');
    spawnSpy.mockImplementationOnce(() => {
      throw Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' });
    });
    try {
      await openInBrowser('https://x/browse/ABC-1');
      expect.fail();
    } catch (err) {
      expect(err).toBeInstanceOf(JiraError);
      expect((err as JiraError).exitCode).toBe(6);
    }
  });
});
