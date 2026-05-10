import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import * as projectsMod from '../../src/jira/projects.js';
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

describe('jira projects', () => {
  it('sem --all: tabela KEY/ID/NOME/ISSUES + chama listMyProjects', async () => {
    const spy = vi.spyOn(projectsMod, 'listMyProjects').mockResolvedValueOnce({
      projects: [{ key: 'ABC', id: '1', name: 'Alpha', issues: 5 }],
      truncated: false,
    });
    const code = await runRootSafe(['projects']);
    expect(code).toBe(0);
    expect(spy).toHaveBeenCalledTimes(1);
    const out = stdoutText();
    expect(out).toContain('KEY');
    expect(out).toContain('ISSUES');
    expect(out).toContain('ABC');
    expect(out).toContain('5');
  });

  it('--all: tabela KEY/ID/NOME (sem ISSUES) + chama listAllProjects', async () => {
    const spy = vi
      .spyOn(projectsMod, 'listAllProjects')
      .mockResolvedValueOnce([{ key: 'ABC', id: '1', name: 'A' }]);
    const code = await runRootSafe(['projects', '--all']);
    expect(code).toBe(0);
    expect(spy).toHaveBeenCalledTimes(1);
    const out = stdoutText();
    expect(out).toContain('KEY');
    expect(out).not.toContain('ISSUES');
  });

  it('vazio → "Nenhum projeto encontrado."', async () => {
    vi.spyOn(projectsMod, 'listMyProjects').mockResolvedValueOnce({
      projects: [],
      truncated: false,
    });
    const code = await runRootSafe(['projects']);
    expect(code).toBe(0);
    expect(stdoutText()).toContain('Nenhum projeto encontrado.');
  });

  it('truncated:true → aviso em stderr', async () => {
    vi.spyOn(projectsMod, 'listMyProjects').mockResolvedValueOnce({
      projects: [{ key: 'A', id: '1', name: 'A', issues: 1 }],
      truncated: true,
    });
    const code = await runRootSafe(['projects']);
    expect(code).toBe(0);
    expect(stderrText()).toContain('500 issues');
    expect(stderrText()).toContain('Use --all');
  });

  it('--json array', async () => {
    const data = [{ key: 'A', id: '1', name: 'A', issues: 5 }];
    vi.spyOn(projectsMod, 'listMyProjects').mockResolvedValueOnce({
      projects: data,
      truncated: false,
    });
    const code = await runRootSafe(['--json', 'projects']);
    expect(code).toBe(0);
    expect(JSON.parse(stdoutText().trim())).toEqual(data);
  });
});
