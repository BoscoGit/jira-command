import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import { JiraError } from '../../src/errors.js';
import * as linksMod from '../../src/jira/links.js';
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

describe('jira link', () => {
  it('chama createLink + log', async () => {
    const create = vi.spyOn(linksMod, 'createLink').mockResolvedValueOnce(undefined);
    const code = await runRootSafe([
      'link',
      '--from',
      'ABC-1',
      '--type',
      'Blocks',
      '--to',
      'ABC-2',
    ]);
    expect(code).toBe(0);
    expect(create).toHaveBeenCalledWith(expect.anything(), 'ABC-1', 'Blocks', 'ABC-2');
    expect(stderrText()).toContain('Link criado: ABC-1 -[Blocks]-> ABC-2.');
  });

  it('--json envelope', async () => {
    vi.spyOn(linksMod, 'createLink').mockResolvedValueOnce(undefined);
    const code = await runRootSafe([
      '--json',
      'link',
      '--from',
      'ABC-1',
      '--type',
      'Relates',
      '--to',
      'ABC-3',
    ]);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutText().trim()) as Record<string, unknown>;
    expect(parsed).toEqual({
      ok: true,
      action: 'link',
      from: 'ABC-1',
      to: 'ABC-3',
      type: 'Relates',
    });
  });

  it('Key from inválida → exit 2 sem chamada', async () => {
    const create = vi.spyOn(linksMod, 'createLink');
    const code = await runRootSafe(['link', '--from', 'lixo', '--type', 'Blocks', '--to', 'ABC-2']);
    expect(code).toBe(2);
    expect(create).not.toHaveBeenCalled();
  });

  it('tipo inválido (400) → mensagem servidor + exit 1', async () => {
    vi.spyOn(linksMod, 'createLink').mockRejectedValueOnce(
      new JiraError("Link type 'Lixo' not found", 1, { httpStatus: 400 }),
    );
    const code = await runRootSafe(['link', '--from', 'ABC-1', '--type', 'Lixo', '--to', 'ABC-2']);
    expect(code).toBe(1);
    expect(stderrText()).toContain("Link type 'Lixo' not found");
  });
});
