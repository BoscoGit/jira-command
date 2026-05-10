import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import { JiraError } from '../../src/errors.js';
import * as createMod from '../../src/jira/create.js';
import { setOutputMode } from '../../src/output.js';

let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;

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
});

function stderrText(): string {
  return stderrSpy.mock.calls.map((c) => String(c[0])).join('');
}
function stdoutText(): string {
  return stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
}

describe('jira sub', () => {
  it('--parent --summary herda projeto via getParentProjectKey + cria com Sub-task default', async () => {
    const getProj = vi.spyOn(createMod, 'getParentProjectKey').mockResolvedValueOnce('ABC');
    const create = vi
      .spyOn(createMod, 'createIssue')
      .mockResolvedValueOnce({ key: 'ABC-501', url: 'https://jira.example.com/browse/ABC-501' });
    const code = await runRootSafe(['sub', '--parent', 'ABC-1', '--summary', 'X']);
    expect(code).toBe(0);
    expect(getProj).toHaveBeenCalledWith(expect.anything(), 'ABC-1');
    expect(create).toHaveBeenCalledWith(expect.anything(), {
      project: { key: 'ABC' },
      summary: 'X',
      issuetype: { name: 'Sub-task' },
      parent: { key: 'ABC-1' },
    });
    expect(stderrText()).toContain('Subtask criada: ABC-501 (parent ABC-1)');
    expect(stdoutText().trim()).toBe('ABC-501');
  });

  it('--type Subtarefa (PT-BR)', async () => {
    vi.spyOn(createMod, 'getParentProjectKey').mockResolvedValueOnce('ABC');
    const create = vi
      .spyOn(createMod, 'createIssue')
      .mockResolvedValueOnce({ key: 'ABC-1', url: 'u' });
    await runRootSafe(['sub', '--parent', 'ABC-1', '--summary', 'X', '--type', 'Subtarefa']);
    const fields = create.mock.calls[0]?.[1] as Record<string, unknown>;
    expect((fields.issuetype as { name: string }).name).toBe('Subtarefa');
  });

  it('--desc + --assignee propagam', async () => {
    vi.spyOn(createMod, 'getParentProjectKey').mockResolvedValueOnce('ABC');
    const create = vi
      .spyOn(createMod, 'createIssue')
      .mockResolvedValueOnce({ key: 'ABC-1', url: 'u' });
    await runRootSafe([
      'sub',
      '--parent',
      'ABC-1',
      '--summary',
      'X',
      '--desc',
      'd',
      '--assignee',
      'joao',
    ]);
    const fields = create.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(fields.description).toBe('d');
    expect(fields.assignee).toEqual({ name: 'joao' });
  });

  it('--quiet emite só Key', async () => {
    vi.spyOn(createMod, 'getParentProjectKey').mockResolvedValueOnce('ABC');
    vi.spyOn(createMod, 'createIssue').mockResolvedValueOnce({ key: 'ABC-2', url: 'u' });
    const code = await runRootSafe(['sub', '--parent', 'ABC-1', '--summary', 'X', '--quiet']);
    expect(code).toBe(0);
    expect(stdoutText().trim()).toBe('ABC-2');
    expect(stderrText()).toBe('');
  });

  it('--json envelope com parent', async () => {
    vi.spyOn(createMod, 'getParentProjectKey').mockResolvedValueOnce('ABC');
    vi.spyOn(createMod, 'createIssue').mockResolvedValueOnce({ key: 'ABC-3', url: 'u' });
    const code = await runRootSafe(['--json', 'sub', '--parent', 'ABC-1', '--summary', 'X']);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutText().trim()) as Record<string, unknown>;
    expect(parsed).toEqual({
      ok: true,
      key: 'ABC-3',
      action: 'sub',
      url: 'u',
      parent: 'ABC-1',
    });
  });

  it('parent inválido → exit 2 sem chamadas', async () => {
    const getProj = vi.spyOn(createMod, 'getParentProjectKey');
    const code = await runRootSafe(['sub', '--parent', 'lixo', '--summary', 'X']);
    expect(code).toBe(2);
    expect(getProj).not.toHaveBeenCalled();
  });

  it('parent inexistente (404) → exit 4', async () => {
    vi.spyOn(createMod, 'getParentProjectKey').mockRejectedValueOnce(
      new JiraError('Recurso não encontrado: x', 4, { httpStatus: 404 }),
    );
    const code = await runRootSafe(['sub', '--parent', 'ABC-1', '--summary', 'X']);
    expect(code).toBe(4);
  });
});
