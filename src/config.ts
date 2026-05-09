import { JiraError } from './errors.js';

export interface Config {
  readonly token: string;
  readonly baseUrl: string;
  readonly insecure: boolean;
  readonly timeoutMs: number;
}

const DEFAULT_TIMEOUT_SECONDS = 30;

function isInsecureEnabled(raw: string | undefined): boolean {
  if (!raw) return false;
  return raw.toLowerCase() === 'true';
}

function parseTimeoutMs(raw: string | undefined): number {
  if (!raw) return DEFAULT_TIMEOUT_SECONDS * 1000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    throw new JiraError(`JIRA_TIMEOUT inválido: '${raw}'. Use inteiro positivo em segundos.`, 2);
  }
  return n * 1000;
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '');
  try {
    new URL(trimmed);
  } catch {
    throw new JiraError(`JIRA_BASE_URL inválida: '${raw}'`, 2);
  }
  return trimmed;
}

/**
 * Carrega config exigindo `JIRA_TOKEN` e `JIRA_BASE_URL` (RF-001/002).
 * Use em qualquer comando que chame a API Jira.
 */
export function loadConfigForApi(): Config {
  const token = process.env.JIRA_TOKEN;
  const baseRaw = process.env.JIRA_BASE_URL;

  if (!token) {
    throw new JiraError('Variável de ambiente JIRA_TOKEN é obrigatória', 2);
  }
  if (!baseRaw) {
    throw new JiraError('Variável de ambiente JIRA_BASE_URL é obrigatória', 2);
  }

  const cfg: Config = {
    token,
    baseUrl: normalizeBaseUrl(baseRaw),
    insecure: isInsecureEnabled(process.env.JIRA_INSECURE),
    timeoutMs: parseTimeoutMs(process.env.JIRA_TIMEOUT),
  };
  return Object.freeze(cfg);
}

/**
 * Carrega config sem exigir env vars (RF-021). Para `--help`/`--version`.
 * Retorna `null` se token/baseUrl ausentes; demais campos com defaults.
 */
export function loadConfigPermissive(): Config | null {
  const token = process.env.JIRA_TOKEN;
  const baseRaw = process.env.JIRA_BASE_URL;
  if (!token || !baseRaw) return null;
  try {
    return loadConfigForApi();
  } catch {
    return null;
  }
}
