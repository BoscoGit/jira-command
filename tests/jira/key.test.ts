import { describe, expect, it } from 'vitest';
import { JiraError } from '../../src/errors.js';
import { KEY_REGEX, validateKey } from '../../src/jira/key.js';

describe('KEY_REGEX', () => {
  it.each(['ABC-1', 'MTET-9999', 'A1_B-42', 'AAA-0', 'X1-1'])('aceita Key válida %s', (k) => {
    expect(KEY_REGEX.test(k)).toBe(true);
  });

  it.each([
    '123',
    'ABC',
    'abc-1',
    'ABC-',
    'ABC-x',
    '-1',
    'A-',
    '',
    '1-1',
    'a1_b-42',
  ])('rejeita Key inválida %s', (k) => {
    expect(KEY_REGEX.test(k)).toBe(false);
  });
});

describe('validateKey', () => {
  it('retorna a Key quando válida', () => {
    expect(validateKey('ABC-123')).toBe('ABC-123');
  });

  it.each([
    '123',
    'ABC',
    'abc-1',
    'ABC-',
    'ABC-x',
    '',
  ])('lança JiraError exitCode 2 para %s', (k) => {
    try {
      validateKey(k);
      expect.fail('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(JiraError);
      expect((err as JiraError).exitCode).toBe(2);
      expect((err as JiraError).message).toMatch(/Formato de Key inválido/);
    }
  });
});
