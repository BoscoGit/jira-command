export type ExitCode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 130;

export interface JiraErrorOptions {
  action?: string;
  httpStatus?: number;
  statusText?: string;
  cause?: unknown;
}

export class JiraError extends Error {
  readonly exitCode: ExitCode;
  readonly action?: string;
  readonly httpStatus?: number;
  readonly statusText?: string;
  override readonly cause?: unknown;

  constructor(message: string, exitCode: ExitCode, opts: JiraErrorOptions = {}) {
    super(message);
    this.name = 'JiraError';
    this.exitCode = exitCode;
    if (opts.action !== undefined) this.action = opts.action;
    if (opts.httpStatus !== undefined) this.httpStatus = opts.httpStatus;
    if (opts.statusText !== undefined) this.statusText = opts.statusText;
    if (opts.cause !== undefined) this.cause = opts.cause;
  }
}

/**
 * Parse do corpo de erro retornado pela API Jira (RF-013).
 *
 * Estratégia:
 *  1. JSON com `errorMessages` (array) → concatenado.
 *  2. JSON com `errors` (objeto) → "<campo>: <mensagem>" separados.
 *  3. Body não-JSON / vazio / schema desconhecido → `HTTP <status> <statusText>`
 *     com sugestão acionável. Body bruto NUNCA é exposto.
 */
export function parseJiraErrorBody(
  body: string,
  contentType: string | null,
  status: number,
  statusText: string,
): string {
  const fallback = `HTTP ${status} ${statusText} — verifique conectividade ou status do servidor Jira`;

  if (!body || body.trim().length === 0) return fallback;

  const isJson = (contentType ?? '').toLowerCase().includes('application/json');
  if (!isJson) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return fallback;
  }

  if (!parsed || typeof parsed !== 'object') return fallback;
  const obj = parsed as Record<string, unknown>;

  const messages = obj.errorMessages;
  if (Array.isArray(messages) && messages.length > 0) {
    return messages.filter((m): m is string => typeof m === 'string').join('; ');
  }

  const errors = obj.errors;
  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    const entries = Object.entries(errors as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'string')
      .map(([k, v]) => `${k}: ${v as string}`);
    if (entries.length > 0) return entries.join('; ');
  }

  return fallback;
}

/**
 * Mapeia uma resposta HTTP do Jira em `JiraError` com exit code apropriado (RF-008).
 */
export function mapHttpToError(status: number, statusText: string, body: string): JiraError {
  const contentType = null;
  const parsed = parseJiraErrorBody(body, contentType, status, statusText);

  if (status === 401) {
    return new JiraError('Falha na autenticação — verifique seu JIRA_TOKEN', 3, {
      httpStatus: status,
      statusText,
    });
  }
  if (status === 403) {
    return new JiraError(`Sem permissão: ${parsed}`, 5, { httpStatus: status, statusText });
  }
  if (status === 404) {
    return new JiraError(`Recurso não encontrado: ${parsed}`, 4, {
      httpStatus: status,
      statusText,
    });
  }
  return new JiraError(parsed, 1, { httpStatus: status, statusText });
}
