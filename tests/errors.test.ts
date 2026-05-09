import { describe, expect, it } from 'vitest';
import { JiraError, mapHttpToError, parseJiraErrorBody } from '../src/errors.js';

describe('JiraError', () => {
  it('preserva exitCode e campos opcionais', () => {
    const err = new JiraError('msg', 4, { httpStatus: 404, statusText: 'Not Found' });
    expect(err.message).toBe('msg');
    expect(err.exitCode).toBe(4);
    expect(err.httpStatus).toBe(404);
    expect(err.statusText).toBe('Not Found');
  });
});

describe('mapHttpToError', () => {
  it('401 → exitCode 3 (auth)', () => {
    const err = mapHttpToError(401, 'Unauthorized', '');
    expect(err.exitCode).toBe(3);
    expect(err.message).toMatch(/Falha na autenticação/);
  });

  it('403 → exitCode 5 (perms)', () => {
    const err = mapHttpToError(403, 'Forbidden', '');
    expect(err.exitCode).toBe(5);
    expect(err.message).toMatch(/Sem permissão/);
  });

  it('404 → exitCode 4 (not found)', () => {
    const err = mapHttpToError(404, 'Not Found', '');
    expect(err.exitCode).toBe(4);
    expect(err.message).toMatch(/Recurso não encontrado/);
  });

  it('500 → exitCode 1 (genérico)', () => {
    const err = mapHttpToError(500, 'Internal Server Error', '');
    expect(err.exitCode).toBe(1);
  });
});

describe('parseJiraErrorBody', () => {
  const status = 400;
  const statusText = 'Bad Request';

  it('extrai errorMessages', () => {
    const body = JSON.stringify({ errorMessages: ['Issue não encontrada'], errors: {} });
    const out = parseJiraErrorBody(body, 'application/json', status, statusText);
    expect(out).toBe('Issue não encontrada');
  });

  it('junta multiplos errorMessages com ;', () => {
    const body = JSON.stringify({ errorMessages: ['A', 'B'], errors: {} });
    expect(parseJiraErrorBody(body, 'application/json', status, statusText)).toBe('A; B');
  });

  it('extrai field errors quando errorMessages vazio', () => {
    const body = JSON.stringify({ errorMessages: [], errors: { summary: 'obrig' } });
    expect(parseJiraErrorBody(body, 'application/json', status, statusText)).toBe('summary: obrig');
  });

  it('fallback genérico quando JSON sem campos esperados (RF-013)', () => {
    const body = JSON.stringify({ random: 'thing' });
    const out = parseJiraErrorBody(body, 'application/json', status, statusText);
    expect(out).toMatch(/HTTP 400 Bad Request/);
    expect(out).not.toContain('random');
  });

  it('fallback genérico quando body é HTML de proxy (não despeja conteúdo bruto)', () => {
    const html = '<html><body><h1>502 Bad Gateway</h1></body></html>';
    const out = parseJiraErrorBody(html, 'text/html', 502, 'Bad Gateway');
    expect(out).toMatch(/HTTP 502 Bad Gateway/);
    expect(out).not.toContain('<html>');
    expect(out).not.toContain('<h1>');
  });

  it('fallback genérico quando body vazio', () => {
    expect(parseJiraErrorBody('', 'application/json', 504, 'Gateway Timeout')).toMatch(
      /HTTP 504 Gateway Timeout/,
    );
  });

  it('fallback genérico quando JSON inválido', () => {
    expect(parseJiraErrorBody('{lixo', 'application/json', 500, 'X')).toMatch(/HTTP 500 X/);
  });
});
