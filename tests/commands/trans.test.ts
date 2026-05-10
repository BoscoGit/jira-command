import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import * as transMod from '../../src/jira/transitions.js';
import { setOutputMode } from '../../src/output.js';

let stdoutSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.JIRA_TOKEN = 'TKN';
  process.env.JIRA_BASE_URL = 'https://jira.example.com';
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  setOutputMode({ json: false, quiet: false, noColor: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function stdoutText(): string {
  return stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
}

describe('jira trans', () => {
  it('imprime tabela com colunas ID/NOME/PARA', async () => {
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce([
      { id: '21', name: 'Start Progress', to: 'In Progress' },
      { id: '31', name: 'Done', to: 'Done' },
    ]);
    const code = await runRootSafe(['trans', 'ABC-1']);
    expect(code).toBe(0);
    const out = stdoutText();
    expect(out).toContain('ID');
    expect(out).toContain('NOME');
    expect(out).toContain('PARA');
    expect(out).toContain('21');
    expect(out).toContain('Start Progress');
    expect(out).toContain('In Progress');
  });

  it('sem transições: mensagem específica', async () => {
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce([]);
    const code = await runRootSafe(['trans', 'ABC-1']);
    expect(code).toBe(0);
    expect(stdoutText()).toContain('Nenhuma transição disponível para ABC-1 no estado atual.');
  });

  it('--json emite array sem envelope', async () => {
    const transitions = [{ id: '21', name: 'Start', to: 'In Progress' }];
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce(transitions);
    const code = await runRootSafe(['--json', 'trans', 'ABC-1']);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutText().trim()) as unknown;
    expect(parsed).toEqual(transitions);
  });

  it('Key inválida → exit 2 sem chamar API', async () => {
    const spy = vi.spyOn(transMod, 'listTransitions');
    const code = await runRootSafe(['trans', 'lixo']);
    expect(code).toBe(2);
    expect(spy).not.toHaveBeenCalled();
  });
});
