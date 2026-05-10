import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
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

describe('jira mine', () => {
  it('imprime tabela com colunas Key/PRIORIDADE/STATUS/RESUMO', async () => {
    vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: [
        {
          key: 'ABC-1',
          summary: 'Bug login',
          status: 'Open',
          priority: 'High',
          assignee: 'Bosco',
          updated: '2026-01-01',
        },
      ],
      total: 1,
    });
    const code = await runRootSafe(['mine']);
    expect(code).toBe(0);
    const out = stdoutText();
    expect(out).toContain('KEY');
    expect(out).toContain('PRIORIDADE');
    expect(out).toContain('STATUS');
    expect(out).toContain('RESUMO');
    expect(out).toContain('ABC-1');
    expect(out).toContain('High');
    expect(out).toContain('Open');
    expect(out).toContain('Bug login');
  });

  it('mensagem específica quando sem issues', async () => {
    vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({ issues: [], total: 0 });
    const code = await runRootSafe(['mine']);
    expect(code).toBe(0);
    expect(stdoutText()).toContain('Nenhuma issue encontrada.');
  });

  it('quando total > 50 escreve indicador em stderr', async () => {
    vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: Array.from({ length: 50 }, (_, i) => ({
        key: `ABC-${i + 1}`,
        summary: 's',
        status: 'Open',
        priority: 'Low',
        assignee: null,
        updated: null,
      })),
      total: 142,
    });
    const code = await runRootSafe(['mine']);
    expect(code).toBe(0);
    expect(stderrText()).toContain('Mostrando 50 de 142 issues.');
  });

  it('--json emite array de objetos', async () => {
    vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: [
        {
          key: 'ABC-1',
          summary: 's',
          status: 'Open',
          priority: 'Low',
          assignee: 'A',
          updated: '2026-01-01',
        },
      ],
      total: 1,
    });
    const code = await runRootSafe(['--json', 'mine']);
    expect(code).toBe(0);
    const out = stdoutText().trim();
    const parsed = JSON.parse(out) as Array<{ key: string; priority: string | null }>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.key).toBe('ABC-1');
    expect(parsed[0]?.priority).toBe('Low');
  });

  it('chama searchIssues com JQL e fields esperados', async () => {
    const spy = vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: [],
      total: 0,
    });
    await runRootSafe(['mine']);
    expect(spy).toHaveBeenCalledTimes(1);
    const args = spy.mock.calls[0];
    expect(args?.[1]).toBe(
      'assignee = currentUser() AND resolution = Unresolved ORDER BY priority DESC, updated DESC',
    );
    expect(args?.[2]).toBe('summary,status,priority');
    expect(args?.[3]).toBe(50);
  });
});
