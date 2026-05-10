import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import * as issuesMod from '../../src/jira/issues.js';
import { setOutputMode } from '../../src/output.js';

let stdoutSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.JIRA_TOKEN = 'TKN';
  process.env.JIRA_BASE_URL = 'https://jira.example.com';
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  setOutputMode({ json: false, quiet: false, noColor: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function stdoutText(): string {
  return stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
}

describe('jira status', () => {
  it('JQL gerado contém aspas duplas em volta do status', async () => {
    const spy = vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: [],
      total: 0,
    });
    await runRootSafe(['status', 'In Progress']);
    const args = spy.mock.calls[0];
    expect(args?.[1]).toBe(
      'assignee = currentUser() AND status = "In Progress" ORDER BY updated DESC',
    );
  });

  it('status com aspas duplas internas é escapado', async () => {
    const spy = vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: [],
      total: 0,
    });
    await runRootSafe(['status', 'foo"bar']);
    const args = spy.mock.calls[0];
    expect(args?.[1]).toContain('status = "foo\\"bar"');
  });

  it('sem matches → mensagem específica', async () => {
    vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({ issues: [], total: 0 });
    const code = await runRootSafe(['status', 'Closed']);
    expect(code).toBe(0);
    expect(stdoutText()).toContain('Nenhuma issue com status "Closed" encontrada.');
  });

  it('com matches → tabela', async () => {
    vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: [
        {
          key: 'ABC-1',
          summary: 's',
          status: 'In Progress',
          priority: 'High',
          assignee: null,
          updated: null,
        },
      ],
      total: 1,
    });
    const code = await runRootSafe(['status', 'In Progress']);
    expect(code).toBe(0);
    const out = stdoutText();
    expect(out).toContain('KEY');
    expect(out).toContain('STATUS');
    expect(out).toContain('In Progress');
  });

  it('chama searchIssues com fields=summary,status,priority e maxResults=50', async () => {
    const spy = vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: [],
      total: 0,
    });
    await runRootSafe(['status', 'Open']);
    expect(spy.mock.calls[0]?.[2]).toBe('summary,status,priority');
    expect(spy.mock.calls[0]?.[3]).toBe(50);
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
    const code = await runRootSafe(['--json', 'status', 'Open']);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutText().trim()) as Array<{ key: string }>;
    expect(parsed).toHaveLength(1);
  });
});
