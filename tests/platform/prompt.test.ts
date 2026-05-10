import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmInteractive, setReadlineImplForTests } from '../../src/platform/prompt.js';

const originalStdinTTY = process.stdin.isTTY;
const originalStdoutTTY = process.stdout.isTTY;

function setStdinTTY(v: boolean): void {
  Object.defineProperty(process.stdin, 'isTTY', { value: v, configurable: true });
}
function setStdoutTTY(v: boolean): void {
  Object.defineProperty(process.stdout, 'isTTY', { value: v, configurable: true });
}

let answer = '';
const readlineMock = { question: async (_q: string) => answer };

beforeEach(() => {
  setStdinTTY(true);
  setStdoutTTY(true);
  setReadlineImplForTests(readlineMock);
});

afterEach(() => {
  setReadlineImplForTests(null);
  Object.defineProperty(process.stdin, 'isTTY', { value: originalStdinTTY, configurable: true });
  Object.defineProperty(process.stdout, 'isTTY', { value: originalStdoutTTY, configurable: true });
});

describe('confirmInteractive', () => {
  it.each(['s', 'S', 'y', 'Y'])('resposta "%s" → true', async (resp) => {
    answer = resp;
    expect(await confirmInteractive('?')).toBe(true);
  });

  it.each(['n', 'N', 'no', 'qualquer-outro', '', '   '])('resposta "%s" → false', async (resp) => {
    answer = resp;
    expect(await confirmInteractive('?')).toBe(false);
  });

  it('"  s  " com espaços ainda casa após trim', async () => {
    answer = '  s  ';
    expect(await confirmInteractive('?')).toBe(true);
  });

  it('stdin não-TTY → false sem ler', async () => {
    setStdinTTY(false);
    const spy = vi.spyOn(readlineMock, 'question');
    expect(await confirmInteractive('?')).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('stdout não-TTY → false sem ler', async () => {
    setStdoutTTY(false);
    const spy = vi.spyOn(readlineMock, 'question');
    expect(await confirmInteractive('?')).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
