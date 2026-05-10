import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JiraError } from '../../src/errors.js';
import { DEFAULT_PATTERNS, getPattern } from '../../src/jira/patterns.js';

const ENV_KEYS = ['JIRA_PATTERN_START', 'JIRA_PATTERN_DONE', 'JIRA_PATTERN_STOP'] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('DEFAULT_PATTERNS', () => {
  it('start casa "Start", "Progress", "Iniciar" (case-insensitive)', () => {
    expect(DEFAULT_PATTERNS.start.test('Start Progress')).toBe(true);
    expect(DEFAULT_PATTERNS.start.test('START')).toBe(true);
    expect(DEFAULT_PATTERNS.start.test('Iniciar')).toBe(true);
    expect(DEFAULT_PATTERNS.start.test('Em andamento')).toBe(true);
    expect(DEFAULT_PATTERNS.start.test('Done')).toBe(false);
  });

  it('done casa "Done", "Concluído", "Resolved" (case-insensitive)', () => {
    expect(DEFAULT_PATTERNS.done.test('Done')).toBe(true);
    expect(DEFAULT_PATTERNS.done.test('Concluído')).toBe(true);
    expect(DEFAULT_PATTERNS.done.test('CONCLUIDO')).toBe(true);
    expect(DEFAULT_PATTERNS.done.test('Resolved')).toBe(true);
    expect(DEFAULT_PATTERNS.done.test('Start')).toBe(false);
  });

  it('stop casa "To Do", "Backlog", "Reabrir" (case-insensitive)', () => {
    expect(DEFAULT_PATTERNS.stop.test('To Do')).toBe(true);
    expect(DEFAULT_PATTERNS.stop.test('BACKLOG')).toBe(true);
    expect(DEFAULT_PATTERNS.stop.test('Reabrir')).toBe(true);
    expect(DEFAULT_PATTERNS.stop.test('Done')).toBe(false);
  });

  it('cada kind tem regex distinto', () => {
    expect(DEFAULT_PATTERNS.start).not.toBe(DEFAULT_PATTERNS.done);
    expect(DEFAULT_PATTERNS.done).not.toBe(DEFAULT_PATTERNS.stop);
    expect(DEFAULT_PATTERNS.start).not.toBe(DEFAULT_PATTERNS.stop);
  });
});

describe('getPattern', () => {
  it('sem env retorna default', () => {
    expect(getPattern('start')).toBe(DEFAULT_PATTERNS.start);
    expect(getPattern('done')).toBe(DEFAULT_PATTERNS.done);
    expect(getPattern('stop')).toBe(DEFAULT_PATTERNS.stop);
  });

  it('env vazio também retorna default', () => {
    process.env.JIRA_PATTERN_START = '';
    expect(getPattern('start')).toBe(DEFAULT_PATTERNS.start);
  });

  it('JIRA_PATTERN_START="Custom" → /Custom/i', () => {
    process.env.JIRA_PATTERN_START = 'Custom';
    const re = getPattern('start');
    expect(re.test('custom workflow')).toBe(true);
    expect(re.test('Custom Step')).toBe(true);
    expect(re.test('Start')).toBe(false);
  });

  it.each([
    ['JIRA_PATTERN_START', 'start'],
    ['JIRA_PATTERN_DONE', 'done'],
    ['JIRA_PATTERN_STOP', 'stop'],
  ] as const)('%s aplicado em getPattern("%s")', (envVar, kind) => {
    process.env[envVar] = 'XYZ_TEST';
    const re = getPattern(kind);
    expect(re.test('xyz_test')).toBe(true);
  });

  it('regex inválida → JiraError exitCode 2', () => {
    process.env.JIRA_PATTERN_START = '[invalid';
    try {
      getPattern('start');
      expect.fail('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(JiraError);
      expect((err as JiraError).exitCode).toBe(2);
      expect((err as JiraError).message).toMatch(/JIRA_PATTERN_START inválido/);
    }
  });
});
