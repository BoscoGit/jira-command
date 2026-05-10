import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import { JiraError } from '../../src/errors.js';
import * as issuesMod from '../../src/jira/issues.js';
import { setOutputMode } from '../../src/output.js';

const ISSUE = {
  key: 'ABC-123',
  summary: 'Bug login',
  status: 'Open',
  priority: 'High',
  assignee: 'Bosco',
  reporter: 'Maria',
  description: 'Falha ao logar com SSO.',
  comments: [
    { id: '99', author: 'Joao', created: '2026-01-15T12:00:00.000Z', body: 'PR #1' },
    { id: '100', author: 'Joao', created: '2026-01-16T12:00:00.000Z', body: 'aguardando review' },
  ],
};

let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;
const realStdin = process.stdin;

function fakeStdin(text: string, isTTY: boolean): void {
  const stream = Readable.from([Buffer.from(text, 'utf8')]) as NodeJS.ReadStream;
  Object.defineProperty(stream, 'isTTY', { value: isTTY });
  Object.defineProperty(process, 'stdin', { value: stream, configurable: true });
}

beforeEach(() => {
  process.env.JIRA_TOKEN = 'TKN';
  process.env.JIRA_BASE_URL = 'https://jira.example.com';
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  setOutputMode({ json: false, quiet: false, noColor: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
});

function stdoutText(): string {
  return stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
}
function stderrText(): string {
  return stderrSpy.mock.calls.map((c) => String(c[0])).join('');
}

describe('jira get', () => {
  it('saída humana inclui cabeçalho, campos e seção Comments', async () => {
    vi.spyOn(issuesMod, 'getIssue').mockResolvedValueOnce(ISSUE);
    const code = await runRootSafe(['get', 'ABC-123']);
    expect(code).toBe(0);
    const out = stdoutText();
    expect(out).toContain('=== ABC-123 ===');
    expect(out).toContain('Summary  : Bug login');
    expect(out).toContain('Status   : Open');
    expect(out).toContain('Priority : High');
    expect(out).toContain('Assignee : Bosco');
    expect(out).toContain('Reporter : Maria');
    expect(out).toContain('--- Description ---');
    expect(out).toContain('Falha ao logar com SSO.');
    expect(out).toContain('--- Comments (2) ---');
    expect(out).toContain('[#99 | Joao - 2026-01-15]');
    expect(out).toContain('PR #1');
  });

  it('--json emite objeto único com comments aninhado', async () => {
    vi.spyOn(issuesMod, 'getIssue').mockResolvedValueOnce(ISSUE);
    const code = await runRootSafe(['--json', 'get', 'ABC-123']);
    expect(code).toBe(0);
    const out = stdoutText().trim();
    const parsed = JSON.parse(out) as { key: string; comments: unknown[] };
    expect(parsed.key).toBe('ABC-123');
    expect(parsed.comments).toHaveLength(2);
  });

  it('Key inválida → exitCode 2 ANTES de qualquer chamada', async () => {
    const spy = vi.spyOn(issuesMod, 'getIssue');
    const code = await runRootSafe(['get', '123-abc']);
    expect(code).toBe(2);
    expect(spy).not.toHaveBeenCalled();
    expect(stderrText()).toMatch(/Formato de Key inválido/);
  });

  it('404 traduzido para "Issue <KEY> não encontrada." e exitCode 4', async () => {
    vi.spyOn(issuesMod, 'getIssue').mockRejectedValueOnce(
      new JiraError('Recurso não encontrado: x', 4, {
        httpStatus: 404,
        statusText: 'Not Found',
      }),
    );
    const code = await runRootSafe(['get', 'ABC-1']);
    expect(code).toBe(4);
    expect(stderrText()).toContain('Issue ABC-1 não encontrada.');
  });

  it('issue sem comentários NÃO imprime seção Comments', async () => {
    vi.spyOn(issuesMod, 'getIssue').mockResolvedValueOnce({ ...ISSUE, comments: [] });
    const code = await runRootSafe(['get', 'ABC-1']);
    expect(code).toBe(0);
    expect(stdoutText()).not.toContain('--- Comments');
  });

  it('pipe via stdin com 1 Key', async () => {
    fakeStdin('ABC-123\n', false);
    const spy = vi.spyOn(issuesMod, 'getIssue').mockResolvedValueOnce(ISSUE);
    const code = await runRootSafe(['get']);
    expect(code).toBe(0);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toBe('ABC-123');
  });

  it('pipe via stdin processa múltiplas Keys sequencialmente', async () => {
    fakeStdin('ABC-1\nABC-2\n', false);
    const spy = vi
      .spyOn(issuesMod, 'getIssue')
      .mockResolvedValueOnce({ ...ISSUE, key: 'ABC-1' })
      .mockResolvedValueOnce({ ...ISSUE, key: 'ABC-2' });
    const code = await runRootSafe(['get']);
    expect(code).toBe(0);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0]?.[1]).toBe('ABC-1');
    expect(spy.mock.calls[1]?.[1]).toBe('ABC-2');
  });

  it('sem arg + stdin TTY vazio → exitCode 2', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    const code = await runRootSafe(['get']);
    expect(code).toBe(2);
  });
});
