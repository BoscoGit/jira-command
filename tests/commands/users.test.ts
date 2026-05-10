import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import * as usersMod from '../../src/jira/users.js';
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

describe('jira users', () => {
  it('com --filter passa filter para listAssignableUsers', async () => {
    const spy = vi
      .spyOn(usersMod, 'listAssignableUsers')
      .mockResolvedValueOnce([{ username: 'joao', name: 'João', email: 'j@x', active: true }]);
    const code = await runRootSafe(['users', 'MTET', '--filter', 'silva']);
    expect(code).toBe(0);
    expect(spy).toHaveBeenCalledWith(expect.anything(), 'MTET', 'silva');
  });

  it('sem --filter passa undefined', async () => {
    const spy = vi
      .spyOn(usersMod, 'listAssignableUsers')
      .mockResolvedValueOnce([{ username: 'joao', name: 'João', email: 'j@x', active: true }]);
    await runRootSafe(['users', 'MTET']);
    expect(spy).toHaveBeenCalledWith(expect.anything(), 'MTET', undefined);
  });

  it('tabela USERNAME/NOME/EMAIL/ATIVO + rodapé contagem', async () => {
    vi.spyOn(usersMod, 'listAssignableUsers').mockResolvedValueOnce([
      { username: 'joao', name: 'João', email: 'j@x', active: true },
      { username: 'maria', name: 'Maria', email: 'm@x', active: false },
    ]);
    const code = await runRootSafe(['users', 'MTET']);
    expect(code).toBe(0);
    const out = stdoutText();
    expect(out).toContain('USERNAME');
    expect(out).toContain('NOME');
    expect(out).toContain('EMAIL');
    expect(out).toContain('ATIVO');
    expect(out).toContain('joao');
    expect(out).toContain('maria');
    expect(out).toContain('false');
    expect(stderrText()).toContain('2 usuários encontrados.');
  });

  it('vazio → "Nenhum usuário encontrado em <PROJETO>."', async () => {
    vi.spyOn(usersMod, 'listAssignableUsers').mockResolvedValueOnce([]);
    const code = await runRootSafe(['users', 'MTET']);
    expect(code).toBe(0);
    expect(stdoutText()).toContain('Nenhum usuário encontrado em MTET.');
  });

  it('--json array', async () => {
    const data = [{ username: 'a', name: 'A', email: 'a@x', active: true }];
    vi.spyOn(usersMod, 'listAssignableUsers').mockResolvedValueOnce(data);
    const code = await runRootSafe(['--json', 'users', 'MTET']);
    expect(code).toBe(0);
    expect(JSON.parse(stdoutText().trim())).toEqual(data);
  });
});
