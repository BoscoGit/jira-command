import { Agent, setGlobalDispatcher } from 'undici';
import type { Config } from './config.js';
import { JiraError, mapHttpToError, parseJiraErrorBody } from './errors.js';
import { VERSION } from './version.js';

let insecureApplied = false;

const TLS_ERROR_CODES = new Set([
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'CERT_HAS_EXPIRED',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'CERT_UNTRUSTED',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

function applyInsecureOnce(insecure: boolean): void {
  if (!insecure || insecureApplied) return;
  setGlobalDispatcher(
    new Agent({
      connect: { rejectUnauthorized: false },
    }),
  );
  insecureApplied = true;
}

/** Reset do estado interno — somente para testes. */
export function resetHttpStateForTests(): void {
  insecureApplied = false;
}

function buildHeaders(config: Config, hasBody: boolean): Headers {
  const h = new Headers({
    Authorization: `Bearer ${config.token}`,
    'User-Agent': `jira-cli/${VERSION} (Node/${process.version})`,
    Accept: 'application/json',
  });
  if (hasBody) h.set('Content-Type', 'application/json');
  return h;
}

interface CauseShape {
  code?: string;
  message?: string;
}

function extractTlsCode(cause: unknown): string | undefined {
  if (!cause || typeof cause !== 'object') return undefined;
  const c = cause as CauseShape;
  if (typeof c.code === 'string') return c.code;
  if (typeof (cause as { cause?: unknown }).cause === 'object') {
    return extractTlsCode((cause as { cause: unknown }).cause);
  }
  return undefined;
}

/**
 * Wrapper de `fetch` para a API Jira (RF-007/017/022/023, RF-014).
 *
 *  - injeta headers Authorization, User-Agent, Accept e Content-Type quando há body
 *  - aplica timeout via AbortController (config.timeoutMs)
 *  - aplica SSL bypass via undici Agent quando config.insecure
 *  - traduz erros TLS em mensagem amigável (RF-014) somente quando insecure=false
 *  - mapeia respostas 4xx/5xx em JiraError com exit codes corretos
 *  - NÃO retenta requisições (RF-022)
 */
export async function jiraFetch(
  config: Config,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  applyInsecureOnce(config.insecure);

  const url = `${config.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  const hasBody = init.body !== undefined && init.body !== null;
  const headers = buildHeaders(config, hasBody);
  if (init.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers, signal: ctrl.signal });
  } catch (err) {
    const code = extractTlsCode(err);
    if (code && TLS_ERROR_CODES.has(code) && !config.insecure) {
      throw new JiraError(
        'Falha na verificação SSL — defina JIRA_INSECURE=true para certificados auto-assinados',
        1,
        { cause: err },
      );
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new JiraError(
        `Falha de rede: timeout após ${config.timeoutMs / 1000}s. Verifique JIRA_BASE_URL e conectividade.`,
        6,
        { cause: err },
      );
    }
    const msg = err instanceof Error ? err.message : 'erro desconhecido';
    throw new JiraError(`Falha de rede: ${msg}. Verifique JIRA_BASE_URL e conectividade.`, 6, {
      cause: err,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text();
    // mapHttpToError não consome contentType; usamos parseJiraErrorBody
    // diretamente para preservar Content-Type real
    const contentType = response.headers.get('content-type');
    const parsed = parseJiraErrorBody(body, contentType, response.status, response.statusText);
    if (response.status === 401) {
      throw new JiraError('Falha na autenticação — verifique seu JIRA_TOKEN', 3, {
        httpStatus: response.status,
        statusText: response.statusText,
      });
    }
    if (response.status === 403) {
      throw new JiraError(`Sem permissão: ${parsed}`, 5, {
        httpStatus: response.status,
        statusText: response.statusText,
      });
    }
    if (response.status === 404) {
      throw new JiraError(`Recurso não encontrado: ${parsed}`, 4, {
        httpStatus: response.status,
        statusText: response.statusText,
      });
    }
    throw mapHttpToError(response.status, response.statusText, body);
  }

  return response;
}
