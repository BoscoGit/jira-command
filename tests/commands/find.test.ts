import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import { JiraError } from '../../src/errors.js';
import * as issuesMod from '../../src/jira/issues.js';
import { setOutputMode } from '../../src/output.js';

let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.JIRA_TOKEN = 'TKN';
  process.env.JIRA_BASE_URL = 'https://jira.example.com';
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  setOutputMode({ json: false, quiet: false, noColor: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function stdoutText(): string {
  return stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
}
function stderrText(): string {
  return stderrSpy.mock.calls.map((c) => String(c[0])).join('');
}

describe('jira find', () => {
  it('imprime tabela com 5 colunas (Key/PRIORIDADE/STATUS/RESPONSÁVEL/RESUMO)', async () => {
    vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: [
        {
          key: 'ABC-1',
          summary: 's',
          status: 'Open',
          priority: 'High',
          assignee: 'Bosco',
          updated: '2026-01-01',
        },
      ],
      total: 1,
    });
    const code = await runRootSafe(['find', 'project = ABC']);
    expect(code).toBe(0);
    const out = stdoutText();
    expect(out).toContain('KEY');
    expect(out).toContain('PRIORIDADE');
    expect(out).toContain('STATUS');
    expect(out).toContain('RESPONSÁVEL');
    expect(out).toContain('RESUMO');
    expect(out).toContain('Bosco');
  });

  it('--limit 10 propaga maxResults=10', async () => {
    const spy = vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: [],
      total: 0,
    });
    await runRootSafe(['find', 'project = X', '--limit', '10']);
    const args = spy.mock.calls[0];
    expect(args?.[3]).toBe(10);
  });

  it('--limit default 50', async () => {
    const spy = vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: [],
      total: 0,
    });
    await runRootSafe(['find', 'project = X']);
    expect(spy.mock.calls[0]?.[3]).toBe(50);
  });

  it('--limit fora do range → exitCode 2', async () => {
    const spy = vi.spyOn(issuesMod, 'searchIssues');
    const code = await runRootSafe(['find', 'project = X', '--limit', '500']);
    expect(code).toBe(2);
    expect(spy).not.toHaveBeenCalled();
    expect(stderrText()).toMatch(/--limit inválido/);
  });

  it('JQL inválido propaga erro do Jira (RF-013 da 001)', async () => {
    vi.spyOn(issuesMod, 'searchIssues').mockRejectedValueOnce(
      new JiraError("Field 'lixo' does not exist", 1, { httpStatus: 400 }),
    );
    const code = await runRootSafe(['find', 'lixo = 1']);
    expect(code).toBe(1);
    expect(stderrText()).toContain("Field 'lixo' does not exist");
  });

  it('sem resultados → mensagem específica', async () => {
    vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({ issues: [], total: 0 });
    const code = await runRootSafe(['find', 'project = X']);
    expect(code).toBe(0);
    expect(stdoutText()).toContain('Nenhuma issue encontrada para o JQL informado.');
  });

  it('--json emite array', async () => {
    vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: [
        {
          key: 'ABC-1',
          summary: 's',
          status: 'Open',
          priority: null,
          assignee: null,
          updated: null,
        },
      ],
      total: 1,
    });
    const code = await runRootSafe(['--json', 'find', 'project = X']);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutText().trim()) as Array<{ key: string }>;
    expect(parsed).toHaveLength(1);
  });

  it('chama searchIssues com fields=summary,status,priority,assignee', async () => {
    const spy = vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: [],
      total: 0,
    });
    await runRootSafe(['find', 'project = X']);
    expect(spy.mock.calls[0]?.[2]).toBe('summary,status,priority,assignee');
  });
});
