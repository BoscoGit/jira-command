import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import { JiraError } from '../../src/errors.js';
import * as issuesMod from '../../src/jira/issues.js';
import { setOutputMode } from '../../src/output.js';
import * as fzfMod from '../../src/platform/fzf.js';

let stdoutSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.JIRA_TOKEN = 'TKN';
  process.env.JIRA_BASE_URL = 'https://jira.example.com';
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  setOutputMode({ json: false, quiet: false, noColor: true });
  process.exitCode = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

function stdoutText(): string {
  return stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
}

const ISSUES = [
  {
    key: 'ABC-1',
    summary: 'Bug A',
    status: 'Open',
    priority: 'High',
    assignee: null,
    updated: null,
  },
  {
    key: 'ABC-2',
    summary: 'Bug B',
    status: 'In Progress',
    priority: 'Low',
    assignee: null,
    updated: null,
  },
];

describe('jira pick', () => {
  it('usa JQL default (mesma do mine)', async () => {
    const spy = vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: [],
      total: 0,
    });
    vi.spyOn(fzfMod, 'pickWithFzf').mockResolvedValueOnce(null);
    await runRootSafe(['pick']);
    expect(spy.mock.calls[0]?.[1]).toBe(
      'assignee = currentUser() AND resolution = Unresolved ORDER BY priority DESC, updated DESC',
    );
  });

  it('--jql propaga JQL custom', async () => {
    const spy = vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: [],
      total: 0,
    });
    vi.spyOn(fzfMod, 'pickWithFzf').mockResolvedValueOnce(null);
    await runRootSafe(['pick', '--jql', 'project = ABC AND status = Open']);
    expect(spy.mock.calls[0]?.[1]).toBe('project = ABC AND status = Open');
  });

  it('seleção válida → stdout = <KEY> + exit 0', async () => {
    vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: ISSUES,
      total: 2,
    });
    vi.spyOn(fzfMod, 'pickWithFzf').mockResolvedValueOnce('ABC-1          [Open]            Bug A');
    const code = await runRootSafe(['pick']);
    expect(code).toBe(0);
    expect(stdoutText().trim()).toBe('ABC-1');
  });

  it('ESC (pickWithFzf retorna null) → exit 1, stdout vazio', async () => {
    vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: ISSUES,
      total: 2,
    });
    vi.spyOn(fzfMod, 'pickWithFzf').mockResolvedValueOnce(null);
    const code = await runRootSafe(['pick']);
    expect(code).toBe(1);
    expect(stdoutText()).toBe('');
  });

  it('sem fzf → JiraError exitCode 1 com mensagem instrutiva', async () => {
    vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: ISSUES,
      total: 2,
    });
    vi.spyOn(fzfMod, 'pickWithFzf').mockRejectedValueOnce(
      new JiraError('fzf não encontrado. Instale em: https://github.com/junegunn/fzf', 1),
    );
    const code = await runRootSafe(['pick']);
    expect(code).toBe(1);
  });

  it('sem issues → exit 1 sem chamar fzf', async () => {
    vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({ issues: [], total: 0 });
    const fzfSpy = vi.spyOn(fzfMod, 'pickWithFzf');
    const code = await runRootSafe(['pick']);
    expect(code).toBe(1);
    expect(fzfSpy).not.toHaveBeenCalled();
  });

  it('chama searchIssues com fields=summary,status,priority e maxResults=200', async () => {
    const spy = vi.spyOn(issuesMod, 'searchIssues').mockResolvedValueOnce({
      issues: [],
      total: 0,
    });
    vi.spyOn(fzfMod, 'pickWithFzf').mockResolvedValueOnce(null);
    await runRootSafe(['pick']);
    expect(spy.mock.calls[0]?.[2]).toBe('summary,status,priority');
    expect(spy.mock.calls[0]?.[3]).toBe(200);
  });
});
