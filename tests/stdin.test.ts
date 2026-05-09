import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JiraError } from '../src/errors.js';
import { readKeysFromStdin, resolveKeys } from '../src/stdin.js';

const realStdin = process.stdin;
let originalIsTTY: boolean | undefined;

function fakeStdin(text: string, isTTY: boolean): void {
  const stream = Readable.from([Buffer.from(text, 'utf8')]) as NodeJS.ReadStream;
  Object.defineProperty(stream, 'isTTY', { value: isTTY });
  Object.defineProperty(process, 'stdin', { value: stream, configurable: true });
}

beforeEach(() => {
  originalIsTTY = process.stdin.isTTY;
});

afterEach(() => {
  Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
  if (originalIsTTY !== undefined) {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalIsTTY,
      configurable: true,
    });
  }
});

describe('readKeysFromStdin', () => {
  it('lê múltiplas Keys separadas por \\n', async () => {
    fakeStdin('ABC-1\nABC-2\n', false);
    const keys = await readKeysFromStdin();
    expect(keys).toEqual(['ABC-1', 'ABC-2']);
  });

  it('ignora linhas vazias e em branco', async () => {
    fakeStdin('\nABC-1\n\n\nABC-2\n  \n', false);
    const keys = await readKeysFromStdin();
    expect(keys).toEqual(['ABC-1', 'ABC-2']);
  });

  it('trim de espaços e tabs ao redor', async () => {
    fakeStdin('  ABC-1  \n\tABC-2\t\n', false);
    const keys = await readKeysFromStdin();
    expect(keys).toEqual(['ABC-1', 'ABC-2']);
  });

  it('aceita CRLF (Windows)', async () => {
    fakeStdin('ABC-1\r\nABC-2\r\n', false);
    const keys = await readKeysFromStdin();
    expect(keys).toEqual(['ABC-1', 'ABC-2']);
  });

  it('TTY → array vazio sem ler', async () => {
    fakeStdin('ABC-1\n', true);
    const keys = await readKeysFromStdin();
    expect(keys).toEqual([]);
  });

  it('stdin não-TTY vazio → array vazio', async () => {
    fakeStdin('', false);
    const keys = await readKeysFromStdin();
    expect(keys).toEqual([]);
  });
});

describe('resolveKeys', () => {
  it('argKey definido prevalece, ignora stdin', async () => {
    fakeStdin('XYZ-9\n', false);
    const keys = await resolveKeys('ABC-1');
    expect(keys).toEqual(['ABC-1']);
  });

  it('sem argKey, lê stdin', async () => {
    fakeStdin('ABC-1\nABC-2\n', false);
    const keys = await resolveKeys(undefined);
    expect(keys).toEqual(['ABC-1', 'ABC-2']);
  });

  it('sem argKey + stdin vazio → JiraError exitCode 2', async () => {
    fakeStdin('', false);
    try {
      await resolveKeys(undefined);
      expect.fail();
    } catch (err) {
      expect(err).toBeInstanceOf(JiraError);
      expect((err as JiraError).exitCode).toBe(2);
      expect((err as JiraError).message).toMatch(/Nenhuma Key/);
    }
  });

  it('sem argKey + stdin TTY → JiraError exitCode 2', async () => {
    fakeStdin('', true);
    try {
      await resolveKeys(undefined);
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
  });
});
