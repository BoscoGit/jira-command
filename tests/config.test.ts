import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfigForApi, loadConfigPermissive } from '../src/config.js';
import { JiraError } from '../src/errors.js';

const ENV_KEYS = ['JIRA_TOKEN', 'JIRA_BASE_URL', 'JIRA_INSECURE', 'JIRA_TIMEOUT'] as const;

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

describe('loadConfigForApi', () => {
  it('falha quando JIRA_TOKEN está ausente (RF-002)', () => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    expect(() => loadConfigForApi()).toThrowError(/JIRA_TOKEN é obrigatória/);
    try {
      loadConfigForApi();
    } catch (err) {
      expect(err).toBeInstanceOf(JiraError);
      expect((err as JiraError).exitCode).toBe(2);
    }
  });

  it('falha quando JIRA_BASE_URL está ausente (RF-002)', () => {
    process.env.JIRA_TOKEN = 'tok';
    expect(() => loadConfigForApi()).toThrowError(/JIRA_BASE_URL é obrigatória/);
    try {
      loadConfigForApi();
    } catch (err) {
      expect(err).toBeInstanceOf(JiraError);
      expect((err as JiraError).exitCode).toBe(2);
    }
  });

  it('normaliza JIRA_BASE_URL removendo barras finais (RF-004)', () => {
    process.env.JIRA_TOKEN = 'tok';
    process.env.JIRA_BASE_URL = 'https://jira.example.com///';
    const cfg = loadConfigForApi();
    expect(cfg.baseUrl).toBe('https://jira.example.com');
  });

  it('JIRA_INSECURE=true (lower) ativa', () => {
    process.env.JIRA_TOKEN = 'tok';
    process.env.JIRA_BASE_URL = 'https://x';
    process.env.JIRA_INSECURE = 'true';
    expect(loadConfigForApi().insecure).toBe(true);
  });

  it('JIRA_INSECURE=TRUE/True case-insensitive ativa', () => {
    process.env.JIRA_TOKEN = 'tok';
    process.env.JIRA_BASE_URL = 'https://x';
    process.env.JIRA_INSECURE = 'TRUE';
    expect(loadConfigForApi().insecure).toBe(true);
    process.env.JIRA_INSECURE = 'True';
    expect(loadConfigForApi().insecure).toBe(true);
  });

  it.each([
    '1',
    'yes',
    'on',
    'false',
    '',
    'TruE1',
    'sim',
  ])('JIRA_INSECURE=%s NÃO ativa (apenas literal "true")', (val) => {
    process.env.JIRA_TOKEN = 'tok';
    process.env.JIRA_BASE_URL = 'https://x';
    process.env.JIRA_INSECURE = val;
    expect(loadConfigForApi().insecure).toBe(false);
  });

  it('JIRA_INSECURE undefined → false', () => {
    process.env.JIRA_TOKEN = 'tok';
    process.env.JIRA_BASE_URL = 'https://x';
    expect(loadConfigForApi().insecure).toBe(false);
  });

  it('JIRA_TIMEOUT válido → ms', () => {
    process.env.JIRA_TOKEN = 'tok';
    process.env.JIRA_BASE_URL = 'https://x';
    process.env.JIRA_TIMEOUT = '15';
    expect(loadConfigForApi().timeoutMs).toBe(15000);
  });

  it('JIRA_TIMEOUT default 30s', () => {
    process.env.JIRA_TOKEN = 'tok';
    process.env.JIRA_BASE_URL = 'https://x';
    expect(loadConfigForApi().timeoutMs).toBe(30000);
  });

  it.each(['-5', '0', 'abc', '3.5'])('JIRA_TIMEOUT inválido (%s) → JiraError exitCode 2', (val) => {
    process.env.JIRA_TOKEN = 'tok';
    process.env.JIRA_BASE_URL = 'https://x';
    process.env.JIRA_TIMEOUT = val;
    try {
      loadConfigForApi();
      expect.fail('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(JiraError);
      expect((err as JiraError).exitCode).toBe(2);
    }
  });

  it('JIRA_BASE_URL inválida → JiraError exitCode 2', () => {
    process.env.JIRA_TOKEN = 'tok';
    process.env.JIRA_BASE_URL = 'nao-eh-url';
    try {
      loadConfigForApi();
      expect.fail('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(JiraError);
      expect((err as JiraError).exitCode).toBe(2);
    }
  });

  it('Config retornado é congelado', () => {
    process.env.JIRA_TOKEN = 'tok';
    process.env.JIRA_BASE_URL = 'https://x';
    const cfg = loadConfigForApi();
    expect(Object.isFrozen(cfg)).toBe(true);
  });
});

describe('loadConfigPermissive', () => {
  it('retorna null sem JIRA_TOKEN (RF-021)', () => {
    expect(loadConfigPermissive()).toBeNull();
  });

  it('retorna null sem JIRA_BASE_URL (RF-021)', () => {
    process.env.JIRA_TOKEN = 'tok';
    expect(loadConfigPermissive()).toBeNull();
  });

  it('retorna Config quando ambos definidos', () => {
    process.env.JIRA_TOKEN = 'tok';
    process.env.JIRA_BASE_URL = 'https://x';
    const cfg = loadConfigPermissive();
    expect(cfg).not.toBeNull();
    expect(cfg?.token).toBe('tok');
  });
});
